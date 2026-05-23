import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  isoDocument,
  isoCategory,
  isoLevel1,
  isoLevel2,
  isoEvidence,
} from "@/db/schema";
import type { DocumentTree } from "./tree-types";

export async function buildDocumentTree(
  documentId: number,
  auditorMode: boolean,
  tenantId: number,
  omitExcludedBranches = false,
): Promise<DocumentTree | null> {
  /** Hide nodes outside the scope chain (risk / compliance main screens). */
  const strict = auditorMode || omitExcludedBranches;
  const db = getDb();

  const [doc] = await db
    .select()
    .from(isoDocument)
    .where(
      and(eq(isoDocument.id, documentId), eq(isoDocument.tenantId, tenantId)),
    )
    .limit(1);

  if (!doc) return null;
  if (auditorMode && !doc.include) return null;

  const docEffective = doc.include;

  const categories = await db
    .select()
    .from(isoCategory)
    .where(eq(isoCategory.documentId, documentId));

  const catIds = categories.map((c) => c.id);
  if (catIds.length === 0) {
    return {
      id: doc.id,
      name: doc.name,
      desc: doc.desc,
      include: doc.include,
      effective: docEffective,
      categories: [],
    };
  }

  const level1Rows = await db
    .select()
    .from(isoLevel1)
    .where(inArray(isoLevel1.categoryId, catIds));

  const l1Ids = level1Rows.map((r) => r.id);
  const level2Rows =
    l1Ids.length === 0
      ? []
      : await db
          .select()
          .from(isoLevel2)
          .where(inArray(isoLevel2.level_1_ID, l1Ids));

  const l2Ids = level2Rows.map((r) => r.id);
  const evidenceRows =
    l2Ids.length === 0
      ? []
      : await db
          .select()
          .from(isoEvidence)
          .where(inArray(isoEvidence.level_2_ID, l2Ids));

  const l2ByL1 = new Map<number, typeof level2Rows>();
  for (const l2 of level2Rows) {
    const list = l2ByL1.get(l2.level_1_ID) ?? [];
    list.push(l2);
    l2ByL1.set(l2.level_1_ID, list);
  }

  const evByL2 = new Map<number, typeof evidenceRows>();
  for (const e of evidenceRows) {
    const list = evByL2.get(e.level_2_ID) ?? [];
    list.push(e);
    evByL2.set(e.level_2_ID, list);
  }

  const l1ByCat = new Map<number, typeof level1Rows>();
  for (const l1 of level1Rows) {
    const list = l1ByCat.get(l1.categoryId) ?? [];
    list.push(l1);
    l1ByCat.set(l1.categoryId, list);
  }

  const mapEvidence = (
    l2Id: number,
    l2Eff: boolean,
  ): import("./tree-types").EvidenceNode[] => {
    const rows = evByL2.get(l2Id) ?? [];
    return rows
      .map((e) => {
        const effective = l2Eff && e.include;
        return {
          id: e.id,
          name: e.name,
          desc: e.desc,
          url: e.url,
          include: e.include,
          effective,
        };
      })
      .filter((n) => !strict || n.effective);
  };

  const outCategories = categories
    .map((cat) => {
      const catEffective = docEffective && cat.include;
      const l1s = (l1ByCat.get(cat.id) ?? []).map((l1) => {
        const l1Eff = catEffective && l1.include;
        const level2 = (l2ByL1.get(l1.id) ?? [])
          .map((l2) => {
            const effective = l1Eff && l2.include;
            const evidence = mapEvidence(l2.id, effective);
            return {
              id: l2.id,
              name: l2.name,
              desc: l2.desc,
              include: l2.include,
              effective,
              evidence,
            };
          })
          .filter((n) => !strict || n.effective);
        return {
          id: l1.id,
          name: l1.name,
          desc: l1.desc,
          include: l1.include,
          effective: l1Eff,
          risk_description: l1.risk_description,
          inherent_likelihood: l1.inherent_likelihood,
          residual_likelihood: l1.residual_likelihood,
          inherent_impact: l1.inherent_impact,
          residual_impact: l1.residual_impact,
          level2,
        };
      });
      const level1 = l1s.filter(
        (n) => !strict || (n.effective && n.level2.length > 0),
      );
      return {
        id: cat.id,
        name: cat.name,
        desc: cat.desc,
        include: cat.include,
        effective: catEffective,
        level1,
      };
    })
    .filter((n) => !strict || n.effective);

  const filteredCats = strict
    ? outCategories.filter((c) => c.level1.length > 0)
    : outCategories;

  return {
    id: doc.id,
    name: doc.name,
    desc: doc.desc,
    include: doc.include,
    effective: docEffective,
    categories: filteredCats,
  };
}

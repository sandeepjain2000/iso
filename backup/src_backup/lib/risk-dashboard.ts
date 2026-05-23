import { and, eq, min } from "drizzle-orm";

import {
  getDb,
  isoCategory,
  isoDocument,
  isoLevel1,
  isoLevel2,
} from "@/db";

/** One level-1 risk row in audit scope (document, category, L1 all included). */
export type RiskL1FlatRow = {
  documentName: string;
  categoryName: string;
  level1Name: string;
  level2Anchor: string | null;
  riskDescription: string | null;
  inherentLikelihood: string | null;
  inherentImpact: string | null;
  residualLikelihood: string | null;
  residualImpact: string | null;
};

export type RiskDashboardStats = {
  totalL1: number;
  withRiskDescription: number;
  missingRiskDescription: number;
  documentsInScope: number;
  /** document name -> L1 count */
  l1PerDocument: { documentName: string; count: number }[];
  residualImpact: Record<string, number>;
  residualLikelihood: Record<string, number>;
  inherentImpact: Record<string, number>;
  inherentLikelihood: Record<string, number>;
};

function bucket(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t.length ? t : "(empty)";
}

export function buildDashboardFromRows(
  rows: RiskL1FlatRow[],
): RiskDashboardStats {
  const totalL1 = rows.length;
  let withRiskDescription = 0;
  for (const r of rows) {
    if ((r.riskDescription ?? "").trim().length > 0) withRiskDescription++;
  }
  const docSet = new Set(rows.map((r) => r.documentName));
  const docCounts = new Map<string, number>();
  for (const r of rows) {
    docCounts.set(r.documentName, (docCounts.get(r.documentName) ?? 0) + 1);
  }
  const l1PerDocument = [...docCounts.entries()]
    .map(([documentName, count]) => ({ documentName, count }))
    .sort((a, b) => a.documentName.localeCompare(b.documentName));

  const tally = (key: keyof RiskL1FlatRow) => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      const b = bucket(r[key] as string | null);
      m[b] = (m[b] ?? 0) + 1;
    }
    return m;
  };

  return {
    totalL1,
    withRiskDescription,
    missingRiskDescription: totalL1 - withRiskDescription,
    documentsInScope: docSet.size,
    l1PerDocument,
    residualImpact: tally("residualImpact"),
    residualLikelihood: tally("residualLikelihood"),
    inherentImpact: tally("inherentImpact"),
    inherentLikelihood: tally("inherentLikelihood"),
  };
}

/**
 * Level-1 risks where the certification document, category, and L1 are in scope
 * (matches what the Risk assessment workspace shows with omitted exclusions).
 */
export async function loadScopedRiskL1Rows(
  tenantId: number,
): Promise<RiskL1FlatRow[]> {
  const db = getDb();

  const rows = await db
    .select({
      documentName: isoDocument.name,
      categoryName: isoCategory.name,
      level1Name: isoLevel1.name,
      level2Anchor: min(isoLevel2.name),
      riskDescription: isoLevel1.risk_description,
      inherentLikelihood: isoLevel1.inherent_likelihood,
      inherentImpact: isoLevel1.inherent_impact,
      residualLikelihood: isoLevel1.residual_likelihood,
      residualImpact: isoLevel1.residual_impact,
    })
    .from(isoLevel1)
    .innerJoin(isoCategory, eq(isoLevel1.categoryId, isoCategory.id))
    .innerJoin(isoDocument, eq(isoCategory.documentId, isoDocument.id))
    .leftJoin(
      isoLevel2,
      and(
        eq(isoLevel2.level_1_ID, isoLevel1.id),
        eq(isoLevel2.tenantId, tenantId),
        eq(isoLevel2.include, true),
      ),
    )
    .where(
      and(
        eq(isoLevel1.tenantId, tenantId),
        eq(isoCategory.tenantId, tenantId),
        eq(isoDocument.tenantId, tenantId),
        eq(isoDocument.include, true),
        eq(isoCategory.include, true),
        eq(isoLevel1.include, true),
      ),
    )
    .groupBy(
      isoLevel1.id,
      isoDocument.id,
      isoCategory.id,
      isoDocument.name,
      isoCategory.name,
      isoLevel1.name,
      isoLevel1.risk_description,
      isoLevel1.inherent_likelihood,
      isoLevel1.inherent_impact,
      isoLevel1.residual_likelihood,
      isoLevel1.residual_impact,
    )
    .orderBy(isoDocument.name, isoCategory.name, isoLevel1.name);

  return rows.map((r) => ({
    documentName: r.documentName,
    categoryName: r.categoryName,
    level1Name: r.level1Name,
    level2Anchor: r.level2Anchor,
    riskDescription: r.riskDescription,
    inherentLikelihood: r.inherentLikelihood,
    inherentImpact: r.inherentImpact,
    residualLikelihood: r.residualLikelihood,
    residualImpact: r.residualImpact,
  }));
}

export function riskRowsToCsvLines(rows: RiskL1FlatRow[]): string {
  const headers = [
    "document_name",
    "category",
    "level_1",
    "level_2",
    "risk_description",
    "inherent_likelihood",
    "inherent_impact",
    "residual_likelihood",
    "residual_impact",
  ];
  const esc = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.documentName,
        r.categoryName,
        r.level1Name,
        r.level2Anchor ?? "",
        r.riskDescription ?? "",
        r.inherentLikelihood ?? "",
        r.inherentImpact ?? "",
        r.residualLikelihood ?? "",
        r.residualImpact ?? "",
      ]
        .map(esc)
        .join(","),
    ),
  ];
  return lines.join("\r\n");
}

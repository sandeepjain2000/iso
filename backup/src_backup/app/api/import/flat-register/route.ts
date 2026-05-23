import { parse } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import {
  getDb,
  isoCategory,
  isoDocument,
  isoLevel1,
  isoLevel2,
} from "@/db";
import { getSession } from "@/lib/require-session";

export const runtime = "nodejs";

const LIK = [
  "RARE",
  "UNLIKELY",
  "POSSIBLE",
  "LIKELY",
  "ALMOST_CERTAIN",
] as const;
const IMP = [
  "INSIGNIFICANT",
  "MINOR",
  "MODERATE",
  "MAJOR",
  "CATASTROPHIC",
] as const;

function normKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

function toRow(rec: Record<string, string>): Record<string, string> {
  const m: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec)) {
    m[normKey(k)] = v?.trim() ?? "";
  }
  return m;
}

function parseBool(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function parseLik(v: string): (typeof LIK)[number] | null {
  if (!v.trim()) return null;
  const u = v.trim().toUpperCase().replace(/ /g, "_");
  return (LIK as readonly string[]).includes(u) ? (u as (typeof LIK)[number]) : null;
}

function parseImp(v: string): (typeof IMP)[number] | null {
  if (!v.trim()) return null;
  const u = v.trim().toUpperCase().replace(/ /g, "_");
  return (IMP as readonly string[]).includes(u) ? (u as (typeof IMP)[number]) : null;
}

export async function POST(req: Request) {
  let body: { csv?: string; mode?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const mode = body.mode === "compliance" ? "compliance" : "risk";
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return Response.json({ error: "csv is required" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tid = session.tenantId;
  const ts = new Date().toISOString();

  let records: Record<string, string>[];
  try {
    records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      bom: true,
      trim: true,
    }) as Record<string, string>[];
  } catch {
    return Response.json({ error: "Could not parse CSV" }, { status: 400 });
  }

  const db = getDb();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = toRow(records[i]!);
    const line = i + 2;

    const docName = row.document_name?.trim();
    const catName = row.category?.trim();
    const l1Name = row.level_1?.trim();
    const l2NameRaw = row.level_2?.trim() ?? "";
    if (!docName || !catName || !l1Name) {
      skipped++;
      continue;
    }

    if (
      docName === "Your certification document name" ||
      (catName === "Example category" &&
        l1Name === "Example level 1" &&
        (!l2NameRaw || l2NameRaw === "Example level 2"))
    ) {
      skipped++;
      continue;
    }

    if (mode !== "risk" && !l2NameRaw) {
      skipped++;
      continue;
    }

    const [doc] = await db
      .select()
      .from(isoDocument)
      .where(
        and(eq(isoDocument.tenantId, tid), eq(isoDocument.name, docName)),
      )
      .limit(1);
    if (!doc) {
      skipped++;
      errors.push(`Line ${line}: document not found "${docName}"`);
      continue;
    }

    const [cat] = await db
      .select()
      .from(isoCategory)
      .where(
        and(
          eq(isoCategory.tenantId, tid),
          eq(isoCategory.documentId, doc.id),
          eq(isoCategory.name, catName),
        ),
      )
      .limit(1);
    if (!cat) {
      skipped++;
      errors.push(`Line ${line}: category not found "${catName}"`);
      continue;
    }

    const [l1] = await db
      .select()
      .from(isoLevel1)
      .where(
        and(
          eq(isoLevel1.tenantId, tid),
          eq(isoLevel1.categoryId, cat.id),
          eq(isoLevel1.name, l1Name),
        ),
      )
      .limit(1);
    if (!l1) {
      skipped++;
      errors.push(`Line ${line}: level_1 not found "${l1Name}"`);
      continue;
    }

    try {
      if (mode === "risk" && !l2NameRaw) {
        const patch: Partial<typeof isoLevel1.$inferInsert> = {
          updated_at: ts,
        };
        if ("risk_description" in row) {
          const t = (row.risk_description ?? "").trim();
          patch.risk_description = t ? t.replace(/\r\n/g, "\n") : null;
        }
        const il = parseLik(row.inherent_likelihood ?? "");
        const ii = parseImp(row.inherent_impact ?? "");
        const rl = parseLik(row.residual_likelihood ?? "");
        const ri = parseImp(row.residual_impact ?? "");
        if (row.inherent_likelihood !== undefined && row.inherent_likelihood !== "")
          patch.inherent_likelihood = il;
        if (row.inherent_impact !== undefined && row.inherent_impact !== "")
          patch.inherent_impact = ii;
        if (row.residual_likelihood !== undefined && row.residual_likelihood !== "")
          patch.residual_likelihood = rl;
        if (row.residual_impact !== undefined && row.residual_impact !== "")
          patch.residual_impact = ri;

        const keys = Object.keys(patch).filter((k) => k !== "updated_at");
        if (keys.length > 0) {
          await db
            .update(isoLevel1)
            .set(patch)
            .where(and(eq(isoLevel1.id, l1.id), eq(isoLevel1.tenantId, tid)));
        }
        imported++;
        continue;
      }

      const [l2] = await db
        .select()
        .from(isoLevel2)
        .where(
          and(
            eq(isoLevel2.tenantId, tid),
            eq(isoLevel2.level_1_ID, l1.id),
            eq(isoLevel2.name, l2NameRaw),
          ),
        )
        .limit(1);
      if (!l2) {
        skipped++;
        errors.push(`Line ${line}: level_2 not found "${l2NameRaw}"`);
        continue;
      }

      if (mode === "compliance") {
        if (row.category_in_scope !== undefined && row.category_in_scope !== "") {
          await db
            .update(isoCategory)
            .set({ include: parseBool(row.category_in_scope), updated_at: ts })
            .where(and(eq(isoCategory.id, cat.id), eq(isoCategory.tenantId, tid)));
        }
        if (row.level_1_in_scope !== undefined && row.level_1_in_scope !== "") {
          await db
            .update(isoLevel1)
            .set({ include: parseBool(row.level_1_in_scope), updated_at: ts })
            .where(and(eq(isoLevel1.id, l1.id), eq(isoLevel1.tenantId, tid)));
        }
        if (row.level_2_in_scope !== undefined && row.level_2_in_scope !== "") {
          await db
            .update(isoLevel2)
            .set({ include: parseBool(row.level_2_in_scope), updated_at: ts })
            .where(and(eq(isoLevel2.id, l2.id), eq(isoLevel2.tenantId, tid)));
        }
      }

      if (mode === "risk") {
        const patch: Partial<typeof isoLevel1.$inferInsert> = {
          updated_at: ts,
        };
        if ("risk_description" in row) {
          const t = (row.risk_description ?? "").trim();
          patch.risk_description = t ? t.replace(/\r\n/g, "\n") : null;
        }
        const il = parseLik(row.inherent_likelihood ?? "");
        const ii = parseImp(row.inherent_impact ?? "");
        const rl = parseLik(row.residual_likelihood ?? "");
        const ri = parseImp(row.residual_impact ?? "");
        if (row.inherent_likelihood !== undefined && row.inherent_likelihood !== "")
          patch.inherent_likelihood = il;
        if (row.inherent_impact !== undefined && row.inherent_impact !== "")
          patch.inherent_impact = ii;
        if (row.residual_likelihood !== undefined && row.residual_likelihood !== "")
          patch.residual_likelihood = rl;
        if (row.residual_impact !== undefined && row.residual_impact !== "")
          patch.residual_impact = ri;

        const keys = Object.keys(patch).filter((k) => k !== "updated_at");
        if (keys.length > 0) {
          await db
            .update(isoLevel1)
            .set(patch)
            .where(and(eq(isoLevel1.id, l1.id), eq(isoLevel1.tenantId, tid)));
        }
      } else {
        if (row.control_guidance !== undefined && row.control_guidance !== "") {
          await db
            .update(isoLevel2)
            .set({
              desc: row.control_guidance.replace(/\r\n/g, "\n"),
              updated_at: ts,
            })
            .where(and(eq(isoLevel2.id, l2.id), eq(isoLevel2.tenantId, tid)));
        }
      }

      imported++;
    } catch (e) {
      skipped++;
      errors.push(
        `Line ${line}: ${e instanceof Error ? e.message : "update failed"}`,
      );
    }
  }

  return Response.json({
    ok: true,
    mode,
    imported,
    skipped,
    errors: errors.slice(0, 40),
    note:
      mode === "compliance"
        ? "evidence_summary is not applied on import; edit evidence in the UI."
        : undefined,
  });
}

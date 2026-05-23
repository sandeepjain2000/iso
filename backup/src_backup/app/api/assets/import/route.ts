import { parse } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import { getDb, isoAsset, isoAssetSubtype, isoAssetType } from "@/db";
import { getSession } from "@/lib/require-session";
import {
  assetSubtypeBelongsToTenant,
  assetTypeBelongsToTenant,
} from "@/lib/tenant-guards";

export const runtime = "nodejs";

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function rowToMap(row: Record<string, string>): Record<string, string> {
  const m: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    m[normalizeHeader(k)] = v?.trim() ?? "";
  }
  return m;
}

export async function POST(req: Request) {
  let body: { csv?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return Response.json({ error: "csv is required" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tid = session.tenantId;
  const uid = session.userId;
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
  const types = await db
    .select()
    .from(isoAssetType)
    .where(eq(isoAssetType.tenantId, tid));
  const subtypes = await db
    .select()
    .from(isoAssetSubtype)
    .where(eq(isoAssetSubtype.tenantId, tid));

  const resolveTypeId = (row: Record<string, string>): number | null => {
    const idRaw = row.asset_type_id?.trim();
    if (idRaw && Number.isFinite(Number(idRaw))) {
      const id = Number(idRaw);
      return types.some((t) => t.id === id) ? id : null;
    }
    const name = row.asset_type?.trim();
    if (!name) return types[0]?.id ?? null;
    const exact = types.find((t) => t.asset_type === name);
    if (exact) return exact.id;
    const ci = types.find(
      (t) => t.asset_type.toLowerCase() === name.toLowerCase(),
    );
    return ci?.id ?? null;
  };

  const resolveSubtypeId = (
    row: Record<string, string>,
    typeId: number,
  ): number | null => {
    const idRaw = row.asset_subtype_id?.trim();
    if (idRaw && Number.isFinite(Number(idRaw))) {
      const id = Number(idRaw);
      const st = subtypes.find((s) => s.id === id && s.asset_type_id === typeId);
      return st ? id : null;
    }
    const name = row.asset_subtype?.trim();
    if (!name) return null;
    const st = subtypes.find(
      (s) =>
        s.asset_type_id === typeId &&
        (s.name === name || s.name.toLowerCase() === name.toLowerCase()),
    );
    return st?.id ?? null;
  };

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  type LogRow = {
    line: number;
    outcome: "imported" | "skipped";
    asset_id: string | null;
    message: string;
  };
  const log: LogRow[] = [];
  const MAX_LOG = 2000;

  const pushLog = (entry: LogRow) => {
    if (log.length >= MAX_LOG) return;
    log.push(entry);
    if (entry.outcome === "skipped") {
      errors.push(`Line ${entry.line}: ${entry.message}`);
    }
  };

  for (let i = 0; i < records.length; i++) {
    const raw = records[i]!;
    const row = rowToMap(raw);
    const line = i + 2;

    const asset_id = row.asset_id?.trim();
    const asset_name = row.asset_name?.trim();
    if (!asset_id || !asset_name) {
      skipped++;
      const missing: string[] = [];
      if (!asset_id) missing.push("asset_id");
      if (!asset_name) missing.push("asset_name");
      pushLog({
        line,
        outcome: "skipped",
        asset_id: asset_id || null,
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
      continue;
    }

    if (
      asset_name.includes("Template row") ||
      asset_id === "AST-EXAMPLE-001"
    ) {
      skipped++;
      pushLog({
        line,
        outcome: "skipped",
        asset_id,
        message:
          "Skipped template / example row (not imported into the register)",
      });
      continue;
    }

    const typeId = resolveTypeId(row);
    if (typeId == null) {
      skipped++;
      pushLog({
        line,
        outcome: "skipped",
        asset_id,
        message:
          types.length === 0
            ? "No asset types exist for this tenant — add types first"
            : `Unknown asset_type / asset_type_id (got type id/name: "${row.asset_type_id?.trim() || ""}" / "${row.asset_type?.trim() || ""}")`,
      });
      continue;
    }

    const [exists] = await db
      .select({ id: isoAsset.id })
      .from(isoAsset)
      .where(and(eq(isoAsset.tenantId, tid), eq(isoAsset.asset_id, asset_id)))
      .limit(1);
    if (exists) {
      skipped++;
      pushLog({
        line,
        outcome: "skipped",
        asset_id,
        message: `asset_id already exists in this tenant`,
      });
      continue;
    }

    const typeOk = await assetTypeBelongsToTenant(typeId, tid);
    if (!typeOk) {
      skipped++;
      pushLog({
        line,
        outcome: "skipped",
        asset_id,
        message: `Asset type id ${typeId} is not valid for your tenant`,
      });
      continue;
    }

    let asset_subtype_id: number | null = resolveSubtypeId(row, typeId);
    if (asset_subtype_id != null) {
      const stOk = await assetSubtypeBelongsToTenant(asset_subtype_id, tid);
      if (!stOk) asset_subtype_id = null;
    }

    const owner = row.owner?.trim() || "Import";
    const location = row.location?.trim() || "—";
    const asset_classification =
      row.asset_classification?.trim() || "INTERNAL_USE_ONLY";
    const asset_risk_level = row.asset_risk_level?.trim() || "MEDIUM";
    const asset_criticality = row.asset_criticality?.trim() || "MEDIUM";
    const iso_clause_ref = row.iso_clause_ref?.trim() || "—";
    const asset_condition = row.asset_condition?.trim() || "GOOD";
    const acquired_date =
      row.acquired_date?.trim() || `${ts.slice(0, 10)} 00:00:00`;

    const asset_cost = Number.isFinite(Number(row.asset_cost))
      ? Math.trunc(Number(row.asset_cost))
      : 0;

    try {
      await db.insert(isoAsset).values({
        tenantId: tid,
        asset_id,
        sku_number: row.sku_number?.trim() || null,
        asset_name,
        asset_type_id: typeId,
        asset_subtype_id,
        asset_description: row.asset_description?.trim() || null,
        owner,
        createdBy: uid,
        updatedBy: uid,
        custodianEmail: row.custodian_email?.trim() || null,
        location,
        asset_classification,
        asset_risk_level,
        asset_associated_risks: row.asset_associated_risks?.trim() || null,
        vulnerabilities: row.vulnerabilities?.trim() || null,
        asset_cost,
        asset_criticality,
        iso_clause_ref,
        controls: row.controls?.trim() || null,
        maintenance_schedule: row.maintenance_schedule?.trim() || null,
        asset_condition,
        acquired_date,
        disposal_date: row.disposal_date?.trim() || null,
        created_at: ts,
        updated_at: ts,
      });
      imported++;
      pushLog({
        line,
        outcome: "imported",
        asset_id,
        message: `Imported "${asset_name}" (type ${typeId}${asset_subtype_id != null ? `, subtype ${asset_subtype_id}` : ""})`,
      });
    } catch (e) {
      skipped++;
      pushLog({
        line,
        outcome: "skipped",
        asset_id,
        message: e instanceof Error ? e.message : "Database insert failed",
      });
    }
  }

  return Response.json({
    ok: true,
    imported,
    skipped,
    errors: errors.slice(0, 200),
    log,
    log_truncated: log.length >= MAX_LOG,
  });
}

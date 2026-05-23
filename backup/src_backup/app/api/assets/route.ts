import { getDb, isoAsset, isoAssetType, isoAssetSubtype } from "@/db";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";
import {
  assetSubtypeBelongsToTenant,
  assetTypeBelongsToTenant,
} from "@/lib/tenant-guards";
import { asc, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tid = session.tenantId;
    const db = getDb();
    const rows = await db
      .select()
      .from(isoAsset)
      .where(eq(isoAsset.tenantId, tid))
      .orderBy(asc(isoAsset.asset_name));
    const types = await db
      .select()
      .from(isoAssetType)
      .where(eq(isoAssetType.tenantId, tid));
    const subtypes = await db
      .select()
      .from(isoAssetSubtype)
      .where(eq(isoAssetSubtype.tenantId, tid));
    return Response.json({ assets: rows, types, subtypes });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tid = session.tenantId;

  const asset_id =
    typeof body.asset_id === "string" && body.asset_id.trim()
      ? body.asset_id.trim()
      : `AST-${Date.now()}`;
  const asset_name =
    typeof body.asset_name === "string" && body.asset_name.trim()
      ? body.asset_name.trim()
      : "New asset";
  const owner =
    typeof body.owner === "string" ? body.owner : "";
  const location =
    typeof body.location === "string" ? body.location : "";
  const asset_type_id = Number(body.asset_type_id);
  if (!Number.isFinite(asset_type_id)) {
    return Response.json({ error: "asset_type_id is required" }, { status: 400 });
  }
  const typeOk = await assetTypeBelongsToTenant(asset_type_id, tid);
  if (!typeOk) {
    return Response.json({ error: "Invalid asset type" }, { status: 400 });
  }

  const subtypeRaw = body.asset_subtype_id;
  let asset_subtype_id: number | null = null;
  if (subtypeRaw !== null && subtypeRaw !== "" && subtypeRaw !== undefined) {
    const sid = Number(subtypeRaw);
    if (!Number.isFinite(sid)) {
      return Response.json(
        { error: "asset_subtype_id must be a number or null" },
        { status: 400 },
      );
    }
    const stOk = await assetSubtypeBelongsToTenant(sid, tid);
    if (!stOk) {
      return Response.json({ error: "Invalid asset subtype" }, { status: 400 });
    }
    asset_subtype_id = sid;
  }

  const ts = new Date().toISOString();
  const uid = session.userId;

  const row = {
    tenantId: tid,
    asset_id,
    sku_number:
      body.sku_number === null || body.sku_number === ""
        ? null
        : String(body.sku_number),
    asset_name,
    asset_type_id,
    asset_subtype_id,
    asset_description:
      typeof body.asset_description === "string" ? body.asset_description : null,
    owner,
    createdBy: uid,
    updatedBy: uid,
    custodianEmail:
      typeof body.custodianEmail === "string" && body.custodianEmail
        ? body.custodianEmail
        : null,
    location,
    asset_classification:
      typeof body.asset_classification === "string" && body.asset_classification
        ? body.asset_classification
        : "INTERNAL_USE_ONLY",
    asset_risk_level:
      typeof body.asset_risk_level === "string" && body.asset_risk_level
        ? body.asset_risk_level
        : "MEDIUM",
    asset_associated_risks:
      typeof body.asset_associated_risks === "string"
        ? body.asset_associated_risks
        : null,
    vulnerabilities:
      typeof body.vulnerabilities === "string" ? body.vulnerabilities : null,
    asset_cost: Number.isFinite(Number(body.asset_cost))
      ? Math.trunc(Number(body.asset_cost))
      : 0,
    asset_criticality:
      typeof body.asset_criticality === "string" && body.asset_criticality
        ? body.asset_criticality
        : "MEDIUM",
    iso_clause_ref:
      typeof body.iso_clause_ref === "string" ? body.iso_clause_ref : "",
    controls: typeof body.controls === "string" ? body.controls : null,
    maintenance_schedule:
      typeof body.maintenance_schedule === "string"
        ? body.maintenance_schedule
        : null,
    asset_condition:
      typeof body.asset_condition === "string" && body.asset_condition
        ? body.asset_condition
        : "GOOD",
    acquired_date:
      typeof body.acquired_date === "string" && body.acquired_date.trim()
        ? body.acquired_date.trim()
        : `${ts.slice(0, 10)} 00:00:00`,
    disposal_date:
      body.disposal_date === null || body.disposal_date === ""
        ? null
        : String(body.disposal_date),
    created_at: ts,
    updated_at: ts,
  };

  try {
    const db = getDb();
    await db.insert(isoAsset).values(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE constraint failed")) {
      return Response.json(
        {
          error:
            "asset_id must be unique. Change asset_id or edit the existing row.",
        },
        { status: 409 },
      );
    }
    if (msg.includes("NOT NULL constraint failed")) {
      return Response.json(
        { error: "Required field missing. Check the form and try again." },
        { status: 400 },
      );
    }
    return serverError(err);
  }
  return Response.json({ ok: true });
}

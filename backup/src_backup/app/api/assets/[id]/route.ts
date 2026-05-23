import { getDb, isoAsset } from "@/db";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";
import {
  assetBelongsToTenant,
  assetSubtypeBelongsToTenant,
  assetTypeBelongsToTenant,
} from "@/lib/tenant-guards";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sid } = await ctx.params;
  const id = Number(sid);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ok = await assetBelongsToTenant(id, session.tenantId);
  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const db = getDb();
    await db
      .delete(isoAsset)
      .where(
        and(eq(isoAsset.id, id), eq(isoAsset.tenantId, session.tenantId)),
      );
  } catch (err) {
    return serverError(err);
  }
  return Response.json({ ok: true });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sid } = await ctx.params;
  const id = Number(sid);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }
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
  const belongs = await assetBelongsToTenant(id, tid);
  if (!belongs) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = [
    "asset_id",
    "asset_name",
    "owner",
    "location",
    "asset_description",
    "asset_classification",
    "asset_risk_level",
    "asset_criticality",
    "iso_clause_ref",
    "controls",
    "custodianEmail",
    "sku_number",
    "asset_condition",
    "asset_associated_risks",
    "vulnerabilities",
    "maintenance_schedule",
    "acquired_date",
    "disposal_date",
  ] as const;

  /** Empty string may become null only for these (nullable in DB). */
  const nullableString = new Set<string>([
    "sku_number",
    "asset_description",
    "custodianEmail",
    "controls",
    "asset_associated_risks",
    "vulnerabilities",
    "maintenance_schedule",
    "disposal_date",
  ]);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  for (const k of allowed) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v !== null && typeof v !== "string") {
      return Response.json(
        { error: `Invalid type for ${k}; expected string or null` },
        { status: 400 },
      );
    }
    if (nullableString.has(k)) {
      patch[k] = v === null || v === "" ? null : v;
    } else if (v === null || v === "") {
      return Response.json(
        { error: `${k} is required and cannot be empty.` },
        { status: 400 },
      );
    } else {
      patch[k] = v;
    }
  }

  if ("asset_cost" in body) {
    const c = Number(body.asset_cost);
    if (!Number.isFinite(c)) {
      return Response.json({ error: "asset_cost must be a number" }, { status: 400 });
    }
    patch.asset_cost = Math.trunc(c);
  }

  if ("asset_type_id" in body) {
    const t = Number(body.asset_type_id);
    if (!Number.isFinite(t)) {
      return Response.json(
        { error: "asset_type_id must be a number" },
        { status: 400 },
      );
    }
    const typeOk = await assetTypeBelongsToTenant(t, tid);
    if (!typeOk) {
      return Response.json({ error: "Invalid asset type" }, { status: 400 });
    }
    patch.asset_type_id = t;
  }
  if ("asset_subtype_id" in body) {
    const v = body.asset_subtype_id;
    patch.asset_subtype_id =
      v === null || v === "" ? null : Number(v);
    if (
      patch.asset_subtype_id !== null &&
      !Number.isFinite(patch.asset_subtype_id)
    ) {
      return Response.json(
        { error: "asset_subtype_id must be a number or null" },
        { status: 400 },
      );
    }
    if (patch.asset_subtype_id !== null) {
      const stOk = await assetSubtypeBelongsToTenant(
        patch.asset_subtype_id as number,
        tid,
      );
      if (!stOk) {
        return Response.json({ error: "Invalid asset subtype" }, { status: 400 });
      }
    }
  }

  try {
    const db = getDb();
    await db
      .update(isoAsset)
      .set(patch)
      .where(and(eq(isoAsset.id, id), eq(isoAsset.tenantId, tid)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE constraint failed")) {
      return Response.json(
        {
          error:
            "Another asset already uses this asset_id. Choose a unique asset_id.",
        },
        { status: 409 },
      );
    }
    if (msg.includes("NOT NULL constraint failed")) {
      return Response.json(
        {
          error:
            "A required field was missing or cleared. Fill all fields marked * and try again.",
        },
        { status: 400 },
      );
    }
    return serverError(err);
  }
  return Response.json({ ok: true });
}

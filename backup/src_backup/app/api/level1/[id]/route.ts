import { getDb, isoLevel1 } from "@/db";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";
import { level1BelongsToTenant } from "@/lib/tenant-guards";
import { and, eq } from "drizzle-orm";

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

function parseOpt<T extends readonly string[]>(
  v: unknown,
  allowed: T,
): T[number] | null {
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !allowed.includes(v)) {
    throw new Error("invalid");
  }
  return v as T[number];
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
  const ok = await level1BelongsToTenant(id, session.tenantId);
  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Partial<typeof isoLevel1.$inferInsert> = {
    updated_at: new Date().toISOString(),
  };

  if ("risk_description" in body) {
    const v = body.risk_description;
    if (v !== null && typeof v !== "string") {
      return Response.json(
        { error: "risk_description must be a string or null" },
        { status: 400 },
      );
    }
    const t = v === null ? "" : v.trim();
    if (t.length > 16_000) {
      return Response.json(
        { error: "risk_description must be at most 16000 characters" },
        { status: 400 },
      );
    }
    patch.risk_description = t ? t.replace(/\r\n/g, "\n") : null;
  }

  try {
    if ("inherent_likelihood" in body) {
      patch.inherent_likelihood = parseOpt(body.inherent_likelihood, LIK);
    }
    if ("residual_likelihood" in body) {
      patch.residual_likelihood = parseOpt(body.residual_likelihood, LIK);
    }
    if ("inherent_impact" in body) {
      patch.inherent_impact = parseOpt(body.inherent_impact, IMP);
    }
    if ("residual_impact" in body) {
      patch.residual_impact = parseOpt(body.residual_impact, IMP);
    }
  } catch {
    return Response.json({ error: "Invalid risk field value" }, { status: 400 });
  }

  const keys = Object.keys(patch).filter((k) => k !== "updated_at");
  if (keys.length === 0) {
    return Response.json({ error: "No risk fields to update" }, { status: 400 });
  }

  try {
    const db = getDb();
    await db
      .update(isoLevel1)
      .set(patch)
      .where(
        and(eq(isoLevel1.id, id), eq(isoLevel1.tenantId, session.tenantId)),
      );
  } catch (err) {
    return serverError(err);
  }
  return Response.json({ ok: true });
}

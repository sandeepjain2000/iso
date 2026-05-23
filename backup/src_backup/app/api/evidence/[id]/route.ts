import { getDb, isoEvidence } from "@/db";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";
import { evidenceBelongsToTenant } from "@/lib/tenant-guards";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

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
  const ok = await evidenceBelongsToTenant(id, session.tenantId);
  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if ("name" in body) {
    if (typeof body.name !== "string") {
      return Response.json({ error: "name must be a string" }, { status: 400 });
    }
    patch.name = body.name;
  }
  if ("desc" in body) {
    if (body.desc !== null && typeof body.desc !== "string") {
      return Response.json({ error: "desc must be a string or null" }, { status: 400 });
    }
    patch.desc = body.desc;
  }
  if ("url" in body) {
    if (body.url !== null && typeof body.url !== "string") {
      return Response.json({ error: "url must be a string or null" }, { status: 400 });
    }
    patch.url = body.url;
  }
  if ("include" in body) patch.include = Boolean(body.include);

  try {
    const db = getDb();
    await db
      .update(isoEvidence)
      .set(patch)
      .where(
        and(
          eq(isoEvidence.id, id),
          eq(isoEvidence.tenantId, session.tenantId),
        ),
      );
  } catch (err) {
    return serverError(err);
  }
  return Response.json({ ok: true });
}

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
  const ok = await evidenceBelongsToTenant(id, session.tenantId);
  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const db = getDb();
    await db
      .delete(isoEvidence)
      .where(
        and(
          eq(isoEvidence.id, id),
          eq(isoEvidence.tenantId, session.tenantId),
        ),
      );
  } catch (err) {
    return serverError(err);
  }
  return Response.json({ ok: true });
}

import { getDb, isoEvidence } from "@/db";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";
import { level2BelongsToTenant } from "@/lib/tenant-guards";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const level2Id = new URL(req.url).searchParams.get("level2Id");
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = getDb();
    const tid = session.tenantId;
    if (level2Id) {
      const id = Number(level2Id);
      if (!Number.isFinite(id)) {
        return Response.json({ error: "Invalid level2Id" }, { status: 400 });
      }
      const ok = await level2BelongsToTenant(id, tid);
      if (!ok) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      const rows = await db
        .select()
        .from(isoEvidence)
        .where(
          and(eq(isoEvidence.level_2_ID, id), eq(isoEvidence.tenantId, tid)),
        );
      return Response.json(rows);
    }
    const rows = await db
      .select()
      .from(isoEvidence)
      .where(eq(isoEvidence.tenantId, tid));
    return Response.json(rows);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  let body: {
    name: string;
    desc?: string;
    url?: string;
    level_2_ID: number;
    createdBy?: number;
    updatedBy?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.name?.trim() || !Number.isFinite(body.level_2_ID)) {
    return Response.json(
      { error: "name and level_2_ID are required" },
      { status: 400 },
    );
  }
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ok = await level2BelongsToTenant(body.level_2_ID, session.tenantId);
  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const ts = new Date().toISOString();
  const uid = session.userId;
  try {
    const db = getDb();
    await db.insert(isoEvidence).values({
      tenantId: session.tenantId,
      name: body.name.trim(),
      desc: body.desc ?? "",
      url: body.url?.trim() ? body.url.trim() : null,
      include: true,
      level_2_ID: body.level_2_ID,
      createdBy: uid,
      updatedBy: uid,
      created_at: ts,
      updated_at: ts,
    });
  } catch (err) {
    return serverError(err);
  }
  return Response.json({ ok: true });
}

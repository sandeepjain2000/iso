import { getDb, isoDocument } from "@/db";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";
import { asc, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auditor = new URL(req.url).searchParams.get("auditor") === "1";
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = getDb();
    const rows = await db
      .select()
      .from(isoDocument)
      .where(eq(isoDocument.tenantId, session.tenantId))
      .orderBy(asc(isoDocument.name));
    const list = auditor ? rows.filter((r) => r.include) : rows;
    return Response.json(list);
  } catch (err) {
    return serverError(err);
  }
}

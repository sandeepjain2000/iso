import { eq } from "drizzle-orm";
import { getDb, tenant, user } from "@/db";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";

export const runtime = "nodejs";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) {
      return Response.json({ user: null });
    }
    const db = getDb();
    const [t] = await db
      .select({ name: tenant.name, slug: tenant.slug })
      .from(tenant)
      .where(eq(tenant.id, s.tenantId))
      .limit(1);
    const [u] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, s.userId))
      .limit(1);
    if (!u) {
      return Response.json({ user: null });
    }
    return Response.json({
      user: {
        ...u,
        tenantName: t?.name ?? "",
        tenantSlug: t?.slug ?? "",
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

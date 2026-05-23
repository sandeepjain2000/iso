import { DEMO_TENANTS } from "@/lib/demo-tenants";

export const runtime = "nodejs";

/** Public list of demo organisations for the landing page (no secrets). */
export async function GET() {
  return Response.json({
    tenants: DEMO_TENANTS.map((t) => ({
      slug: t.slug,
      name: t.name,
      email: t.email,
    })),
  });
}

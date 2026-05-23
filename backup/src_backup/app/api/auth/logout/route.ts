import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  jar.set(sessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return Response.json({ ok: true });
}

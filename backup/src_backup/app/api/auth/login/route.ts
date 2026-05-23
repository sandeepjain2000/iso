import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb, user } from "@/db";
import { createSessionToken, sessionCookieName } from "@/lib/session";
import { serverError } from "@/lib/server-error";

export const runtime = "nodejs";

function passwordMatches(plain: string, stored: string): boolean {
  const s = stored.trim();
  if (s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$")) {
    return bcrypt.compareSync(plain, s);
  }
  return plain === s;
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (!row) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const ok = passwordMatches(password, row.password_hash);
    if (!ok) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: row.id,
      tenantId: row.tenantId,
      email: row.email,
      name: row.name,
    });
    const jar = await cookies();
    jar.set(sessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return Response.json({
      ok: true,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        tenantId: row.tenantId,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

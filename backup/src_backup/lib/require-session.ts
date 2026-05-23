import { cookies } from "next/headers";
import {
  sessionCookieName,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(sessionCookieName())?.value);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return s;
}

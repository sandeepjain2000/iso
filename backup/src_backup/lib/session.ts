import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  userId: number;
  tenantId: number;
  email: string;
  name: string;
};

const COOKIE_NAME = "cc_session";

function secretKey() {
  const raw = process.env.AUTH_SECRET ?? "dev-insecure-change-me-in-production";
  return new TextEncoder().encode(raw);
}

export function sessionCookieName() {
  return COOKIE_NAME;
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({
    userId: payload.userId,
    tenantId: payload.tenantId,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token?.trim()) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = Number(payload.userId);
    const tenantId = Number(payload.tenantId);
    const email = typeof payload.email === "string" ? payload.email : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    if (!Number.isFinite(userId) || !Number.isFinite(tenantId) || !email) {
      return null;
    }
    return { userId, tenantId, email, name };
  } catch {
    return null;
  }
}

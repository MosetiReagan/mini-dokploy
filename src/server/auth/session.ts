import crypto from "crypto";
import { db } from "../db";
import { sessions, users, User } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import type { IncomingMessage, ServerResponse } from "http";

export const SESSION_COOKIE_NAME = "mini_dokploy_session";

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  db.insert(sessions)
    .values({
      id: `sess_${crypto.randomUUID()}`,
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
    })
    .run();

  return token;
}

export async function getUserFromSession(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  try {
    const session = db
      .select({
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .get();

    return session?.user || null;
  } catch (err) {
    console.error("[Session] Error resolving session:", err);
    return null;
  }
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0]?.trim();
    const val = parts.slice(1).join("=").trim();
    if (name) list[name] = decodeURIComponent(val);
  });

  return list;
}

export function setSessionCookie(res: ServerResponse, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
      isProd ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(res: ServerResponse) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

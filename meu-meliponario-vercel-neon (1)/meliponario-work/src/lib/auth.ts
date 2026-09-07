import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { users, membros } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "meu-meliponario-dev-secret-change-me-please-1234"
);
const COOKIE = "meli_session";

export type SessionUser = {
  id: number;
  nome: string;
  email: string;
};

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Note: we intentionally do NOT force `secure` so the session cookie also
    // works over plain HTTP previews/proxies. Over HTTPS it is still sent.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    const uid = payload.uid as number;
    if (!uid) return null;
    const rows = await db
      .select({ id: users.id, nome: users.nome, email: users.email })
      .from(users)
      .where(eq(users.id, uid))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new AuthError("Não autenticado");
  return u;
}

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

// Returns membership (role) of user in meliponario, or null
export async function getMembership(userId: number, meliponarioId: number) {
  const rows = await db
    .select()
    .from(membros)
    .where(
      and(
        eq(membros.userId, userId),
        eq(membros.meliponarioId, meliponarioId),
        eq(membros.status, "ativo")
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

// Ensure user is an active member; optionally require certain roles
export async function requireMember(
  userId: number,
  meliponarioId: number,
  roles?: string[]
) {
  const m = await getMembership(userId, meliponarioId);
  if (!m) throw new ForbiddenError("Sem acesso a este meliponário");
  if (roles && !roles.includes(m.funcao)) {
    throw new ForbiddenError("Permissão insuficiente");
  }
  return m;
}

export const canEdit = (funcao: string) =>
  funcao === "ADMIN" || funcao === "MANEJADOR";
export const isAdmin = (funcao: string) => funcao === "ADMIN";

// Colonies not deleted filter helper
export const notDeleted = (col: { deletedAt: unknown }) =>
  isNull(col.deletedAt as never);

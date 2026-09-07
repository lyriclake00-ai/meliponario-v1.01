import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, senha } = await req.json();
    if (!email || !senha) {
      return Response.json({ error: "Informe e-mail e senha." }, { status: 400 });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const [u] = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    if (!u) return Response.json({ error: "Credenciais inválidas." }, { status: 401 });
    const ok = await bcrypt.compare(String(senha), u.senhaHash);
    if (!ok) return Response.json({ error: "Credenciais inválidas." }, { status: 401 });
    await db.update(users).set({ ultimoAcesso: new Date() }).where(eq(users.id, u.id));
    await createSession(u.id);
    return Response.json({ user: { id: u.id, nome: u.nome, email: u.email } });
  } catch (e) {
    return handleError(e);
  }
}

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { nome, email, senha, telefone } = await req.json();
    if (!nome || !email || !senha) {
      return Response.json({ error: "Preencha nome, e-mail e senha." }, { status: 400 });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const existing = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    if (existing.length) {
      return Response.json({ error: "Este e-mail já está cadastrado." }, { status: 400 });
    }
    const senhaHash = await bcrypt.hash(String(senha), 10);
    const [u] = await db
      .insert(users)
      .values({ nome, email: emailNorm, senhaHash, telefone: telefone || null, ultimoAcesso: new Date() })
      .returning();
    await createSession(u.id);
    return Response.json({ user: { id: u.id, nome: u.nome, email: u.email } });
  } catch (e) {
    return handleError(e);
  }
}

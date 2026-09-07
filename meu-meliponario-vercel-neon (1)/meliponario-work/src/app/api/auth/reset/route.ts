import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, token, senha } = await req.json();
    if (!email || !token || !senha) {
      return Response.json({ error: "Dados incompletos." }, { status: 400 });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const [u] = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    if (!u || u.resetToken !== String(token).toUpperCase()) {
      return Response.json({ error: "Código inválido." }, { status: 400 });
    }
    if (!u.resetTokenExpira || u.resetTokenExpira < new Date()) {
      return Response.json({ error: "Código expirado." }, { status: 400 });
    }
    const senhaHash = await bcrypt.hash(String(senha), 10);
    await db
      .update(users)
      .set({ senhaHash, resetToken: null, resetTokenExpira: null })
      .where(eq(users.id, u.id));
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

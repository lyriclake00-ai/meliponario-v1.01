import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json();
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.nome === "string") patch.nome = body.nome;
    if (typeof body.telefone === "string") patch.telefone = body.telefone;
    if (typeof body.foto === "string") patch.foto = body.foto;
    if (body.senha) patch.senhaHash = await bcrypt.hash(String(body.senha), 10);
    await db.update(users).set(patch).where(eq(users.id, u.id));
    const [full] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    return Response.json({
      user: { id: full.id, nome: full.nome, email: full.email, telefone: full.telefone, foto: full.foto },
    });
  } catch (e) {
    return handleError(e);
  }
}

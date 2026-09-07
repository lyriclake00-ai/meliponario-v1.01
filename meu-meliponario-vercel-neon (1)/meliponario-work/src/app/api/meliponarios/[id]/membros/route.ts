import { db } from "@/db";
import { membros, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);
    const rows = await db
      .select({
        id: membros.id,
        userId: membros.userId,
        funcao: membros.funcao,
        status: membros.status,
        dataEntrada: membros.dataEntrada,
        nome: users.nome,
        email: users.email,
        foto: users.foto,
        ultimoAcesso: users.ultimoAcesso,
      })
      .from(membros)
      .innerJoin(users, eq(membros.userId, users.id))
      .where(eq(membros.meliponarioId, id));
    return Response.json({ membros: rows });
  } catch (e) {
    return handleError(e);
  }
}

// Admin updates membro: accept/refuse/change role. Body: { membroId, funcao?, status? }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id, ["ADMIN"]);
    const { membroId, funcao, status } = await req.json();
    const patch: Record<string, unknown> = {};
    if (funcao) patch.funcao = funcao;
    if (status) patch.status = status;
    await db
      .update(membros)
      .set(patch)
      .where(and(eq(membros.id, membroId), eq(membros.meliponarioId, id)));
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

// Remove a membro
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id, ["ADMIN"]);
    const { searchParams } = new URL(req.url);
    const membroId = Number(searchParams.get("membroId"));
    await db.delete(membros).where(and(eq(membros.id, membroId), eq(membros.meliponarioId, id)));
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

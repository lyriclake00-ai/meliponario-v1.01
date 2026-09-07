import { db } from "@/db";
import { producoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, requireMember, canEdit } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const [p] = await db.select().from(producoes).where(eq(producoes.id, id)).limit(1);
    if (!p) return Response.json({ error: "Não encontrada" }, { status: 404 });
    const m = await requireMember(u.id, p.meliponarioId);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });
    await db.update(producoes).set({ deletedAt: new Date() }).where(eq(producoes.id, id));
    await logAudit({ meliponarioId: p.meliponarioId, userId: u.id, userNome: u.nome, acao: "excluiu", entidade: "Produção", entidadeId: id, descricao: `Excluiu produção #${id}` });
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

import { db } from "@/db";
import { producoes, colonias } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, requireMember, canEdit } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);
    const rows = await db
      .select({
        id: producoes.id,
        coloniaId: producoes.coloniaId,
        produto: producoes.produto,
        quantidade: producoes.quantidade,
        unidade: producoes.unidade,
        data: producoes.data,
        observacoes: producoes.observacoes,
        responsavelNome: producoes.responsavelNome,
        coloniaCodigo: colonias.codigo,
      })
      .from(producoes)
      .leftJoin(colonias, eq(producoes.coloniaId, colonias.id))
      .where(and(eq(producoes.meliponarioId, id), isNull(producoes.deletedAt)))
      .orderBy(desc(producoes.data));
    return Response.json({ producoes: rows });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const m = await requireMember(u.id, id);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });
    const body = await req.json();
    if (!body.produto || body.quantidade == null) return Response.json({ error: "Produto e quantidade obrigatórios." }, { status: 400 });
    const [p] = await db
      .insert(producoes)
      .values({
        meliponarioId: id,
        coloniaId: body.coloniaId || null,
        responsavelId: u.id,
        responsavelNome: u.nome,
        produto: body.produto,
        quantidade: Number(body.quantidade),
        unidade: body.unidade || "g",
        data: body.data || new Date().toISOString().slice(0, 10),
        observacoes: body.observacoes || null,
      })
      .returning();
    await logAudit({ meliponarioId: id, userId: u.id, userNome: u.nome, acao: "registrou", entidade: "Produção", entidadeId: p.id, descricao: `Registrou produção de ${p.quantidade}${p.unidade} de ${p.produto}` });
    return Response.json({ producao: p });
  } catch (e) {
    return handleError(e);
  }
}

import { db } from "@/db";
import { colonias, visitas, producoes, divisoes } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, requireMember, canEdit } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function loadColonia(id: number) {
  const [c] = await db.select().from(colonias).where(eq(colonias.id, id)).limit(1);
  return c;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const c = await loadColonia(id);
    if (!c || c.deletedAt) return Response.json({ error: "Não encontrada" }, { status: 404 });
    const m = await requireMember(u.id, c.meliponarioId);

    const vis = await db
      .select()
      .from(visitas)
      .where(and(eq(visitas.coloniaId, id), isNull(visitas.deletedAt)))
      .orderBy(desc(visitas.data), desc(visitas.createdAt));
    const prod = await db
      .select()
      .from(producoes)
      .where(and(eq(producoes.coloniaId, id), isNull(producoes.deletedAt)))
      .orderBy(desc(producoes.data));
    const divs = await db
      .select()
      .from(divisoes)
      .where(eq(divisoes.coloniaMaeId, id))
      .orderBy(desc(divisoes.data));
    const filhas = await db
      .select()
      .from(colonias)
      .where(and(eq(colonias.coloniaMaeId, id), isNull(colonias.deletedAt)));
    let mae = null;
    if (c.coloniaMaeId) mae = await loadColonia(c.coloniaMaeId);

    return Response.json({ colonia: c, visitas: vis, producoes: prod, divisoes: divs, filhas, mae, funcao: m.funcao });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const c = await loadColonia(id);
    if (!c) return Response.json({ error: "Não encontrada" }, { status: 404 });
    const m = await requireMember(u.id, c.meliponarioId);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });
    const body = await req.json();
    if (body.codigo && body.codigo !== c.codigo) {
      const dup = await db
        .select()
        .from(colonias)
        .where(and(eq(colonias.meliponarioId, c.meliponarioId), eq(colonias.codigo, body.codigo), isNull(colonias.deletedAt)))
        .limit(1);
      if (dup.length) return Response.json({ error: "Já existe colônia com esse código." }, { status: 400 });
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ["codigo","nome","especie","origem","dataAquisicao","dataFormacao","localizacao","tipoCaixa","status","rainha","populacao","postura","mel","polen","espaco","pragas","umidade","estadoGeral","fotoPrincipal","observacoes","coloniaMaeId"]) {
      if (k in body) patch[k] = body[k];
    }
    await db.update(colonias).set(patch).where(eq(colonias.id, id));
    await logAudit({ meliponarioId: c.meliponarioId, userId: u.id, userNome: u.nome, acao: "atualizou", entidade: "Colônia", entidadeId: id, descricao: `Atualizou a colônia ${c.codigo}` });
    const updated = await loadColonia(id);
    return Response.json({ colonia: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const c = await loadColonia(id);
    if (!c) return Response.json({ error: "Não encontrada" }, { status: 404 });
    const m = await requireMember(u.id, c.meliponarioId, ["ADMIN"]);
    void m;
    await db.update(colonias).set({ deletedAt: new Date() }).where(eq(colonias.id, id));
    await logAudit({ meliponarioId: c.meliponarioId, userId: u.id, userNome: u.nome, acao: "excluiu", entidade: "Colônia", entidadeId: id, descricao: `Excluiu a colônia ${c.codigo}` });
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

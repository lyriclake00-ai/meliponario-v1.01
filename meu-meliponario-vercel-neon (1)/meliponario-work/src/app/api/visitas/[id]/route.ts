import { db } from "@/db";
import { visitas, colonias } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, requireMember, canEdit } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function load(id: number) {
  const [v] = await db.select().from(visitas).where(eq(visitas.id, id)).limit(1);
  return v;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const v = await load(id);
    if (!v || v.deletedAt) return Response.json({ error: "Não encontrada" }, { status: 404 });
    await requireMember(u.id, v.meliponarioId);
    const [c] = await db.select().from(colonias).where(eq(colonias.id, v.coloniaId)).limit(1);
    return Response.json({ visita: v, colonia: c });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const v = await load(id);
    if (!v) return Response.json({ error: "Não encontrada" }, { status: 404 });
    const m = await requireMember(u.id, v.meliponarioId);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });
    const body = await req.json();
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ["data","hora","notaGeral","populacao","rainha","postura","mel","polen","espaco","observacoes"]) {
      if (k in body) patch[k] = body[k];
    }
    if ("problemas" in body) patch.problemas = Array.isArray(body.problemas) ? body.problemas.join(",") : body.problemas;
    if ("manejos" in body) patch.manejos = Array.isArray(body.manejos) ? body.manejos.join(",") : body.manejos;
    if ("fotos" in body) patch.fotos = JSON.stringify(Array.isArray(body.fotos) ? body.fotos.slice(0, 5) : []);
    await db.update(visitas).set(patch).where(eq(visitas.id, id));
    await logAudit({ meliponarioId: v.meliponarioId, userId: u.id, userNome: u.nome, acao: "editou", entidade: "Visita", entidadeId: id, descricao: `Editou visita #${id}` });
    return Response.json({ visita: await load(id) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const v = await load(id);
    if (!v) return Response.json({ error: "Não encontrada" }, { status: 404 });
    const m = await requireMember(u.id, v.meliponarioId);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });
    await db.update(visitas).set({ deletedAt: new Date() }).where(eq(visitas.id, id));
    await logAudit({ meliponarioId: v.meliponarioId, userId: u.id, userNome: u.nome, acao: "excluiu", entidade: "Visita", entidadeId: id, descricao: `Excluiu visita #${id}` });
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

import { db } from "@/db";
import { lembretes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, requireMember, canEdit } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const [l] = await db.select().from(lembretes).where(eq(lembretes.id, id)).limit(1);
    if (!l) return Response.json({ error: "Não encontrado" }, { status: 404 });
    const m = await requireMember(u.id, l.meliponarioId);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["titulo", "descricao", "data", "tipo", "prioridade", "status", "coloniaId"]) {
      if (k in body) patch[k] = body[k];
    }
    await db.update(lembretes).set(patch).where(eq(lembretes.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const [l] = await db.select().from(lembretes).where(eq(lembretes.id, id)).limit(1);
    if (!l) return Response.json({ error: "Não encontrado" }, { status: 404 });
    const m = await requireMember(u.id, l.meliponarioId);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });
    await db.delete(lembretes).where(eq(lembretes.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

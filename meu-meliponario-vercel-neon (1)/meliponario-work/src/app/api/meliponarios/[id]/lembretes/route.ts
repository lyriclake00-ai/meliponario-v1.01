import { db } from "@/db";
import { lembretes, colonias } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, requireMember, canEdit } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);
    const rows = await db.select().from(lembretes).where(eq(lembretes.meliponarioId, id)).orderBy(desc(lembretes.data));
    const cols = await db.select().from(colonias).where(and(eq(colonias.meliponarioId, id), isNull(colonias.deletedAt)));
    const map = new Map(cols.map((c) => [c.id, c.codigo]));
    const today = new Date().toISOString().slice(0, 10);
    const enriched = rows.map((l) => ({
      ...l,
      coloniaCodigo: l.coloniaId ? map.get(l.coloniaId) || null : null,
      atrasado: l.status === "pendente" && l.data < today,
    }));
    return Response.json({ lembretes: enriched });
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
    if (!body.titulo || !body.data) return Response.json({ error: "Título e data obrigatórios." }, { status: 400 });
    const [l] = await db
      .insert(lembretes)
      .values({
        meliponarioId: id,
        coloniaId: body.coloniaId || null,
        responsavelId: u.id,
        tipo: body.tipo || "inspeção",
        titulo: body.titulo,
        descricao: body.descricao || null,
        data: body.data,
        prioridade: body.prioridade || "media",
        status: "pendente",
      })
      .returning();
    return Response.json({ lembrete: l });
  } catch (e) {
    return handleError(e);
  }
}

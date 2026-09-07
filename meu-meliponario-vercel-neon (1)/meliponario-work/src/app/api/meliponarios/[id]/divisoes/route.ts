import { db } from "@/db";
import { divisoes, colonias } from "@/db/schema";
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
    const rows = await db.select().from(divisoes).where(eq(divisoes.meliponarioId, id)).orderBy(desc(divisoes.data));
    const cols = await db.select().from(colonias).where(and(eq(colonias.meliponarioId, id), isNull(colonias.deletedAt)));
    const map = new Map(cols.map((c) => [c.id, c.codigo]));
    const enriched = rows.map((d) => ({
      ...d,
      maeCodigo: map.get(d.coloniaMaeId) || null,
      filhaCodigo: d.coloniaFilhaId ? map.get(d.coloniaFilhaId) || null : null,
    }));
    return Response.json({ divisoes: enriched });
  } catch (e) {
    return handleError(e);
  }
}

// Create division. Optionally create a new daughter colony.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const m = await requireMember(u.id, id);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });
    const body = await req.json();
    if (!body.coloniaMaeId) return Response.json({ error: "Colônia mãe obrigatória." }, { status: 400 });

    let filhaId = body.coloniaFilhaId || null;
    const [mae] = await db.select().from(colonias).where(eq(colonias.id, Number(body.coloniaMaeId))).limit(1);
    if (!mae) return Response.json({ error: "Colônia mãe não encontrada." }, { status: 404 });

    // create new daughter colony if code given
    if (!filhaId && body.novaColoniaCodigo) {
      const dup = await db
        .select()
        .from(colonias)
        .where(and(eq(colonias.meliponarioId, id), eq(colonias.codigo, body.novaColoniaCodigo), isNull(colonias.deletedAt)))
        .limit(1);
      if (dup.length) return Response.json({ error: "Já existe colônia com esse código." }, { status: 400 });
      const [nova] = await db
        .insert(colonias)
        .values({
          meliponarioId: id,
          codigo: body.novaColoniaCodigo,
          especie: mae.especie,
          origem: `Divisão de ${mae.codigo}`,
          dataFormacao: body.data || new Date().toISOString().slice(0, 10),
          status: "Ativa",
          coloniaMaeId: mae.id,
        })
        .returning();
      filhaId = nova.id;
    }

    const [d] = await db
      .insert(divisoes)
      .values({
        meliponarioId: id,
        coloniaMaeId: mae.id,
        coloniaFilhaId: filhaId,
        responsavelId: u.id,
        responsavelNome: u.nome,
        data: body.data || new Date().toISOString().slice(0, 10),
        observacoes: body.observacoes || null,
      })
      .returning();

    if (filhaId && body.coloniaFilhaId) {
      await db.update(colonias).set({ coloniaMaeId: mae.id }).where(eq(colonias.id, Number(filhaId)));
    }

    await logAudit({ meliponarioId: id, userId: u.id, userNome: u.nome, acao: "registrou", entidade: "Divisão", entidadeId: d.id, descricao: `Registrou divisão da colônia ${mae.codigo}` });
    return Response.json({ divisao: d });
  } catch (e) {
    return handleError(e);
  }
}

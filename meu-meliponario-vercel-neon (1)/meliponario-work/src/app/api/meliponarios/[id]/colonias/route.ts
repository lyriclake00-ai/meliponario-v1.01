import { db } from "@/db";
import { colonias, visitas } from "@/db/schema";
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
      .select()
      .from(colonias)
      .where(and(eq(colonias.meliponarioId, id), isNull(colonias.deletedAt)))
      .orderBy(desc(colonias.createdAt));

    // attach last visit
    const enriched = await Promise.all(
      rows.map(async (c) => {
        const [lastV] = await db
          .select()
          .from(visitas)
          .where(and(eq(visitas.coloniaId, c.id), isNull(visitas.deletedAt)))
          .orderBy(desc(visitas.data), desc(visitas.createdAt))
          .limit(1);
        return {
          ...c,
          ultimaVisita: lastV
            ? { data: lastV.data, nota: lastV.notaGeral, responsavel: lastV.responsavelNome }
            : null,
        };
      })
    );
    return Response.json({ colonias: enriched });
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
    if (!body.codigo) return Response.json({ error: "Código é obrigatório." }, { status: 400 });
    // unique code within meliponario
    const dup = await db
      .select()
      .from(colonias)
      .where(and(eq(colonias.meliponarioId, id), eq(colonias.codigo, body.codigo), isNull(colonias.deletedAt)))
      .limit(1);
    if (dup.length) return Response.json({ error: "Já existe uma colônia com esse código." }, { status: 400 });

    const [c] = await db
      .insert(colonias)
      .values({
        meliponarioId: id,
        codigo: body.codigo,
        nome: body.nome || null,
        especie: body.especie || null,
        origem: body.origem || null,
        dataAquisicao: body.dataAquisicao || null,
        dataFormacao: body.dataFormacao || null,
        localizacao: body.localizacao || null,
        tipoCaixa: body.tipoCaixa || null,
        status: body.status || "Ativa",
        rainha: body.rainha || null,
        populacao: body.populacao || null,
        postura: body.postura || null,
        mel: body.mel || null,
        polen: body.polen || null,
        espaco: body.espaco || null,
        pragas: body.pragas || null,
        umidade: body.umidade || null,
        estadoGeral: body.estadoGeral || null,
        fotoPrincipal: body.fotoPrincipal || null,
        observacoes: body.observacoes || null,
        coloniaMaeId: body.coloniaMaeId || null,
      })
      .returning();
    await logAudit({ meliponarioId: id, userId: u.id, userNome: u.nome, acao: "criou", entidade: "Colônia", entidadeId: c.id, descricao: `Cadastrou a colônia ${c.codigo}` });
    return Response.json({ colonia: c });
  } catch (e) {
    return handleError(e);
  }
}

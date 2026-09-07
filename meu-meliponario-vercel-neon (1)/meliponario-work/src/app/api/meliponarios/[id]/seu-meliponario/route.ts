import { db } from "@/db";
import { colonias, visitas, producoes, divisoes, membros, users, lembretes, meliponarios } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Central de informações do meliponário (página "Seu Meliponário")
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);

    const [meli] = await db.select().from(meliponarios).where(eq(meliponarios.id, id)).limit(1);
    if (!meli) return Response.json({ error: "Não encontrado" }, { status: 404 });

    const cols = await db
      .select()
      .from(colonias)
      .where(and(eq(colonias.meliponarioId, id), isNull(colonias.deletedAt)));
    const vis = await db
      .select()
      .from(visitas)
      .where(and(eq(visitas.meliponarioId, id), isNull(visitas.deletedAt)));
    const prods = await db
      .select()
      .from(producoes)
      .where(and(eq(producoes.meliponarioId, id), isNull(producoes.deletedAt)));
    const divs = await db
      .select()
      .from(divisoes)
      .where(eq(divisoes.meliponarioId, id));
    const lembsAll = await db
      .select()
      .from(lembretes)
      .where(eq(lembretes.meliponarioId, id));

    const teamRows = await db
      .select({ id: membros.id, userId: membros.userId, funcao: membros.funcao, status: membros.status, nome: users.nome, email: users.email, foto: users.foto, ultimoAcesso: users.ultimoAcesso })
      .from(membros)
      .innerJoin(users, eq(membros.userId, users.id))
      .where(eq(membros.meliponarioId, id));

    const colMap = new Map(cols.map((c) => [c.id, c]));

    // --- contagens ---
    const ativas = cols.filter((c) => c.status === "Ativa" || c.status === "Forte").length;
    const inativas = cols.filter((c) => c.status === "Inativa" || c.status === "Perdida").length;
    const atencao = cols.filter((c) => c.status === "Atenção" || c.status === "Fraca").length;

    // dias de visita
    const datasUnicas = Array.from(new Set(vis.map((v) => v.data))).sort();
    const diasVisita = datasUnicas.length;
    const ultimaData = vis[0]?.data || null;
    const monthKey = new Date().toISOString().slice(0, 7);
    const diasMes = new Set(vis.filter((v) => v.data.startsWith(monthKey)).map((v) => v.data)).size;

    // produção
    const producaoTotal = prods.reduce((s, p) => s + (p.quantidade || 0), 0);
    const porProduto: Record<string, number> = {};
    for (const p of prods) porProduto[p.produto] = (porProduto[p.produto] || 0) + p.quantidade;

    // colônias recentes
    const cutoff = Date.now() - 30 * 86_400_000;
    const coloniasRecentes = cols.filter((c) => (c.createdAt instanceof Date ? c.createdAt.getTime() : new Date(c.createdAt as unknown as string).getTime()) >= cutoff).length;

    // últimas visitas
    const ultimasVisitas = vis
      .slice()
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .slice(0, 5)
      .map((v) => ({ id: v.id, data: v.data, colonia: colMap.get(v.coloniaId)?.codigo || "—", responsavel: v.responsavelNome, nota: v.notaGeral }));

    // equipe por função
    const equipe = teamRows.filter((m) => m.status === "ativo");
    const porFuncao: Record<string, number> = {};
    for (const m of equipe) porFuncao[m.funcao] = (porFuncao[m.funcao] || 0) + 1;

    // lembretes pendentes
    const today = new Date().toISOString().slice(0, 10);
    const lembretesPendentes = lembsAll.filter((l) => l.status === "pendente");
    const lembretesAtrasados = lembretesPendentes.filter((l) => l.data < today).length;

    return Response.json({
      meliponario: meli,
      contadores: {
        totalColonias: cols.length,
        ativas,
        inativas,
        atencao,
        diasVisita,
        ultimaData,
        diasMes,
        producaoTotal,
        producoes: prods.length,
        porProduto,
        divisoes: divs.length,
        coloniasRecentes,
        lembretesPendentes: lembretesPendentes.length,
        lembretesAtrasados,
        membros: equipe.length,
        porFuncao,
      },
      equipe: equipe.map((e) => ({ id: e.id, nome: e.nome, email: e.email, funcao: e.funcao, foto: e.foto, ultimoAcesso: e.ultimoAcesso })),
      ultimasVisitas,
      ultimasColonias: [...cols]
        .sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) - (a.createdAt instanceof Date ? a.createdAt.getTime() : 0))
        .slice(0, 5)
        .map((c) => ({ id: c.id, codigo: c.codigo, status: c.status, nome: c.nome })),
    });
  } catch (e) {
    return handleError(e);
  }
}

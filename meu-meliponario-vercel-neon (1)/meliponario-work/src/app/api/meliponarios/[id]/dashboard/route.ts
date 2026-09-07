import { db } from "@/db";
import { colonias, visitas, producoes, divisoes, lembretes, membros, notificationDismissals } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

function daysBetween(d: string) {
  const then = new Date(d + "T00:00:00");
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);

    const cols = await db
      .select()
      .from(colonias)
      .where(and(eq(colonias.meliponarioId, id), isNull(colonias.deletedAt)));

    const vis = await db
      .select()
      .from(visitas)
      .where(and(eq(visitas.meliponarioId, id), isNull(visitas.deletedAt)))
      .orderBy(desc(visitas.data), desc(visitas.createdAt));

    const colMap = new Map(cols.map((c) => [c.id, c]));

    const totalColonias = cols.length;
    const ativas = cols.filter((c) => c.status === "Ativa" || c.status === "Forte").length;
    const atencao = cols.filter((c) => c.status === "Atenção" || c.status === "Fraca").length;

    // ------- DIAS DE VISITA (datas únicas) -------
    // Para o card "Visitas" e para a página "Seu Meliponário":
    // contamos a quantidade de DATAS distintas que tiveram pelo menos uma visita.
    const datasUnicas = new Set(vis.map((v) => v.data));
    const diasVisita = datasUnicas.size;
    const ultimaData = vis[0]?.data || null;
    const monthStart = new Date().toISOString().slice(0, 7);
    const diasMes = new Set(vis.filter((v) => v.data.startsWith(monthStart)).map((v) => v.data)).size;
    // dias com atividade neste mês
    const diasMesAtual = diasMes;

    // ------- PRODUÇÃO -------
    const prods = await db
      .select()
      .from(producoes)
      .where(and(eq(producoes.meliponarioId, id), isNull(producoes.deletedAt)));
    const producaoTotal = prods.reduce((s, p) => s + (p.quantidade || 0), 0);

    // ------- DIVISÕES -------
    const divs = await db.select().from(divisoes).where(eq(divisoes.meliponarioId, id));

    // ------- LEMBRETES -------
    const lembsAll = await db.select().from(lembretes).where(eq(lembretes.meliponarioId, id));
    const lembsPend = lembsAll.filter((l) => l.status === "pendente");
    const today = new Date().toISOString().slice(0, 10);
    const lembretesAtrasados = lembsPend.filter((l) => l.data < today).length;

    // ------- EQUIPE -------
    const eqMembros = await db
      .select()
      .from(membros)
      .where(eq(membros.meliponarioId, id));
    const totalMembros = eqMembros.filter((m) => m.status === "ativo").length;

    // ------- RECENTES -------
    const recentes = vis.slice(0, 8).map((v) => ({
      id: v.id,
      data: v.data,
      colonia: colMap.get(v.coloniaId)?.codigo || "—",
      coloniaId: v.coloniaId,
      responsavel: v.responsavelNome,
      nota: v.notaGeral,
      resumo: v.observacoes || (v.manejos ? "Manejo: " + v.manejos : "Visita registrada."),
    }));

    // ------- ÚLTIMAS ATIVIDADES (audit + visitas) -------
    const ultimasAtividades: { data: string; tipo: string; texto: string }[] = [];
    for (const v of vis.slice(0, 5)) {
      ultimasAtividades.push({
        data: v.data,
        tipo: "visita",
        texto: `Visita em ${colMap.get(v.coloniaId)?.codigo || "—"} — ${v.responsavelNome || "Responsável não informado"}`,
      });
    }
    ultimasAtividades.sort((a, b) => (a.data < b.data ? 1 : -1));

    // ------- COLÔNIAS ADICIONADAS RECENTEMENTE (últimos 30 dias) -------
    const cutoff = Date.now() - 30 * 86_400_000;
    const coloniasRecentes = cols.filter((c) => (c.createdAt instanceof Date ? c.createdAt.getTime() : new Date(c.createdAt as unknown as string).getTime()) >= cutoff).length;

    // ------- ÚLTIMAS COLÔNIAS CADASTRADAS -------
    const ultimasColonias = [...cols]
      .sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) - (a.createdAt instanceof Date ? a.createdAt.getTime() : 0))
      .slice(0, 5)
      .map((c) => ({ id: c.id, codigo: c.codigo, status: c.status }));

    // ------- ALERTAS (com chave estável p/ dispensar) -------
    type Alerta = { chave: string; colonia: string; coloniaId: number | null; texto: string; tipo: string };
    const alertas: Alerta[] = [];
    const lastVisitByCol = new Map<number, (typeof vis)[number]>();
    for (const v of vis) if (!lastVisitByCol.has(v.coloniaId)) lastVisitByCol.set(v.coloniaId, v);
    for (const c of cols) {
      const lv = lastVisitByCol.get(c.id);
      if (!lv) {
        alertas.push({ chave: `col:${c.id}:sem_visita`, colonia: c.codigo, coloniaId: c.id, texto: `${c.codigo} nunca recebeu uma visita.`, tipo: "sem_visita" });
      } else {
        const d = daysBetween(lv.data);
        if (d >= 30) alertas.push({ chave: `col:${c.id}:sem_visita_${d}`, colonia: c.codigo, coloniaId: c.id, texto: `${c.codigo} está há ${d} dias sem visita.`, tipo: "sem_visita" });
        if (lv.rainha === "Suspeita de problema" || lv.rainha === "Não localizada")
          alertas.push({ chave: `col:${c.id}:rainha`, colonia: c.codigo, coloniaId: c.id, texto: `${c.codigo}: rainha precisa ser verificada.`, tipo: "rainha" });
        if (lv.populacao != null && lv.populacao <= 2)
          alertas.push({ chave: `col:${c.id}:populacao`, colonia: c.codigo, coloniaId: c.id, texto: `${c.codigo} está com população baixa.`, tipo: "populacao" });
        if (lv.espaco === "Necessita expansão")
          alertas.push({ chave: `col:${c.id}:espaco`, colonia: c.codigo, coloniaId: c.id, texto: `${c.codigo} necessita de expansão.`, tipo: "espaco" });
        if (lv.problemas && lv.problemas !== "Nenhum" && lv.problemas.trim() !== "")
          alertas.push({ chave: `col:${c.id}:problema:${lv.problemas}`, colonia: c.codigo, coloniaId: c.id, texto: `${c.codigo} possui problema registrado: ${lv.problemas}.`, tipo: "problema" });
      }
      if (c.status === "Atenção" || c.status === "Fraca" || c.status === "Perdida")
        alertas.push({ chave: `col:${c.id}:status:${c.status}`, colonia: c.codigo, coloniaId: c.id, texto: `${c.codigo} está marcada como "${c.status}".`, tipo: "status" });
    }
    for (const l of lembsPend) {
      const atrasado = l.data < today;
      alertas.push({
        chave: `lembrete:${l.id}`,
        colonia: l.coloniaId ? colMap.get(l.coloniaId)?.codigo || "—" : "Geral",
        coloniaId: l.coloniaId,
        texto: `${atrasado ? "⏰ Atrasado: " : "🔔 "}${l.titulo}`,
        tipo: "lembrete",
      });
    }

    // Filtra os alertas que o usuário já dispensou
    const dismissed = await db
      .select()
      .from(notificationDismissals)
      .where(and(eq(notificationDismissals.userId, u.id), eq(notificationDismissals.meliponarioId, id)));
    const dismissedSet = new Set(dismissed.map((d) => d.chave));
    const alertasAtivos = alertas.filter((a) => !dismissedSet.has(a.chave));

    // ------- EVOLUÇÃO (gráfico) -------
    const evolucao = vis
      .filter((v) => v.notaGeral != null)
      .slice()
      .reverse()
      .map((v) => ({ data: v.data, nota: v.notaGeral, coloniaId: v.coloniaId, colonia: colMap.get(v.coloniaId)?.codigo }));

    // ------- DISTRIBUIÇÃO POR STATUS -------
    const statusDist: Record<string, number> = {};
    for (const c of cols) statusDist[c.status] = (statusDist[c.status] || 0) + 1;

    // ------- VISITAS POR MÊS (quantidade, para o gráfico) -------
    const visitasPorMes: Record<string, number> = {};
    for (const v of vis) {
      const mes = v.data.slice(0, 7);
      visitasPorMes[mes] = (visitasPorMes[mes] || 0) + 1;
    }

    return Response.json({
      stats: {
        totalColonias,
        ativas,
        atencao,
        diasVisita,
        ultimaData,
        diasMes: diasMesAtual,
        producaoTotal,
        producoes: prods.length,
        divisoes: divs.length,
        lembretesPendentes: lembsPend.length,
        lembretesAtrasados,
        totalMembros,
        coloniasRecentes,
      },
      recentes,
      alertas: alertasAtivos,
      evolucao,
      statusDist,
      visitasPorMes,
      colonias: cols.map((c) => ({ id: c.id, codigo: c.codigo })),
      ultimasColonias,
      ultimasAtividades,
    });
  } catch (e) {
    return handleError(e);
  }
}

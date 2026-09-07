import { db } from "@/db";
import { colonias, visitas, producoes, divisoes, membros, users, auditorias, meliponarios } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Aggregated data for building reports / Livro de Manejo on the client
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);

    const [meli] = await db.select().from(meliponarios).where(eq(meliponarios.id, id)).limit(1);
    const cols = await db.select().from(colonias).where(and(eq(colonias.meliponarioId, id), isNull(colonias.deletedAt))).orderBy(colonias.codigo);
    const vis = await db.select().from(visitas).where(and(eq(visitas.meliponarioId, id), isNull(visitas.deletedAt))).orderBy(desc(visitas.data));
    const prod = await db.select().from(producoes).where(and(eq(producoes.meliponarioId, id), isNull(producoes.deletedAt))).orderBy(desc(producoes.data));
    const divs = await db.select().from(divisoes).where(eq(divisoes.meliponarioId, id)).orderBy(desc(divisoes.data));
    const team = await db
      .select({ nome: users.nome, email: users.email, funcao: membros.funcao, status: membros.status })
      .from(membros)
      .innerJoin(users, eq(membros.userId, users.id))
      .where(eq(membros.meliponarioId, id));
    const audit = await db.select().from(auditorias).where(eq(auditorias.meliponarioId, id)).orderBy(desc(auditorias.dataHora)).limit(100);

    const colMap = new Map(cols.map((c) => [c.id, c.codigo]));
    const visEnriched = vis.map((v) => ({ ...v, coloniaCodigo: colMap.get(v.coloniaId) || "—" }));
    const prodEnriched = prod.map((p) => ({ ...p, coloniaCodigo: p.coloniaId ? colMap.get(p.coloniaId) || "—" : "—" }));
    const divEnriched = divs.map((d) => ({ ...d, maeCodigo: colMap.get(d.coloniaMaeId) || "—", filhaCodigo: d.coloniaFilhaId ? colMap.get(d.coloniaFilhaId) || "—" : "—" }));

    return Response.json({
      meliponario: meli,
      colonias: cols,
      visitas: visEnriched,
      producoes: prodEnriched,
      divisoes: divEnriched,
      team,
      auditorias: audit,
      resumo: {
        totalColonias: cols.length,
        ativas: cols.filter((c) => c.status === "Ativa" || c.status === "Forte").length,
        visitas: vis.length,
        producaoTotal: prod.reduce((s, p) => s + (p.quantidade || 0), 0),
        divisoes: divs.length,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

import { db } from "@/db";
import { notificationDismissals, colonias, visitas, lembretes } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Gera a lista de notificações a partir do estado atual do meliponário.
// O resultado já vem filtrado pelas que o usuário ainda NÃO dispensou.
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
    const lembs = await db
      .select()
      .from(lembretes)
      .where(and(eq(lembretes.meliponarioId, id), eq(lembretes.status, "pendente")));

    const lastByCol = new Map<number, (typeof vis)[number]>();
    for (const v of vis) if (!lastByCol.has(v.coloniaId)) lastByCol.set(v.coloniaId, v);

    type Notif = { chave: string; coloniaId: number | null; texto: string; tipo: string };
    const items: Notif[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const c of cols) {
      const lv = lastByCol.get(c.id);
      if (!lv) {
        items.push({ chave: `col:${c.id}:sem_visita`, coloniaId: c.id, texto: `${c.codigo} nunca recebeu uma visita.`, tipo: "sem_visita" });
      } else {
        const d = Math.floor((Date.now() - new Date(lv.data + "T00:00:00").getTime()) / 86_400_000);
        if (d >= 30) items.push({ chave: `col:${c.id}:sem_visita_${d}`, coloniaId: c.id, texto: `${c.codigo} está há ${d} dias sem visita.`, tipo: "sem_visita" });
        if (lv.rainha === "Suspeita de problema" || lv.rainha === "Não localizada")
          items.push({ chave: `col:${c.id}:rainha`, coloniaId: c.id, texto: `${c.codigo}: rainha precisa ser verificada.`, tipo: "rainha" });
        if (lv.populacao != null && lv.populacao <= 2)
          items.push({ chave: `col:${c.id}:populacao`, coloniaId: c.id, texto: `${c.codigo} está com população baixa.`, tipo: "populacao" });
        if (lv.espaco === "Necessita expansão")
          items.push({ chave: `col:${c.id}:espaco`, coloniaId: c.id, texto: `${c.codigo} necessita de expansão.`, tipo: "espaco" });
        if (lv.problemas && lv.problemas !== "Nenhum" && lv.problemas.trim() !== "")
          items.push({ chave: `col:${c.id}:problema:${lv.problemas}`, coloniaId: c.id, texto: `${c.codigo} possui problema registrado: ${lv.problemas}.`, tipo: "problema" });
      }
      if (c.status === "Atenção" || c.status === "Fraca" || c.status === "Perdida")
        items.push({ chave: `col:${c.id}:status:${c.status}`, coloniaId: c.id, texto: `${c.codigo} está marcada como "${c.status}".`, tipo: "status" });
    }
    for (const l of lembs) {
      const atrasado = l.data < today;
      items.push({
        chave: `lembrete:${l.id}`,
        coloniaId: l.coloniaId,
        texto: `${atrasado ? "⏰ Atrasado: " : "🔔 "}${l.titulo}${l.coloniaId ? ` (colônia ${l.coloniaId})` : ""}`,
        tipo: "lembrete",
      });
    }

    // Remove as que o usuário dispensou
    const dismissed = await db
      .select()
      .from(notificationDismissals)
      .where(and(eq(notificationDismissals.userId, u.id), eq(notificationDismissals.meliponarioId, id)));
    const dismissedSet = new Set(dismissed.map((d) => d.chave));
    const active = items.filter((i) => !dismissedSet.has(i.chave));

    return Response.json({ notificacoes: active });
  } catch (e) {
    return handleError(e);
  }
}

// Dispensar uma notificação (por chave). Não deleta a regra/registro original.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);
    const { chave } = await req.json();
    if (!chave || typeof chave !== "string") return Response.json({ error: "Chave obrigatória." }, { status: 400 });
    try {
      await db
        .insert(notificationDismissals)
        .values({ userId: u.id, meliponarioId: id, chave });
    } catch {
      // unique violation: already dismissed — ok
    }
    await logAudit({ meliponarioId: id, userId: u.id, userNome: u.nome, acao: "dispensou", entidade: "Notificação", descricao: `Dispensou notificação: ${chave}` });
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

// Reativar uma notificação (excluir a dispensa) — útil para o botão "restaurar"
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);
    const { searchParams } = new URL(req.url);
    const chave = searchParams.get("chave");
    if (!chave) return Response.json({ error: "Chave obrigatória." }, { status: 400 });
    await db
      .delete(notificationDismissals)
      .where(
        and(
          eq(notificationDismissals.userId, u.id),
          eq(notificationDismissals.meliponarioId, id),
          eq(notificationDismissals.chave, chave)
        )
      );
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

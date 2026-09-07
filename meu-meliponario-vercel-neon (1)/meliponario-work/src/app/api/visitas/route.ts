import { db } from "@/db";
import { visitas, colonias } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, requireMember, canEdit } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Create a visit. Responsavel is ALWAYS the logged in user.
export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json();
    const coloniaId = Number(body.coloniaId);
    if (!coloniaId) return Response.json({ error: "Colônia obrigatória." }, { status: 400 });
    const [c] = await db.select().from(colonias).where(eq(colonias.id, coloniaId)).limit(1);
    if (!c) return Response.json({ error: "Colônia não encontrada." }, { status: 404 });
    const m = await requireMember(u.id, c.meliponarioId);
    if (!canEdit(m.funcao)) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const now = new Date();
    const data = body.data || now.toISOString().slice(0, 10);
    const hora = body.hora || now.toTimeString().slice(0, 5);

    const fotos = Array.isArray(body.fotos) ? body.fotos.slice(0, 5) : [];

    const [v] = await db
      .insert(visitas)
      .values({
        coloniaId,
        meliponarioId: c.meliponarioId,
        responsavelId: u.id, // AUTOMATIC
        responsavelNome: u.nome, // AUTOMATIC
        data,
        hora,
        notaGeral: body.notaGeral ?? null,
        populacao: body.populacao ?? null,
        rainha: body.rainha || null,
        postura: body.postura ?? null,
        mel: body.mel ?? null,
        polen: body.polen ?? null,
        espaco: body.espaco || null,
        problemas: Array.isArray(body.problemas) ? body.problemas.join(",") : body.problemas || null,
        manejos: Array.isArray(body.manejos) ? body.manejos.join(",") : body.manejos || null,
        observacoes: body.observacoes || null,
        fotos: JSON.stringify(fotos),
        createdBy: u.id,
      })
      .returning();

    // Sync colony biological snapshot + status from visit
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.rainha) patch.rainha = body.rainha;
    if (body.espaco) patch.espaco = body.espaco;
    if (body.problemas) patch.pragas = Array.isArray(body.problemas) ? body.problemas.join(", ") : body.problemas;
    await db.update(colonias).set(patch).where(eq(colonias.id, coloniaId));

    await logAudit({ meliponarioId: c.meliponarioId, userId: u.id, userNome: u.nome, acao: "registrou", entidade: "Visita", entidadeId: v.id, descricao: `Registrou visita na colônia ${c.codigo}` });
    return Response.json({ visita: v });
  } catch (e) {
    return handleError(e);
  }
}

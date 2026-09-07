import { db } from "@/db";
import { meliponarios, membros } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// User joins with an invite code (creates pending membership)
export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const { codigo } = await req.json();
    const code = String(codigo || "").toUpperCase().trim();
    const [meli] = await db.select().from(meliponarios).where(eq(meliponarios.codigoConvite, code)).limit(1);
    if (!meli) return Response.json({ error: "Código de convite inválido." }, { status: 404 });
    const existing = await db
      .select()
      .from(membros)
      .where(and(eq(membros.userId, u.id), eq(membros.meliponarioId, meli.id)))
      .limit(1);
    if (existing.length) {
      return Response.json({ error: "Você já solicitou ou participa deste meliponário." }, { status: 400 });
    }
    await db.insert(membros).values({
      userId: u.id,
      meliponarioId: meli.id,
      funcao: "VISUALIZADOR",
      status: "pendente",
    });
    return Response.json({ ok: true, meliponario: { id: meli.id, nome: meli.nome } });
  } catch (e) {
    return handleError(e);
  }
}

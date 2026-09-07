import { db } from "@/db";
import { meliponarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    const m = await requireMember(u.id, id);
    const [meli] = await db.select().from(meliponarios).where(eq(meliponarios.id, id)).limit(1);
    if (!meli) return Response.json({ error: "Não encontrado" }, { status: 404 });
    return Response.json({ meliponario: meli, funcao: m.funcao });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id, ["ADMIN"]);
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["nome", "descricao", "localizacao", "cidade", "estado", "pais", "logo", "timezone", "latitude", "longitude"]) {
      if (k in body) patch[k] = body[k];
    }
    await db.update(meliponarios).set(patch).where(eq(meliponarios.id, id));
    await logAudit({ meliponarioId: id, userId: u.id, userNome: u.nome, acao: "atualizou", entidade: "Meliponário", entidadeId: id, descricao: "Atualizou configurações do meliponário" });
    const [meli] = await db.select().from(meliponarios).where(eq(meliponarios.id, id)).limit(1);
    return Response.json({ meliponario: meli });
  } catch (e) {
    return handleError(e);
  }
}

import { db } from "@/db";
import { colonias } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);
    const cols = await db
      .select()
      .from(colonias)
      .where(and(eq(colonias.meliponarioId, id), isNull(colonias.deletedAt)));
    const nodes = cols.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      especie: c.especie,
      status: c.status,
      origem: c.origem,
      dataFormacao: c.dataFormacao,
      maeId: c.coloniaMaeId,
    }));
    return Response.json({ nodes });
  } catch (e) {
    return handleError(e);
  }
}

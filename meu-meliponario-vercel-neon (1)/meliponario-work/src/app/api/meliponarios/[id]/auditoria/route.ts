import { db } from "@/db";
import { auditorias } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id);
    const rows = await db
      .select()
      .from(auditorias)
      .where(eq(auditorias.meliponarioId, id))
      .orderBy(desc(auditorias.dataHora))
      .limit(200);
    return Response.json({ auditorias: rows });
  } catch (e) {
    return handleError(e);
  }
}

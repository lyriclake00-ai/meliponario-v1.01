import { db } from "@/db";
import { visitas, colonias } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
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
      .from(visitas)
      .where(and(eq(visitas.meliponarioId, id), isNull(visitas.deletedAt)));
    return Response.json({ visitas: rows });
  } catch (e) {
    return handleError(e);
  }
}

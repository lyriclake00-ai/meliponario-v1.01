import { db } from "@/db";
import { meliponarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, requireMember } from "@/lib/auth";
import { handleError, genConvite } from "@/lib/api";

export const dynamic = "force-dynamic";

// Regenerate invite code
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const id = Number((await params).id);
    await requireMember(u.id, id, ["ADMIN"]);
    const code = genConvite();
    await db.update(meliponarios).set({ codigoConvite: code }).where(eq(meliponarios.id, id));
    return Response.json({ codigoConvite: code });
  } catch (e) {
    return handleError(e);
  }
}

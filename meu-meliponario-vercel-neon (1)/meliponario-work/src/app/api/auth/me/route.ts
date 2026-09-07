import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const u = await getCurrentUser();
    if (!u) return Response.json({ user: null });
    const [full] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    if (!full) return Response.json({ user: null });
    return Response.json({
      user: {
        id: full.id,
        nome: full.nome,
        email: full.email,
        telefone: full.telefone,
        foto: full.foto,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Simplified password recovery: returns a reset token (in real app, emailed).
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const emailNorm = String(email || "").toLowerCase().trim();
    const [u] = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    if (!u) {
      // Do not reveal existence
      return Response.json({ ok: true, message: "Se o e-mail existir, um código foi gerado." });
    }
    const token = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expira = new Date(Date.now() + 1000 * 60 * 30);
    await db.update(users).set({ resetToken: token, resetTokenExpira: expira }).where(eq(users.id, u.id));
    return Response.json({
      ok: true,
      message: "Código de recuperação gerado.",
      token, // returned directly since no email service configured
    });
  } catch (e) {
    return handleError(e);
  }
}

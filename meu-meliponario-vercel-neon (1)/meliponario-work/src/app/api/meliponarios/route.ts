import { db } from "@/db";
import { meliponarios, membros } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { handleError, genConvite } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// List meliponarios the user is an active member of
export async function GET() {
  try {
    const u = await requireUser();
    const memberRows = await db
      .select()
      .from(membros)
      .where(and(eq(membros.userId, u.id), eq(membros.status, "ativo")));
    const ids = memberRows.map((m) => m.meliponarioId);
    if (!ids.length) return Response.json({ meliponarios: [] });
    const melis = await db.select().from(meliponarios).where(inArray(meliponarios.id, ids));
    const result = melis.map((m) => ({
      ...m,
      funcao: memberRows.find((mr) => mr.meliponarioId === m.id)?.funcao,
    }));
    return Response.json({ meliponarios: result });
  } catch (e) {
    return handleError(e);
  }
}

// Create meliponario (user becomes ADMIN)
export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json();
    if (!body.nome) return Response.json({ error: "Informe o nome." }, { status: 400 });
    const [m] = await db
      .insert(meliponarios)
      .values({
        nome: body.nome,
        descricao: body.descricao || null,
        proprietarioId: u.id,
        localizacao: body.localizacao || null,
        cidade: body.cidade || null,
        estado: body.estado || null,
        pais: body.pais || "Brasil",
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        logo: body.logo || null,
        codigoConvite: genConvite(),
      })
      .returning();
    await db.insert(membros).values({
      userId: u.id,
      meliponarioId: m.id,
      funcao: "ADMIN",
      status: "ativo",
    });
    await logAudit({
      meliponarioId: m.id,
      userId: u.id,
      userNome: u.nome,
      acao: "criou",
      entidade: "Meliponário",
      entidadeId: m.id,
      descricao: `Criou o meliponário ${m.nome}`,
    });
    return Response.json({ meliponario: m });
  } catch (e) {
    return handleError(e);
  }
}

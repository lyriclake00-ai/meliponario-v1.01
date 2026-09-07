import { db } from "@/db";
import { auditorias } from "@/db/schema";

export async function logAudit(params: {
  meliponarioId?: number | null;
  userId?: number | null;
  userNome?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: number | null;
  descricao?: string | null;
}) {
  try {
    await db.insert(auditorias).values({
      meliponarioId: params.meliponarioId ?? null,
      userId: params.userId ?? null,
      userNome: params.userNome ?? null,
      acao: params.acao,
      entidade: params.entidade,
      entidadeId: params.entidadeId ?? null,
      descricao: params.descricao ?? null,
    });
  } catch {
    // never block main flow due to audit failure
  }
}

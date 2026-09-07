import { AuthError, ForbiddenError } from "./auth";

export function handleError(e: unknown) {
  if (e instanceof AuthError) {
    return Response.json({ error: e.message || "Não autenticado" }, { status: 401 });
  }
  if (e instanceof ForbiddenError) {
    return Response.json({ error: e.message || "Sem permissão" }, { status: 403 });
  }
  const msg = e instanceof Error ? e.message : "Erro inesperado";
  return Response.json({ error: msg }, { status: 400 });
}

export function genConvite() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MELI-${s}`;
}

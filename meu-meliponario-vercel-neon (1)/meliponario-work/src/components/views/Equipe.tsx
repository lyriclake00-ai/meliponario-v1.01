"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Badge } from "../ui";
import { useToast } from "../useToast";

type Membro = { id: number; userId: number; funcao: string; status: string; nome: string; email: string; foto: string | null; ultimoAcesso: string | null };

export default function Equipe() {
  const { current, user } = useApp();
  const { show, node } = useToast();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = current?.funcao === "ADMIN";

  const load = () => {
    if (!current) return;
    setLoading(true);
    api<{ membros: Membro[] }>(`/api/meliponarios/${current.id}/membros`).then((r) => { setMembros(r.membros); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [current]);

  async function update(m: Membro, patch: { funcao?: string; status?: string }) {
    try {
      await api(`/api/meliponarios/${current!.id}/membros`, { method: "PUT", body: JSON.stringify({ membroId: m.id, ...patch }) });
      show("Atualizado!", "ok"); load();
    } catch (e) { show(e instanceof Error ? e.message : "Erro", "err"); }
  }
  async function remove(m: Membro) {
    if (!confirm(`Remover ${m.nome} da equipe?`)) return;
    await api(`/api/meliponarios/${current!.id}/membros?membroId=${m.id}`, { method: "DELETE" });
    show("Removido.", "ok"); load();
  }
  async function regenCode() {
    const r = await api<{ codigoConvite: string }>(`/api/meliponarios/${current!.id}/convite`, { method: "POST" });
    show(`Novo código: ${r.codigoConvite}`, "ok");
    location.reload();
  }

  if (loading) return <Spinner />;
  const roleColor: Record<string, string> = { ADMIN: "bg-melidark text-white", MANEJADOR: "bg-melilight text-melidark", VISUALIZADOR: "bg-gray-200 text-gray-700" };
  const pendentes = membros.filter((m) => m.status === "pendente");
  const ativos = membros.filter((m) => m.status === "ativo");

  return (
    <div className="space-y-5 fade-in">
      {node}
      <h1 className="text-2xl font-extrabold text-melidark">Equipe do Meliponário</h1>

      {isAdmin && (
        <div className="card p-5">
          <p className="text-xs font-bold uppercase text-melimid">Código de convite</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl font-extrabold tracking-widest text-melidark">{current?.codigoConvite || "—"}</div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(current?.codigoConvite || ""); show("Copiado!", "ok"); }} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold">Copiar</button>
              <button onClick={regenCode} className="btn-honey rounded-xl px-3 py-2 text-sm font-bold">Gerar novo</button>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">Compartilhe este código para novos membros solicitarem entrada.</p>
        </div>
      )}

      {isAdmin && pendentes.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-bold text-melidark">Solicitações pendentes</h2>
          <div className="space-y-2">
            {pendentes.map((m) => (
              <div key={m.id} className="card flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-melibg font-bold text-melidark">{m.nome[0]}</div>
                <div className="flex-1"><div className="font-bold text-melidark">{m.nome}</div><div className="text-sm text-gray-500">{m.email}</div></div>
                <button onClick={() => update(m, { status: "ativo" })} className="rounded-xl bg-melimid px-3 py-1.5 text-sm font-bold text-white">Aceitar</button>
                <button onClick={() => remove(m)} className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-500">Recusar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-bold text-melidark">Membros ({ativos.length})</h2>
        <div className="space-y-2">
          {ativos.map((m) => (
            <div key={m.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-melibg font-bold text-melidark">
                {m.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.foto} alt="" className="h-full w-full object-cover" />
                ) : m.nome[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-melidark">{m.nome} {m.userId === user?.id && <span className="text-xs text-gray-400">(você)</span>}</div>
                <div className="text-sm text-gray-500">{m.email}</div>
                <div className="text-xs text-gray-400">Últ. acesso: {m.ultimoAcesso ? new Date(m.ultimoAcesso).toLocaleDateString("pt-BR") : "—"}</div>
              </div>
              {isAdmin && m.userId !== user?.id ? (
                <div className="flex items-center gap-2">
                  <select value={m.funcao} onChange={(e) => update(m, { funcao: e.target.value })} className="rounded-lg border border-gray-200 px-2 py-1 text-sm">
                    <option>ADMIN</option><option>MANEJADOR</option><option>VISUALIZADOR</option>
                  </select>
                  <button onClick={() => remove(m)} className="text-red-400">🗑</button>
                </div>
              ) : (
                <Badge className={roleColor[m.funcao]}>{m.funcao}</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

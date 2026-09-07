"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Empty } from "../ui";

type A = { id: number; userNome: string | null; acao: string; entidade: string; descricao: string | null; dataHora: string };

export default function Auditoria({ onBack }: { onBack: () => void }) {
  const { current } = useApp();
  const [items, setItems] = useState<A[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!current) return;
    api<{ auditorias: A[] }>(`/api/meliponarios/${current.id}/auditoria`).then((r) => { setItems(r.auditorias); setLoading(false); }).catch(() => setLoading(false));
  }, [current]);
  if (loading) return <Spinner />;
  return (
    <div className="space-y-4 fade-in">
      <button onClick={onBack} className="text-sm font-semibold text-melimid">‹ Voltar</button>
      <h1 className="text-2xl font-extrabold text-melidark">Histórico de auditoria</h1>
      {items.length === 0 ? <Empty title="Nenhuma alteração registrada." /> : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="text-xs text-gray-400">{new Date(a.dataHora).toLocaleString("pt-BR")}</div>
              <div className="font-semibold text-melidark">{a.userNome || "Sistema"}</div>
              <div className="text-sm text-gray-600">{a.descricao || `${a.acao} ${a.entidade}`}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

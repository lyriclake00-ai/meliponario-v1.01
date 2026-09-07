"use client";

import { useEffect, useMemo, useState } from "react";
import { api, STATUS_COLORS, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Badge, Modal, Empty } from "../ui";
import ColoniaForm from "../ColoniaForm";
import { useToast } from "../useToast";

type Col = {
  id: number; codigo: string; nome: string | null; especie: string | null; status: string; localizacao: string | null;
  ultimaVisita: { data: string; nota: number | null; responsavel: string | null } | null;
};

export default function Colonias({ onOpen }: { onOpen: (id: number) => void }) {
  const { current } = useApp();
  const { show, node } = useToast();
  const [cols, setCols] = useState<Col[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [sort, setSort] = useState("recent");
  const [showNew, setShowNew] = useState(false);

  const canEdit = current?.funcao === "ADMIN" || current?.funcao === "MANEJADOR";

  const load = () => {
    if (!current) return;
    setLoading(true);
    api<{ colonias: Col[] }>(`/api/meliponarios/${current.id}/colonias`).then((r) => { setCols(r.colonias); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [current]);

  const filtered = useMemo(() => {
    let list = cols.filter((c) =>
      (c.codigo + " " + (c.nome || "") + " " + (c.especie || "")).toLowerCase().includes(q.toLowerCase())
    );
    if (statusF !== "all") list = list.filter((c) => c.status === statusF);
    if (sort === "code") list = [...list].sort((a, b) => a.codigo.localeCompare(b.codigo));
    if (sort === "status") list = [...list].sort((a, b) => a.status.localeCompare(b.status));
    return list;
  }, [cols, q, statusF, sort]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4 fade-in">
      {node}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-melidark">Colônias</h1>
        {canEdit && (
          <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold shadow">+ Nova colônia</button>
        )}
      </div>

      <div className="card space-y-3 p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Pesquisar por código, nome, espécie..." className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm" />
        <div className="flex gap-2">
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="all">Todos status</option>
            {["Ativa", "Forte", "Atenção", "Fraca", "Inativa", "Perdida"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="recent">Mais recentes</option>
            <option value="code">Por código</option>
            <option value="status">Por status</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty title="Nenhuma colônia encontrada." action={canEdit ? <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-bold">+ Cadastrar primeira colônia</button> : undefined} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => onOpen(c.id)} className="card p-4 text-left hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-extrabold text-melidark">{c.codigo}</div>
                  {c.nome && <div className="text-sm text-gray-500">{c.nome}</div>}
                </div>
                <Badge className={STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}>{c.status}</Badge>
              </div>
              <div className="mt-2 text-sm text-gray-500">{c.especie || "Espécie não informada"}</div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                <span>Últ. visita: {c.ultimaVisita ? fmtDate(c.ultimaVisita.data) : "—"}</span>
                {c.ultimaVisita?.nota != null && <span className="rounded-full bg-melibg px-2 py-0.5 font-bold text-melidark">Nota {c.ultimaVisita.nota}</span>}
              </div>
              {c.ultimaVisita?.responsavel && <div className="mt-1 text-xs text-gray-400">por {c.ultimaVisita.responsavel}</div>}
            </button>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova colônia" wide>
        {current && (
          <ColoniaForm
            meliponarioId={current.id}
            onSaved={() => { setShowNew(false); show("Colônia cadastrada com sucesso!", "ok"); load(); }}
            onError={(m) => show(m, "err")}
          />
        )}
      </Modal>
    </div>
  );
}

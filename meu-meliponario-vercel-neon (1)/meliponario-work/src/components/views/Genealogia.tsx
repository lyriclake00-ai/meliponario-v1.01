"use client";

import { useEffect, useMemo, useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Modal, Field, inputCls, Empty } from "../ui";
import { useToast } from "../useToast";

type Node = { id: number; codigo: string; especie: string | null; status: string; origem: string | null; dataFormacao: string | null; maeId: number | null };
type Div = { id: number; coloniaMaeId: number; coloniaFilhaId: number | null; data: string; observacoes: string | null; responsavelNome: string | null; maeCodigo: string | null; filhaCodigo: string | null };

export default function Genealogia({ onOpenColonia }: { onOpenColonia: (id: number) => void }) {
  const { current } = useApp();
  const { show, node } = useToast();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [divs, setDivs] = useState<Div[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const canEdit = current?.funcao === "ADMIN" || current?.funcao === "MANEJADOR";

  const load = () => {
    if (!current) return;
    setLoading(true);
    Promise.all([
      api<{ nodes: Node[] }>(`/api/meliponarios/${current.id}/genealogia`),
      api<{ divisoes: Div[] }>(`/api/meliponarios/${current.id}/divisoes`),
    ]).then(([g, d]) => { setNodes(g.nodes); setDivs(d.divisoes); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [current]);

  const roots = useMemo(() => nodes.filter((n) => !n.maeId || !nodes.some((x) => x.id === n.maeId)), [nodes]);
  const childrenOf = (id: number) => nodes.filter((n) => n.maeId === id);

  if (loading) return <Spinner />;

  const renderTree = (n: Node, depth: number): React.ReactNode => {
    const kids = childrenOf(n.id);
    return (
      <div key={n.id} style={{ marginLeft: depth * 18 }}>
        <button onClick={() => onOpenColonia(n.id)} className="my-1 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-left shadow-sm hover:shadow">
          <span className="text-melimid">{depth > 0 ? "└─" : "🌳"}</span>
          <span className="font-bold text-melidark">{n.codigo}</span>
          <span className="text-xs text-gray-400">{n.especie}</span>
        </button>
        {kids.map((k) => renderTree(k, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-5 fade-in">
      {node}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-melidark">Genealogia & Divisões</h1>
        {canEdit && <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold shadow">+ Divisão</button>}
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-bold text-melidark">Árvore de colônias</h3>
        {nodes.length === 0 ? <p className="text-sm text-gray-400">Nenhuma colônia.</p> : roots.map((r) => renderTree(r, 0))}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-bold text-melidark">Registro de divisões ({divs.length})</h3>
        {divs.length === 0 ? (
          <Empty title="Nenhuma divisão registrada." />
        ) : (
          <div className="space-y-2">
            {divs.map((d) => (
              <div key={d.id} className="card p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-melidark">
                  <span className="rounded-full bg-melibg px-2 py-0.5">{d.maeCodigo}</span>
                  <span className="text-melimid">→</span>
                  <span className="rounded-full bg-melihoney/20 px-2 py-0.5 text-meliamber">{d.filhaCodigo || "Nova"}</span>
                </div>
                <div className="mt-1 text-sm text-gray-500">{fmtDate(d.data)} · por {d.responsavelNome}</div>
                {d.observacoes && <p className="mt-1 text-sm text-gray-500">{d.observacoes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Registrar divisão">
        <DivForm nodes={nodes} meliId={current!.id} onSaved={() => { setShowNew(false); show("Divisão registrada!", "ok"); load(); }} onError={(m) => show(m, "err")} />
      </Modal>
    </div>
  );
}

function DivForm({ nodes, meliId, onSaved, onError }: { nodes: Node[]; meliId: number; onSaved: () => void; onError: (m: string) => void }) {
  const [maeId, setMaeId] = useState("");
  const [mode, setMode] = useState<"nova" | "existente">("nova");
  const [novaCodigo, setNovaCodigo] = useState("");
  const [filhaId, setFilhaId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!maeId) return onError("Selecione a colônia mãe.");
    setSaving(true);
    try {
      await api(`/api/meliponarios/${meliId}/divisoes`, {
        method: "POST",
        body: JSON.stringify({
          coloniaMaeId: Number(maeId),
          novaColoniaCodigo: mode === "nova" ? novaCodigo : undefined,
          coloniaFilhaId: mode === "existente" && filhaId ? Number(filhaId) : undefined,
          data, observacoes: obs,
        }),
      });
      onSaved();
    } catch (e) { onError(e instanceof Error ? e.message : "Erro"); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <Field label="Colônia mãe *">
        <select className={inputCls} value={maeId} onChange={(e) => setMaeId(e.target.value)}><option value="">Selecione</option>{nodes.map((n) => <option key={n.id} value={n.id}>{n.codigo}</option>)}</select>
      </Field>
      <div className="flex rounded-xl bg-melibg p-1">
        <button onClick={() => setMode("nova")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "nova" ? "bg-white text-melidark shadow" : "text-gray-500"}`}>Criar nova colônia</button>
        <button onClick={() => setMode("existente")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "existente" ? "bg-white text-melidark shadow" : "text-gray-500"}`}>Vincular existente</button>
      </div>
      {mode === "nova" ? (
        <Field label="Código da nova colônia (filha)"><input className={inputCls} value={novaCodigo} onChange={(e) => setNovaCodigo(e.target.value)} placeholder="RN020" /></Field>
      ) : (
        <Field label="Colônia filha"><select className={inputCls} value={filhaId} onChange={(e) => setFilhaId(e.target.value)}><option value="">Selecione</option>{nodes.filter((n) => String(n.id) !== maeId).map((n) => <option key={n.id} value={n.id}>{n.codigo}</option>)}</select></Field>
      )}
      <Field label="Data"><input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} /></Field>
      <Field label="Observações"><textarea className={inputCls} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
      <button onClick={save} disabled={saving} className="btn-primary w-full rounded-xl py-3 font-bold disabled:opacity-60">{saving ? "Salvando..." : "Registrar divisão"}</button>
    </div>
  );
}

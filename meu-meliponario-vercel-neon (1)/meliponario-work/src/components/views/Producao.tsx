"use client";

import { useEffect, useMemo, useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Modal, Field, inputCls, Empty } from "../ui";
import { BarChartSimple } from "../Charts";
import { useToast } from "../useToast";

type Prod = { id: number; coloniaId: number | null; coloniaCodigo: string | null; produto: string; quantidade: number; unidade: string; data: string; responsavelNome: string | null; observacoes: string | null };
type Col = { id: number; codigo: string };

export default function Producao() {
  const { current } = useApp();
  const { show, node } = useToast();
  const [prods, setProds] = useState<Prod[]>([]);
  const [cols, setCols] = useState<Col[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const canEdit = current?.funcao === "ADMIN" || current?.funcao === "MANEJADOR";

  const load = () => {
    if (!current) return;
    setLoading(true);
    Promise.all([
      api<{ producoes: Prod[] }>(`/api/meliponarios/${current.id}/producao`),
      api<{ colonias: Col[] }>(`/api/meliponarios/${current.id}/colonias`),
    ]).then(([p, c]) => { setProds(p.producoes); setCols(c.colonias); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [current]);

  const porMes = useMemo(() => {
    const map: Record<string, number> = {};
    prods.forEach((p) => { const m = p.data.slice(0, 7); map[m] = (map[m] || 0) + p.quantidade; });
    return Object.entries(map).sort().map(([nome, valor]) => ({ nome: nome.slice(5), valor: Math.round(valor) }));
  }, [prods]);
  const porColonia = useMemo(() => {
    const map: Record<string, number> = {};
    prods.forEach((p) => { const k = p.coloniaCodigo || "Geral"; map[k] = (map[k] || 0) + p.quantidade; });
    return Object.entries(map).map(([nome, valor]) => ({ nome, valor: Math.round(valor) }));
  }, [prods]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5 fade-in">
      {node}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-melidark">Produção</h1>
        {canEdit && <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold shadow">+ Registrar</button>}
      </div>

      {prods.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4"><h3 className="mb-2 font-bold text-melidark">Produção por mês</h3><BarChartSimple data={porMes} /></div>
          <div className="card p-4"><h3 className="mb-2 font-bold text-melidark">Produção por colônia</h3><BarChartSimple data={porColonia} color="#f4b400" /></div>
        </div>
      )}

      {prods.length === 0 ? (
        <Empty title="Nenhuma produção registrada." action={canEdit ? <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-bold">+ Registrar produção</button> : undefined} />
      ) : (
        <div className="space-y-2">
          {prods.map((p) => (
            <div key={p.id} className="card flex items-center gap-3 p-4">
              <div className="text-2xl">{p.produto === "mel" ? "🍯" : p.produto === "polen" ? "🌼" : p.produto === "propolis" ? "🟤" : "📦"}</div>
              <div className="flex-1">
                <div className="font-bold text-melidark">{p.quantidade}{p.unidade} de {p.produto}</div>
                <div className="text-sm text-gray-500">{p.coloniaCodigo || "Geral"} · {fmtDate(p.data)} · {p.responsavelNome}</div>
              </div>
              {canEdit && <button onClick={async () => { if (confirm("Excluir?")) { await api(`/api/producao/${p.id}`, { method: "DELETE" }); show("Excluído.", "ok"); load(); } }} className="text-red-400">🗑</button>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Registrar produção">
        <ProdForm cols={cols} onSaved={() => { setShowNew(false); show("Produção registrada!", "ok"); load(); }} onError={(m) => show(m, "err")} meliId={current!.id} />
      </Modal>
    </div>
  );
}

function ProdForm({ cols, meliId, onSaved, onError }: { cols: Col[]; meliId: number; onSaved: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ produto: "mel", quantidade: "", unidade: "g", data: new Date().toISOString().slice(0, 10), coloniaId: "", observacoes: "" });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.quantidade) return onError("Informe a quantidade.");
    setSaving(true);
    try {
      await api(`/api/meliponarios/${meliId}/producao`, { method: "POST", body: JSON.stringify({ ...f, coloniaId: f.coloniaId ? Number(f.coloniaId) : null, quantidade: Number(f.quantidade) }) });
      onSaved();
    } catch (e) { onError(e instanceof Error ? e.message : "Erro"); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <Field label="Produto">
        <select className={inputCls} value={f.produto} onChange={(e) => setF({ ...f, produto: e.target.value })}>
          <option value="mel">Mel</option><option value="polen">Pólen</option><option value="propolis">Própolis</option><option value="outros">Outros</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade"><input type="number" step="0.1" className={inputCls} value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></Field>
        <Field label="Unidade"><select className={inputCls} value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })}><option>g</option><option>kg</option><option>ml</option><option>L</option><option>un</option></select></Field>
      </div>
      <Field label="Colônia (opcional)">
        <select className={inputCls} value={f.coloniaId} onChange={(e) => setF({ ...f, coloniaId: e.target.value })}><option value="">Geral</option>{cols.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}</select>
      </Field>
      <Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
      <Field label="Observações"><textarea className={inputCls} rows={2} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></Field>
      <button onClick={save} disabled={saving} className="btn-primary w-full rounded-xl py-3 font-bold disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
    </div>
  );
}

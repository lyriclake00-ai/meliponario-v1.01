"use client";

import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Modal, Field, inputCls, Empty, Badge } from "../ui";
import { useToast } from "../useToast";

type Lembrete = { id: number; tipo: string; titulo: string; descricao: string | null; data: string; prioridade: string; status: string; coloniaId: number | null; coloniaCodigo: string | null; atrasado: boolean };
type Col = { id: number; codigo: string };

const TIPOS = ["próxima inspeção", "alimentação", "expansão", "tratamento", "divisão", "coleta", "manutenção"];

export default function Lembretes() {
  const { current } = useApp();
  const { show, node } = useToast();
  const [items, setItems] = useState<Lembrete[]>([]);
  const [cols, setCols] = useState<Col[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const canEdit = current?.funcao === "ADMIN" || current?.funcao === "MANEJADOR";

  const load = () => {
    if (!current) return;
    setLoading(true);
    Promise.all([
      api<{ lembretes: Lembrete[] }>(`/api/meliponarios/${current.id}/lembretes`),
      api<{ colonias: Col[] }>(`/api/meliponarios/${current.id}/colonias`),
    ]).then(([l, c]) => { setItems(l.lembretes); setCols(c.colonias); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [current]);

  async function toggle(l: Lembrete) {
    await api(`/api/lembretes/${l.id}`, { method: "PUT", body: JSON.stringify({ status: l.status === "concluído" ? "pendente" : "concluído" }) });
    load();
  }
  async function del(id: number) {
    if (!confirm("Excluir lembrete?")) return;
    await api(`/api/lembretes/${id}`, { method: "DELETE" });
    show("Excluído.", "ok"); load();
  }

  if (loading) return <Spinner />;
  const pri: Record<string, string> = { alta: "bg-red-100 text-red-700", media: "bg-amber-100 text-amber-700", baixa: "bg-gray-100 text-gray-600" };

  return (
    <div className="space-y-5 fade-in">
      {node}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-melidark">Lembretes</h1>
        {canEdit && <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold shadow">+ Novo</button>}
      </div>

      {items.length === 0 ? (
        <Empty title="Nenhum lembrete." action={canEdit ? <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-bold">+ Criar lembrete</button> : undefined} />
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <div key={l.id} className={`card flex items-center gap-3 p-4 ${l.status === "concluído" ? "opacity-60" : ""}`}>
              {canEdit && (
                <button onClick={() => toggle(l)} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${l.status === "concluído" ? "border-melimid bg-melimid text-white" : "border-gray-300"}`}>{l.status === "concluído" && "✓"}</button>
              )}
              <div className="flex-1">
                <div className={`font-bold text-melidark ${l.status === "concluído" ? "line-through" : ""}`}>{l.titulo}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{l.tipo}</span>
                  <span>· {fmtDate(l.data)}</span>
                  {l.coloniaCodigo && <span>· {l.coloniaCodigo}</span>}
                  {l.atrasado && l.status === "pendente" && <Badge className="bg-red-100 text-red-700">Atrasado</Badge>}
                </div>
                {l.descricao && <p className="mt-1 text-sm text-gray-500">{l.descricao}</p>}
              </div>
              <Badge className={pri[l.prioridade] || pri.media}>{l.prioridade}</Badge>
              {canEdit && <button onClick={() => del(l.id)} className="text-red-400">🗑</button>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Novo lembrete">
        <LembForm cols={cols} meliId={current!.id} onSaved={() => { setShowNew(false); show("Lembrete criado!", "ok"); load(); }} onError={(m) => show(m, "err")} />
      </Modal>
    </div>
  );
}

function LembForm({ cols, meliId, onSaved, onError }: { cols: Col[]; meliId: number; onSaved: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ titulo: "", tipo: TIPOS[0], data: new Date().toISOString().slice(0, 10), prioridade: "media", coloniaId: "", descricao: "" });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.titulo) return onError("Informe o título.");
    setSaving(true);
    try {
      await api(`/api/meliponarios/${meliId}/lembretes`, { method: "POST", body: JSON.stringify({ ...f, coloniaId: f.coloniaId ? Number(f.coloniaId) : null }) });
      onSaved();
    } catch (e) { onError(e instanceof Error ? e.message : "Erro"); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <Field label="Título *"><input className={inputCls} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo"><select className={inputCls} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Prioridade"><select className={inputCls} value={f.prioridade} onChange={(e) => setF({ ...f, prioridade: e.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
        <Field label="Colônia"><select className={inputCls} value={f.coloniaId} onChange={(e) => setF({ ...f, coloniaId: e.target.value })}><option value="">Geral</option>{cols.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}</select></Field>
      </div>
      <Field label="Descrição"><textarea className={inputCls} rows={2} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Field>
      <button onClick={save} disabled={saving} className="btn-primary w-full rounded-xl py-3 font-bold disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
    </div>
  );
}

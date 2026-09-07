"use client";

import { useState } from "react";
import { api, fileToDataUrl } from "@/lib/client";
import { Field, inputCls } from "./ui";

const STATUS = ["Ativa", "Atenção", "Fraca", "Forte", "Inativa", "Perdida"];

type ColoniaData = {
  id?: number;
  codigo?: string;
  nome?: string | null;
  especie?: string | null;
  origem?: string | null;
  dataAquisicao?: string | null;
  dataFormacao?: string | null;
  localizacao?: string | null;
  tipoCaixa?: string | null;
  status?: string;
  rainha?: string | null;
  populacao?: string | null;
  postura?: string | null;
  mel?: string | null;
  polen?: string | null;
  espaco?: string | null;
  pragas?: string | null;
  umidade?: string | null;
  observacoes?: string | null;
  fotoPrincipal?: string | null;
};

export default function ColoniaForm({
  meliponarioId,
  existing,
  onSaved,
  onError,
}: {
  meliponarioId: number;
  existing?: ColoniaData;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [f, setF] = useState<ColoniaData>({
    status: "Ativa",
    ...existing,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof ColoniaData, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onFoto(files: FileList | null) {
    if (!files?.[0]) return;
    const url = await fileToDataUrl(files[0]);
    setF((p) => ({ ...p, fotoPrincipal: url }));
  }

  async function save() {
    if (!f.codigo) return onError("Código é obrigatório.");
    setSaving(true);
    try {
      if (existing?.id) {
        await api(`/api/colonias/${existing.id}`, { method: "PUT", body: JSON.stringify(f) });
      } else {
        await api(`/api/meliponarios/${meliponarioId}/colonias`, { method: "POST", body: JSON.stringify(f) });
      }
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 text-2xl text-gray-400 hover:border-melimid">
          {f.fotoPrincipal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.fotoPrincipal} alt="" className="h-full w-full object-cover" />
          ) : (
            "📷"
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFoto(e.target.files)} />
        </label>
        <p className="text-sm text-gray-500">Foto principal da colônia (opcional)</p>
      </div>

      <p className="pt-2 text-xs font-bold uppercase tracking-wide text-melimid">Identificação</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código *">
          <input className={inputCls} value={f.codigo || ""} onChange={(e) => set("codigo", e.target.value)} placeholder="RN012" />
        </Field>
        <Field label="Nome / Apelido">
          <input className={inputCls} value={f.nome || ""} onChange={(e) => set("nome", e.target.value)} placeholder="Jataí Matriz" />
        </Field>
      </div>

      <p className="pt-2 text-xs font-bold uppercase tracking-wide text-melimid">Informações</p>
      <Field label="Espécie">
        <input className={inputCls} value={f.especie || ""} onChange={(e) => set("especie", e.target.value)} placeholder="Tetragonisca angustula (Jataí)" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Origem">
          <input className={inputCls} value={f.origem || ""} onChange={(e) => set("origem", e.target.value)} placeholder="Aquisição / Resgate" />
        </Field>
        <Field label="Caixa / Modelo">
          <input className={inputCls} value={f.tipoCaixa || ""} onChange={(e) => set("tipoCaixa", e.target.value)} placeholder="INPA" />
        </Field>
        <Field label="Data de aquisição">
          <input type="date" className={inputCls} value={f.dataAquisicao || ""} onChange={(e) => set("dataAquisicao", e.target.value)} />
        </Field>
        <Field label="Data de formação">
          <input type="date" className={inputCls} value={f.dataFormacao || ""} onChange={(e) => set("dataFormacao", e.target.value)} />
        </Field>
      </div>
      <Field label="Localização">
        <input className={inputCls} value={f.localizacao || ""} onChange={(e) => set("localizacao", e.target.value)} />
      </Field>

      <p className="pt-2 text-xs font-bold uppercase tracking-wide text-melimid">Informações biológicas</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rainha"><input className={inputCls} value={f.rainha || ""} onChange={(e) => set("rainha", e.target.value)} /></Field>
        <Field label="População"><input className={inputCls} value={f.populacao || ""} onChange={(e) => set("populacao", e.target.value)} /></Field>
        <Field label="Postura / Cria"><input className={inputCls} value={f.postura || ""} onChange={(e) => set("postura", e.target.value)} /></Field>
        <Field label="Reserva de mel"><input className={inputCls} value={f.mel || ""} onChange={(e) => set("mel", e.target.value)} /></Field>
        <Field label="Reserva de pólen"><input className={inputCls} value={f.polen || ""} onChange={(e) => set("polen", e.target.value)} /></Field>
        <Field label="Espaço disponível"><input className={inputCls} value={f.espaco || ""} onChange={(e) => set("espaco", e.target.value)} /></Field>
        <Field label="Pragas"><input className={inputCls} value={f.pragas || ""} onChange={(e) => set("pragas", e.target.value)} /></Field>
        <Field label="Umidade"><input className={inputCls} value={f.umidade || ""} onChange={(e) => set("umidade", e.target.value)} /></Field>
      </div>

      <Field label="Status">
        <select className={inputCls} value={f.status || "Ativa"} onChange={(e) => set("status", e.target.value)}>
          {STATUS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Observações">
        <textarea className={inputCls} rows={2} value={f.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} />
      </Field>

      <button onClick={save} disabled={saving} className="btn-primary w-full rounded-xl py-3 font-bold disabled:opacity-60">
        {saving ? "Salvando..." : existing?.id ? "Salvar alterações" : "Cadastrar colônia"}
      </button>
    </div>
  );
}

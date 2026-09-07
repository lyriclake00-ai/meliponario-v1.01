"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "../AppContext";
import { Field, inputCls } from "../ui";
import { useToast } from "../useToast";

export default function Config({ onCreateNew, onGoAuditoria }: { onCreateNew: () => void; onGoAuditoria: () => void }) {
  const { current, refreshMelis } = useApp();
  const { show, node } = useToast();
  const isAdmin = current?.funcao === "ADMIN";
  const [f, setF] = useState({
    nome: current?.nome || "", descricao: current?.descricao || "", cidade: current?.cidade || "",
    estado: current?.estado || "", localizacao: current?.localizacao || "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/meliponarios/${current!.id}`, { method: "PUT", body: JSON.stringify(f) });
      await refreshMelis();
      show("Configurações salvas!", "ok");
    } catch (e) { show(e instanceof Error ? e.message : "Erro", "err"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 fade-in">
      {node}
      <h1 className="text-2xl font-extrabold text-melidark">Configurações</h1>

      <div className="card p-5">
        <h3 className="mb-3 font-bold text-melidark">Meliponário</h3>
        {isAdmin ? (
          <div className="space-y-4">
            <Field label="Nome"><input className={inputCls} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
            <Field label="Descrição"><textarea className={inputCls} rows={2} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade"><input className={inputCls} value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></Field>
              <Field label="Estado"><input className={inputCls} value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })} /></Field>
            </div>
            <Field label="Localização"><input className={inputCls} value={f.localizacao} onChange={(e) => setF({ ...f, localizacao: e.target.value })} /></Field>
            <button onClick={save} disabled={saving} className="btn-primary w-full rounded-xl py-3 font-bold disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Apenas administradores podem editar as configurações do meliponário.</p>
        )}
      </div>

      <div className="card divide-y divide-gray-100">
        <button onClick={onGoAuditoria} className="flex w-full items-center justify-between p-4 text-left"><span className="font-semibold text-melidark">📜 Histórico de auditoria</span><span className="text-gray-300">›</span></button>
        <button onClick={onCreateNew} className="flex w-full items-center justify-between p-4 text-left"><span className="font-semibold text-melidark">➕ Criar / entrar em outro meliponário</span><span className="text-gray-300">›</span></button>
      </div>
    </div>
  );
}

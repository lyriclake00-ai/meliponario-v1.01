"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "./AppContext";
import { Field, inputCls } from "./ui";
import { useToast } from "./useToast";

export default function Onboarding({ onDone, showBack }: { onDone?: () => void; showBack?: boolean }) {
  const { refreshMelis, setCurrent, logout, user } = useApp();
  const { show, node } = useToast();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "Meu Meliponário", cidade: "", estado: "", descricao: "" });
  const [codigo, setCodigo] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api<{ meliponario: { id: number } }>("/api/meliponarios", { method: "POST", body: JSON.stringify(form) });
      const list = await refreshMelis();
      const found = list.find((m) => m.id === r.meliponario.id);
      if (found) setCurrent(found);
      show("Meliponário criado com sucesso!", "ok");
      onDone?.();
    } catch (err) {
      show(err instanceof Error ? err.message : "Erro", "err");
    } finally {
      setLoading(false);
    }
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/convite", { method: "POST", body: JSON.stringify({ codigo }) });
      show("Solicitação enviada! Aguarde o administrador aceitar.", "ok");
      await refreshMelis();
    } catch (err) {
      show(err instanceof Error ? err.message : "Erro", "err");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-melibg p-4">
      {node}
      <div className="mx-auto max-w-lg pt-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-melidark">Bem-vindo, {user?.nome?.split(" ")[0]}! 🐝</h1>
          <p className="text-gray-500">Crie seu meliponário ou entre em um existente.</p>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex rounded-xl bg-melibg p-1">
            <button onClick={() => setTab("create")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === "create" ? "bg-white text-melidark shadow" : "text-gray-500"}`}>
              Criar meliponário
            </button>
            <button onClick={() => setTab("join")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === "join" ? "bg-white text-melidark shadow" : "text-gray-500"}`}>
              Entrar com código
            </button>
          </div>

          {tab === "create" ? (
            <form onSubmit={create} className="space-y-4">
              <Field label="Nome do meliponário">
                <input className={inputCls} value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cidade">
                  <input className={inputCls} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Paraty" />
                </Field>
                <Field label="Estado">
                  <input className={inputCls} value={form.estado} onChange={(e) => set("estado", e.target.value)} placeholder="RJ" />
                </Field>
              </div>
              <Field label="Descrição (opcional)">
                <textarea className={inputCls} rows={2} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
              </Field>
              <button disabled={loading} className="btn-primary w-full rounded-xl py-3 font-bold disabled:opacity-60">
                {loading ? "Criando..." : "Criar meliponário"}
              </button>
              <p className="text-center text-xs text-gray-400">Depois de criar, você poderá cadastrar suas colônias manualmente.</p>
            </form>
          ) : (
            <form onSubmit={join} className="space-y-4">
              <Field label="Código de convite" hint="Ex: MELI-7K29">
                <input className={`${inputCls} text-center text-lg font-bold tracking-widest uppercase`} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="MELI-XXXX" required />
              </Field>
              <button disabled={loading} className="btn-honey w-full rounded-xl py-3 font-bold disabled:opacity-60">
                {loading ? "Enviando..." : "Solicitar entrada"}
              </button>
            </form>
          )}
        </div>

        {showBack ? (
          <button onClick={() => onDone?.()} className="mx-auto mt-6 block text-sm font-medium text-gray-400 hover:text-gray-600">
            Voltar ao aplicativo
          </button>
        ) : (
          <button onClick={logout} className="mx-auto mt-6 block text-sm font-medium text-gray-400 hover:text-gray-600">
            Sair da conta
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { api, fileToDataUrl } from "@/lib/client";
import { useApp } from "../AppContext";
import { Field, inputCls, Badge } from "../ui";
import { useToast } from "../useToast";

export default function Perfil() {
  const { user, melis, refreshUser, logout } = useApp();
  const { show, node } = useToast();
  const [nome, setNome] = useState(user?.nome || "");
  const [telefone, setTelefone] = useState(user?.telefone || "");
  const [foto, setFoto] = useState(user?.foto || "");
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);

  async function onFoto(files: FileList | null) {
    if (!files?.[0]) return;
    setFoto(await fileToDataUrl(files[0], 400, 0.8));
  }
  async function save() {
    setSaving(true);
    try {
      await api("/api/profile", { method: "PUT", body: JSON.stringify({ nome, telefone, foto, senha: senha || undefined }) });
      await refreshUser();
      setSenha("");
      show("Perfil atualizado!", "ok");
    } catch (e) { show(e instanceof Error ? e.message : "Erro", "err"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 fade-in">
      {node}
      <h1 className="text-2xl font-extrabold text-melidark">Meu perfil</h1>

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <label className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-melibg text-2xl font-bold text-melidark">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" className="h-full w-full object-cover" />
            ) : (user?.nome?.[0] || "?")}
            <span className="absolute bottom-0 right-0 rounded-full bg-melimid p-1 text-xs text-white">📷</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFoto(e.target.files)} />
          </label>
          <div>
            <div className="font-bold text-melidark">{user?.nome}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Nome"><input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="Telefone"><input className={inputCls} value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Field>
          <Field label="Nova senha (deixe em branco para manter)"><input type="password" className={inputCls} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" /></Field>
          <button onClick={save} disabled={saving} className="btn-primary w-full rounded-xl py-3 font-bold disabled:opacity-60">{saving ? "Salvando..." : "Salvar alterações"}</button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-bold text-melidark">Meliponários que participo</h3>
        <div className="space-y-2">
          {melis.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-melibg p-3">
              <div><div className="font-semibold text-melidark">{m.nome}</div><div className="text-xs text-gray-500">{m.cidade}{m.estado ? "-" + m.estado : ""}</div></div>
              <Badge className="bg-melimid text-white">{m.funcao}</Badge>
            </div>
          ))}
        </div>
      </div>

      <button onClick={logout} className="w-full rounded-xl border border-red-200 py-3 font-semibold text-red-500">Sair da conta</button>
    </div>
  );
}

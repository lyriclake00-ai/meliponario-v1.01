"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@/lib/client";
import { useApp } from "./AppContext";
import { Field, inputCls } from "./ui";
import { useToast } from "./useToast";

type Mode = "login" | "register" | "forgot" | "reset";

export default function AuthScreen() {
  const { refreshUser } = useApp();
  const { show, node } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", telefone: "", token: "" });
  const [resetInfo, setResetInfo] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // After a successful login/registration we refresh the in-memory session and
  // then try a hard reload (most reliable for cookie auth). If reloading is not
  // allowed (sandboxed iframe), the refreshed state alone already moves the
  // user into the app, so we never end up on a blank screen.
  async function enterApp() {
    await refreshUser();
    try {
      window.location.reload();
    } catch {
      /* state refresh above is enough */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, senha: form.senha }) });
        await enterApp();
        return;
      } else if (mode === "register") {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ nome: form.nome, email: form.email, senha: form.senha, telefone: form.telefone }),
        });
        await enterApp();
        return;
      } else if (mode === "forgot") {
        const r = await api<{ token?: string; message: string }>("/api/auth/forgot", {
          method: "POST",
          body: JSON.stringify({ email: form.email }),
        });
        setResetInfo(r.token ? `Seu código: ${r.token}` : r.message);
        show("Código gerado! Use-o para redefinir.", "ok");
        setMode("reset");
      } else if (mode === "reset") {
        await api("/api/auth/reset", {
          method: "POST",
          body: JSON.stringify({ email: form.email, token: form.token, senha: form.senha }),
        });
        show("Senha redefinida! Faça login.", "ok");
        setMode("login");
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "Erro", "err");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-melidark via-melimid to-melilight flex items-center justify-center p-4">
      {node}
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg overflow-hidden">
            <Image src="/logo.png" alt="Meu Meliponário" width={80} height={80} className="object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Meu Meliponário</h1>
          <p className="text-sm text-white/80">Caderno de manejo das suas abelhas</p>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex rounded-xl bg-melibg p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "login" ? "bg-white text-melidark shadow" : "text-gray-500"}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "register" ? "bg-white text-melidark shadow" : "text-gray-500"}`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <>
                <Field label="Nome completo">
                  <input className={inputCls} value={form.nome} onChange={(e) => set("nome", e.target.value)} required placeholder="Ex: Lucas Nascimento" />
                </Field>
                <Field label="Telefone (opcional)">
                  <input className={inputCls} value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" />
                </Field>
              </>
            )}

            {(mode === "login" || mode === "register" || mode === "forgot" || mode === "reset") && (
              <Field label="E-mail">
                <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="voce@email.com" />
              </Field>
            )}

            {mode === "reset" && (
              <Field label="Código de recuperação" hint={resetInfo}>
                <input className={inputCls} value={form.token} onChange={(e) => set("token", e.target.value)} required placeholder="Código recebido" />
              </Field>
            )}

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <Field label={mode === "reset" ? "Nova senha" : "Senha"}>
                <input type="password" className={inputCls} value={form.senha} onChange={(e) => set("senha", e.target.value)} required placeholder="••••••••" minLength={4} />
              </Field>
            )}

            <button disabled={loading} className="btn-primary w-full rounded-xl py-3 font-bold shadow-md disabled:opacity-60">
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar minha conta" : mode === "forgot" ? "Gerar código" : "Redefinir senha"}
            </button>
          </form>

          {mode === "login" && (
            <button onClick={() => setMode("forgot")} className="mt-4 w-full text-center text-sm font-medium text-melimid hover:underline">
              Esqueci minha senha
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button onClick={() => setMode("login")} className="mt-4 w-full text-center text-sm font-medium text-melimid hover:underline">
              Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

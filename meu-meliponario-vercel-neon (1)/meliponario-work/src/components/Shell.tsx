"use client";

import { useState } from "react";
import { useApp } from "./AppContext";
import { Modal } from "./ui";
import { useToast } from "./useToast";
import { api } from "@/lib/client";
import Dashboard from "./views/Dashboard";
import Colonias from "./views/Colonias";
import ColoniaDetail from "./views/ColoniaDetail";
import Producao from "./views/Producao";
import Genealogia from "./views/Genealogia";
import Lembretes from "./views/Lembretes";
import Relatorios from "./views/Relatorios";
import Equipe from "./views/Equipe";
import Config from "./views/Config";
import Perfil from "./views/Perfil";
import Auditoria from "./views/Auditoria";
import SeuMeli from "./views/SeuMeli";
import Visitas from "./views/Visitas";
import VisitForm from "./VisitForm";
import dynamic from "next/dynamic";

// jsPDF é pesado — carrega sob demanda
const RelatoriosLazy = dynamic(() => import("./views/Relatorios"), {
  ssr: false,
  loading: () => <div className="py-10 text-center text-sm text-gray-400">Carregando relatórios...</div>,
});

type View = "dashboard" | "meli" | "colonias" | "colonia" | "visitas" | "producao" | "genealogia" | "lembretes" | "relatorios" | "equipe" | "config" | "perfil" | "auditoria";

const NAV = [
  { key: "dashboard", label: "Início", icon: "🏠" },
  { key: "meli", label: "Seu Meliponário", icon: "🏡" },
  { key: "colonias", label: "Colônias", icon: "🐝" },
  { key: "visitas", label: "Visitas", icon: "📋" },
  { key: "producao", label: "Produção", icon: "🍯" },
  { key: "genealogia", label: "Genealogia", icon: "🌳" },
  { key: "lembretes", label: "Lembretes", icon: "🔔" },
  { key: "relatorios", label: "Relatórios", icon: "📊" },
  { key: "equipe", label: "Equipe", icon: "👥" },
  { key: "config", label: "Configurações", icon: "⚙️" },
  { key: "perfil", label: "Perfil", icon: "👤" },
];

const MOBILE_NAV = [
  { key: "dashboard", label: "Início", icon: "🏠" },
  { key: "colonias", label: "Colônias", icon: "🐝" },
  { key: "visita", label: "Visita", icon: "➕" },
  { key: "relatorios", label: "Relatórios", icon: "📊" },
  { key: "perfil", label: "Perfil", icon: "👤" },
];

export default function Shell({ onOnboard }: { onOnboard: () => void }) {
  const { current, melis, setCurrent, user } = useApp();
  const { show } = useToast();
  const [view, setView] = useState<View>("dashboard");
  const [coloniaId, setColoniaId] = useState<number | null>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [quickCols, setQuickCols] = useState<{ id: number; codigo: string }[]>([]);
  const [switcher, setSwitcher] = useState(false);

  const canEdit = current?.funcao === "ADMIN" || current?.funcao === "MANEJADOR";

  function navigate(v: string, id?: number) {
    if (v === "colonia" && id) { setColoniaId(id); setView("colonia"); }
    else setView(v as View);
    window.scrollTo(0, 0);
  }

  async function openQuick() {
    if (!current) return;
    try {
      const r = await api<{ colonias: { id: number; codigo: string }[] }>(`/api/meliponarios/${current.id}/colonias`);
      setQuickCols(r.colonias);
      setShowQuick(true);
    } catch { /* ignore */ }
  }

  const [quickSelected, setQuickSelected] = useState<{ id: number; codigo: string } | null>(null);

  function renderView() {
    switch (view) {
      case "dashboard": return <Dashboard onNavigate={navigate} />;
      case "meli": return <SeuMeli onNavigate={navigate} onGoEquipe={() => setView("equipe")} onGoConfig={() => setView("config")} />;
      case "colonias": return <Colonias onOpen={(id) => navigate("colonia", id)} />;
      case "colonia": return coloniaId ? <ColoniaDetail id={coloniaId} onBack={() => setView("colonias")} onOpenColonia={(id) => navigate("colonia", id)} /> : null;
      case "visitas": return <Visitas />;
      case "producao": return <Producao />;
      case "genealogia": return <Genealogia onOpenColonia={(id) => navigate("colonia", id)} />;
      case "lembretes": return <Lembretes />;
      case "relatorios": return <RelatoriosLazy />;
      case "equipe": return <Equipe />;
      case "config": return <Config onCreateNew={onOnboard} onGoAuditoria={() => setView("auditoria")} />;
      case "perfil": return <Perfil />;
      case "auditoria": return <Auditoria onBack={() => setView("config")} />;
      default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-melibg">
      {/* Sidebar desktop */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        <div className="flex items-center gap-2 border-b border-gray-100 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Meu Meliponário" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <div className="font-extrabold text-melidark leading-tight">Meu Meliponário</div>
            <div className="text-[10px] text-gray-400">Caderno de manejo</div>
          </div>
        </div>
        <button onClick={() => setSwitcher(true)} className="mx-3 mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-melidark to-melimid p-3 text-left text-white shadow-md transition hover:shadow-lg">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-white/70">Meliponário ativo</div>
            <div className="truncate text-sm font-bold">{current?.nome}</div>
            <div className="text-[10px] text-white/70">{current?.cidade}{current?.estado ? "-" + current.estado : ""} · {current?.funcao}</div>
          </div>
          <span className="text-xl">⇅</span>
        </button>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => navigate(n.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${view === n.key || (view === "colonia" && n.key === "colonias") ? "bg-melimid text-white" : "text-gray-600 hover:bg-melibg"}`}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3 text-xs text-gray-400">{user?.nome}</div>
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white px-3 py-2.5 lg:hidden">
        <button onClick={() => setSwitcher(true)} className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-melidark to-melimid p-2.5 text-left text-white">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-wide text-white/70">Meliponário</div>
            <div className="truncate text-sm font-bold">{current?.nome}</div>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">⇅ Trocar</span>
        </button>
      </header>

      {/* Conteúdo principal */}
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-5 lg:ml-64 lg:pb-8 lg:pt-8">{renderView()}</main>

      {/* Barra inferior mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-gray-100 bg-white lg:hidden">
        {MOBILE_NAV.map((n) => {
          const active = view === n.key || (view === "colonia" && n.key === "colonias") || (view === "visitas" && n.key === "colonias") || (view === "meli" && n.key === "dashboard");
          if (n.key === "visita") {
            return (
              <button key="visita" onClick={openQuick} disabled={!canEdit} className="relative flex flex-1 flex-col items-center justify-center py-2 disabled:opacity-40">
                <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full btn-honey text-2xl shadow-lg">➕</span>
                <span className="mt-0.5 text-[10px] font-semibold text-meliamber">Visita</span>
              </button>
            );
          }
          return (
            <button key={n.key} onClick={() => navigate(n.key)} className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold ${active ? "text-melimid" : "text-gray-400"}`}>
              <span className="text-xl">{n.icon}</span>{n.label}
            </button>
          );
        })}
      </nav>

      {/* Modal de seleção de meliponário */}
      <Modal open={switcher} onClose={() => setSwitcher(false)} title="Seus meliponários" wide>
        <div className="space-y-2">
          {melis.length === 0 && (
            <p className="rounded-xl bg-melibg p-4 text-center text-sm text-gray-500">Você ainda não participa de nenhum meliponário.</p>
          )}
          {melis.map((m) => (
            <button
              key={m.id}
              onClick={() => { setCurrent(m); setSwitcher(false); setView("meli"); }}
              className={`flex w-full items-center gap-3 overflow-hidden rounded-2xl border-2 p-3 text-left transition ${m.id === current?.id ? "border-melimid bg-melibg shadow" : "border-transparent bg-white hover:bg-melibg"}`}
            >
              {m.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.logo} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-melidark to-melimid text-2xl text-white">🐝</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-melidark">{m.nome}</div>
                <div className="truncate text-xs text-gray-500">{m.cidade}{m.estado ? "-" + m.estado : ""}</div>
                <div className="mt-1 flex gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.funcao === "ADMIN" ? "bg-melidark text-white" : m.funcao === "MANEJADOR" ? "bg-melilight text-melidark" : "bg-gray-200 text-gray-700"}`}>{m.funcao}</span>
                  {m.id === current?.id && <span className="rounded-full bg-melimid px-2 py-0.5 text-[10px] font-bold text-white">Ativo</span>}
                </div>
              </div>
            </button>
          ))}
          <button onClick={() => { setSwitcher(false); onOnboard(); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 p-3 text-sm font-semibold text-melimid hover:border-melimid hover:bg-melibg">
            <span className="text-lg">＋</span> Criar ou entrar em outro meliponário
          </button>
        </div>
      </Modal>

      {/* Modal de registro rápido de visita */}
      <Modal open={showQuick} onClose={() => { setShowQuick(false); setQuickSelected(null); }} title={quickSelected ? "Registrar visita" : "Selecione a colônia"} wide>
        {!quickSelected ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quickCols.map((c) => (
              <button key={c.id} onClick={() => setQuickSelected(c)} className="rounded-xl bg-melibg py-4 font-bold text-melidark hover:bg-melilight/30">{c.codigo}</button>
            ))}
            {quickCols.length === 0 && <p className="col-span-full text-center text-sm text-gray-400">Cadastre uma colônia primeiro.</p>}
          </div>
        ) : (
          <VisitForm coloniaId={quickSelected.id} coloniaCodigo={quickSelected.codigo} onSaved={() => { setShowQuick(false); setQuickSelected(null); show("Visita registrada com sucesso!", "ok"); }} onError={(m) => show(m, "err")} />
        )}
      </Modal>
    </div>
  );
}



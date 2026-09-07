"use client";

import { useEffect, useMemo, useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner } from "../ui";
import { EvolutionChart } from "../Charts";
import { useToast } from "../useToast";

type Alerta = { chave: string; colonia: string; coloniaId: number | null; texto: string; tipo: string };
type Dash = {
  stats: {
    totalColonias: number; ativas: number; atencao: number;
    diasVisita: number; ultimaData: string | null; diasMes: number;
    producaoTotal: number; producoes: number; divisoes: number;
    lembretesPendentes: number; lembretesAtrasados: number;
    totalMembros: number; coloniasRecentes: number;
  };
  recentes: { id: number; data: string; colonia: string; coloniaId: number; responsavel: string; nota: number | null; resumo: string }[];
  alertas: Alerta[];
  evolucao: { data: string; nota: number; coloniaId: number; colonia?: string }[];
  colonias: { id: number; codigo: string }[];
  ultimasColonias: { id: number; codigo: string; status: string }[];
  ultimasAtividades: { data: string; tipo: string; texto: string }[];
};

const PALETTES = [
  "from-melimid to-melidark",
  "from-melilight to-melimid",
  "from-meliamber to-orange-500",
  "from-melihoney to-meliamber",
  "from-emerald-500 to-melimid",
  "from-amber-500 to-yellow-600",
  "from-purple-500 to-melidark",
  "from-rose-500 to-meliamber",
];

export default function Dashboard({ onNavigate }: { onNavigate: (view: string, id?: number) => void }) {
  const { current, user } = useApp();
  const { show, node } = useToast();
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterCol, setFilterCol] = useState<number | "all">("all");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    setErr(null);
    api<Dash>(`/api/meliponarios/${current.id}/dashboard`)
      .then((r) => { setD(r); setLoading(false); })
      .catch((e) => { setErr(e instanceof Error ? e.message : "Erro ao carregar"); setLoading(false); });
  }, [current, tick]);

  if (loading) return <Spinner />;
  if (!d) {
    return (
      <div className="card p-8 text-center fade-in">
        <div className="text-4xl">🐝</div>
        <h2 className="mt-3 text-lg font-bold text-melidark">Não foi possível carregar a visão do meliponário</h2>
        <p className="mt-1 text-sm text-gray-500">{err || "Verifique sua conexão e tente novamente."}</p>
        <button onClick={() => setTick((t) => t + 1)} className="btn-primary mt-4 rounded-xl px-5 py-2.5 text-sm font-bold">Tentar novamente</button>
      </div>
    );
  }

  const evoData = (filterCol === "all" ? d.evolucao : d.evolucao.filter((e) => e.coloniaId === filterCol)).map((e) => ({ data: e.data, nota: e.nota }));

  // ------- Cards clicáveis -------
  const cards = [
    { key: "colonias", label: "Colônias", value: d.stats.totalColonias, icon: "🐝", color: PALETTES[0], sub: `${d.stats.ativas} ativas · ${d.stats.atencao} atenção` },
    { key: "dias-visita", label: "Dias de visita", value: d.stats.diasVisita, icon: "📅", color: PALETTES[1], sub: d.stats.ultimaData ? `Último: ${fmtDate(d.stats.ultimaData)}` : "Sem visitas" },
    { key: "visitas", label: "Visitas", value: d.stats.diasVisita, icon: "📋", color: PALETTES[3], sub: "Dias com visita" },
    { key: "producao", label: "Produção", value: d.stats.producoes, icon: "🍯", color: PALETTES[2], sub: d.stats.producaoTotal > 0 ? `${d.stats.producaoTotal.toFixed(0)}g` : "Sem registros" },
    { key: "divisoes", label: "Divisões", value: d.stats.divisoes, icon: "🌳", color: PALETTES[4], sub: "Genealogia" },
    { key: "lembretes", label: "Lembretes pendentes", value: d.stats.lembretesPendentes, icon: "🔔", color: PALETTES[5], sub: d.stats.lembretesAtrasados > 0 ? `${d.stats.lembretesAtrasados} atrasados` : "Tudo em dia" },
    { key: "equipe", label: "Equipe", value: d.stats.totalMembros, icon: "👥", color: PALETTES[6], sub: "Membros ativos" },
    { key: "meli", label: "Seu Meliponário", value: "→", icon: "🏡", color: PALETTES[7], sub: "Visão geral" },
  ];

  function go(key: string) {
    if (key === "colonias") onNavigate("colonias");
    else if (key === "dias-visita" || key === "visitas") onNavigate("visitas");
    else if (key === "producao") onNavigate("producao");
    else if (key === "divisoes") onNavigate("genealogia");
    else if (key === "lembretes") onNavigate("lembretes");
    else if (key === "equipe") onNavigate("equipe");
    else if (key === "meli") onNavigate("meli");
  }

  async function dismissAlert(a: Alerta) {
    if (!current) return;
    try {
      await api(`/api/meliponarios/${current.id}/notificacoes`, { method: "POST", body: JSON.stringify({ chave: a.chave }) });
      setD((prev) => prev ? { ...prev, alertas: prev.alertas.filter((x) => x.chave !== a.chave) } : prev);
    } catch (e) {
      show(e instanceof Error ? e.message : "Erro ao dispensar", "err");
    }
  }

  return (
    <div className="space-y-6 fade-in">
      {node}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-melimid">Visão do meliponário</p>
        <h1 className="text-2xl font-extrabold text-melidark">Olá, {user?.nome?.split(" ")[0]}! 👋</h1>
        <p className="text-gray-500">{current?.nome} {current?.cidade ? `· ${current.cidade}${current?.estado ? "-" + current.estado : ""}` : ""}</p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-melidark">Suas colônias</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <button
              key={c.label}
              onClick={() => go(c.key)}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.color} p-4 text-left text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl">{c.icon}</div>
                <div className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100">Ver →</div>
              </div>
              <div className="mt-2 text-3xl font-extrabold leading-none">{c.value}</div>
              <div className="mt-0.5 text-sm font-semibold">{c.label}</div>
              <div className="text-[11px] text-white/85">{c.sub}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">Toque em qualquer indicador para abrir a área correspondente.</p>
      </div>

      {d.alertas.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-melidark">
            Notificações <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">{d.alertas.length}</span>
          </h2>
          <div className="space-y-2">
            {d.alertas.slice(0, 10).map((a, i) => (
              <div key={i} className="card flex items-center gap-3 p-3.5">
                <button
                  onClick={() => a.coloniaId ? onNavigate("colonia", a.coloniaId) : onNavigate("lembretes")}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span className="text-xl">🔔</span>
                  <span className="flex-1 text-sm font-medium text-gray-700">{a.texto}</span>
                </button>
                <button
                  onClick={() => dismissAlert(a)}
                  aria-label="Excluir notificação"
                  className="rounded-full p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  title="Excluir notificação"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-melidark">Evolução das notas ao longo do tempo</h2>
          <select value={filterCol} onChange={(e) => setFilterCol(e.target.value === "all" ? "all" : Number(e.target.value))} className="rounded-lg border border-gray-200 px-2 py-1 text-sm">
            <option value="all">Todas as colônias</option>
            {d.colonias.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
          </select>
        </div>
        <EvolutionChart data={evoData} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-melidark">Últimas visitas</h2>
          {d.recentes.length > 0 && (
            <button onClick={() => onNavigate("visitas")} className="text-xs font-semibold text-melimid hover:underline">Ver todas</button>
          )}
        </div>
        {d.recentes.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">Nenhuma visita registrada ainda.</div>
        ) : (
          <div className="space-y-2">
            {d.recentes.map((v) => (
              <button key={v.id} onClick={() => onNavigate("colonia", v.coloniaId)} className="card flex w-full items-center gap-3 p-4 text-left hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-melibg font-bold text-melidark">
                  <span className="text-sm">{v.nota ?? "—"}</span>
                  <span className="text-[9px] text-gray-400">NOTA</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-melidark">{v.colonia}</span>
                    <span className="text-xs text-gray-400">{fmtDate(v.data)}</span>
                  </div>
                  <p className="truncate text-sm text-gray-500">{v.resumo}</p>
                  <p className="text-xs text-gray-400">por {v.responsavel}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

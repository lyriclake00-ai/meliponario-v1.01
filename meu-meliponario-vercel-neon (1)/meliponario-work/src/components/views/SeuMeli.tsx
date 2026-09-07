"use client";

import { useEffect, useRef, useState } from "react";
import { api, fileToDataUrl, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Empty, Badge } from "../ui";
import { useToast } from "../useToast";

type Meli = {
  id: number; nome: string; descricao: string | null; logo: string | null;
  cidade: string | null; estado: string | null; localizacao: string | null; pais: string | null;
  createdAt: number | string;
};
type Cont = {
  totalColonias: number; ativas: number; inativas: number; atencao: number;
  diasVisita: number; ultimaData: string | null; diasMes: number;
  producaoTotal: number; producoes: number; porProduto: Record<string, number>;
  divisoes: number; coloniasRecentes: number;
  lembretesPendentes: number; lembretesAtrasados: number;
  membros: number; porFuncao: Record<string, number>;
};
type Equipe = { id: number; nome: string; email: string; funcao: string; foto: string | null };
type VisitaRec = { id: number; data: string; colonia: string; responsavel: string | null; nota: number | null };
type ColoniaRec = { id: number; codigo: string; status: string; nome: string | null };
type Data = { meliponario: Meli; contadores: Cont; equipe: Equipe[]; ultimasVisitas: VisitaRec[]; ultimasColonias: ColoniaRec[] };

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrador", MANEJADOR: "Manejador", VISUALIZADOR: "Visualizador" };
const ROLE_COLOR: Record<string, string> = { ADMIN: "bg-melidark text-white", MANEJADOR: "bg-melilight text-melidark", VISUALIZADOR: "bg-gray-200 text-gray-700" };

export default function SeuMeli({ onNavigate, onGoEquipe, onGoConfig }: { onNavigate: (view: string, id?: number) => void; onGoEquipe: () => void; onGoConfig: () => void }) {
  const { current, refreshMelis, user } = useApp();
  const { show, node } = useToast();
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAdmin = current?.funcao === "ADMIN";

  const load = () => {
    if (!current) return;
    setLoading(true);
    setErr(null);
    api<Data>(`/api/meliponarios/${current.id}/seu-meliponario`)
      .then((r) => { setD(r); setLoading(false); })
      .catch((e) => { setErr(e instanceof Error ? e.message : "Erro"); setLoading(false); });
  };
  useEffect(load, [current, tick]);

  async function onPickFile(files: FileList | null) {
    if (!files?.[0] || !d) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) { show("Selecione um arquivo de imagem válido.", "err"); return; }
    if (f.size > 5 * 1024 * 1024) { show("A imagem deve ter no máximo 5 MB.", "err"); return; }
    try {
      const url = await fileToDataUrl(f, 1200, 0.8);
      setPreviewLogo(url);
    } catch (e) {
      show("Não foi possível ler a imagem.", "err");
    }
  }

  async function saveLogo() {
    if (!previewLogo || !d) return;
    setUploading(true);
    try {
      await api(`/api/meliponarios/${d.meliponario.id}`, { method: "PUT", body: JSON.stringify({ logo: previewLogo }) });
      await refreshMelis();
      setPreviewLogo(null);
      setTick((t) => t + 1);
      show("Imagem do meliponário atualizada!", "ok");
    } catch (e) {
      show(e instanceof Error ? e.message : "Erro ao salvar a imagem", "err");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <Spinner />;
  if (!d) {
    return (
      <div className="card p-8 text-center fade-in">
        <div className="text-4xl">🐝</div>
        <h2 className="mt-3 text-lg font-bold text-melidark">Não foi possível carregar</h2>
        <p className="mt-1 text-sm text-gray-500">{err}</p>
        <button onClick={() => setTick((t) => t + 1)} className="btn-primary mt-4 rounded-xl px-5 py-2.5 text-sm font-bold">Tentar novamente</button>
      </div>
    );
  }

  const m = d.meliponario;
  const c = d.contadores;
  const showLogo = previewLogo || m.logo;
  const dataCriacao = m.createdAt ? new Date(m.createdAt as unknown as string | number) : null;

  return (
    <div className="space-y-6 fade-in">
      {node}
      <div className="card overflow-hidden">
        <div className="relative h-36 bg-gradient-to-br from-melidark via-melimid to-melilight">
          <div className="absolute -bottom-12 left-5 flex items-end gap-4">
            <div className="relative">
              {showLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={showLogo} alt="" className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-white text-3xl shadow-md">🐝</div>
              )}
              {isAdmin && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-melimid text-xs text-white shadow"
                  title="Alterar imagem"
                >📷</button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files)}
              />
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 pt-14">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-extrabold text-melidark">{m.nome}</h1>
              <p className="text-sm text-gray-500">
                {m.cidade || ""}{m.estado ? ` - ${m.estado}` : ""} {m.pais ? `· ${m.pais}` : ""}
                {dataCriacao && ` · Desde ${fmtDate(dataCriacao.toISOString().slice(0, 10))}`}
              </p>
              {m.localizacao && <p className="text-xs text-gray-400">{m.localizacao}</p>}
              {m.descricao && <p className="mt-2 text-sm text-gray-600">{m.descricao}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {previewLogo && (
                <>
                  <button onClick={() => setPreviewLogo(null)} className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600">Cancelar</button>
                  <button onClick={saveLogo} disabled={uploading} className="btn-primary rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-60">
                    {uploading ? "Salvando..." : "Confirmar imagem"}
                  </button>
                </>
              )}
              {isAdmin && !previewLogo && (
                <button onClick={onGoConfig} className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600">Editar dados</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-melidark">Colônias</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="🐝" label="Total de colônias" value={c.totalColonias} onClick={() => onNavigate("colonias")} />
          <StatCard icon="✅" label="Colônias ativas" value={c.ativas} onClick={() => onNavigate("colonias")} />
          <StatCard icon="⚠️" label="Em atenção" value={c.atencao} onClick={() => onNavigate("colonias")} />
          <StatCard icon="🟥" label="Inativas / Perdidas" value={c.inativas} onClick={() => onNavigate("colonias")} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-melidark">Pessoas</h2>
        <button onClick={onGoEquipe} className="card flex w-full items-center gap-4 p-4 text-left hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-melibg text-2xl">👥</div>
          <div className="flex-1">
            <div className="text-2xl font-extrabold text-melidark">{c.membros} {c.membros === 1 ? "membro" : "membros"}</div>
            <div className="flex flex-wrap gap-1 text-xs text-gray-500">
              {Object.entries(c.porFuncao).map(([f, n]) => (
                <span key={f} className="rounded-full bg-melibg px-2 py-0.5">{ROLE_LABEL[f] || f}: {n}</span>
              ))}
            </div>
          </div>
          <span className="text-gray-300">›</span>
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-melidark">Atividades</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="📅" label="Dias de visita" value={c.diasVisita} onClick={() => onNavigate("visitas")} sub={c.ultimaData ? `Último: ${fmtDate(c.ultimaData)}` : "Sem visitas"} />
          <StatCard icon="📆" label="Dias com visita no mês" value={c.diasMes} onClick={() => onNavigate("visitas")} />
          <StatCard icon="🍯" label="Produção" value={c.producoes} onClick={() => onNavigate("producao")} sub={c.producaoTotal > 0 ? `${c.producaoTotal.toFixed(0)}g` : "—"} />
          <StatCard icon="🌳" label="Divisões" value={c.divisoes} onClick={() => onNavigate("genealogia")} />
          <StatCard icon="🔔" label="Lembretes pendentes" value={c.lembretesPendentes} onClick={() => onNavigate("lembretes")} sub={c.lembretesAtrasados > 0 ? `${c.lembretesAtrasados} atrasados` : "Tudo em dia"} />
          <StatCard icon="🆕" label="Colônias (30d)" value={c.coloniasRecentes} onClick={() => onNavigate("colonias")} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-melidark">Últimas visitas</h2>
        {d.ultimasVisitas.length === 0 ? (
          <Empty title="Nenhuma visita registrada ainda." />
        ) : (
          <div className="space-y-2">
            {d.ultimasVisitas.map((v) => (
              <button key={v.id} onClick={() => onNavigate("colonia", v.id)} className="card flex w-full items-center gap-3 p-3 text-left hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-melibg font-bold text-melidark">{v.nota ?? "—"}</div>
                <div className="flex-1">
                  <div className="font-bold text-melidark">{v.colonia} <span className="text-xs font-normal text-gray-400">· {fmtDate(v.data)}</span></div>
                  <div className="text-xs text-gray-500">por {v.responsavel || "Responsável não informado"}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-melidark">Últimas colônias cadastradas</h2>
        {d.ultimasColonias.length === 0 ? (
          <Empty title="Nenhuma colônia cadastrada." />
        ) : (
          <div className="space-y-2">
            {d.ultimasColonias.map((c) => (
              <button key={c.id} onClick={() => onNavigate("colonia", c.id)} className="card flex w-full items-center gap-3 p-3 text-left hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-melibg text-xl">🐝</div>
                <div className="flex-1">
                  <div className="font-bold text-melidark">{c.codigo} {c.nome && <span className="text-xs font-normal text-gray-500">· {c.nome}</span>}</div>
                </div>
                <Badge className="bg-melibg text-melidark">{c.status}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-melidark">Equipe</h2>
        {d.equipe.length === 0 ? (
          <Empty title="Nenhum membro ativo." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {d.equipe.slice(0, 6).map((e) => (
              <div key={e.id} className="card flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-melibg font-bold text-melidark">
                  {e.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.foto} alt="" className="h-full w-full object-cover" />
                  ) : e.nome[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold text-melidark">{e.nome} {e.email === user?.email && <span className="text-xs text-gray-400">(você)</span>}</div>
                  <div className="text-xs text-gray-500">{e.email}</div>
                </div>
                <Badge className={ROLE_COLOR[e.funcao] || "bg-gray-200 text-gray-700"}>{ROLE_LABEL[e.funcao] || e.funcao}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, onClick }: { icon: string; label: string; value: number | string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="card flex items-center gap-3 p-4 text-left transition hover:shadow-md active:scale-[0.99]">
      <div className="text-2xl">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-extrabold leading-none text-melidark">{value}</div>
        <div className="text-xs font-semibold text-gray-700">{label}</div>
        {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
      </div>
    </button>
  );
}

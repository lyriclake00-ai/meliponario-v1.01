"use client";

import { useEffect, useMemo, useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Empty, Modal } from "../ui";
import VisitForm from "../VisitForm";
import { useToast } from "../useToast";

type Visita = {
  id: number; data: string; hora: string | null; notaGeral: number | null; responsavelNome: string | null;
  populacao: number | null; rainha: string | null; postura: number | null; mel: number | null; polen: number | null;
  espaco: string | null; problemas: string | null; manejos: string | null; observacoes: string | null; fotos: string | null;
  coloniaId: number;
};
type Col = { id: number; codigo: string };

export default function Visitas() {
  const { current } = useApp();
  const { show, node } = useToast();
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [cols, setCols] = useState<Col[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCol, setFiltroCol] = useState<number | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [selCol, setSelCol] = useState<Col | null>(null);
  const [open, setOpen] = useState<Visita | null>(null);
  const canEdit = current?.funcao === "ADMIN" || current?.funcao === "MANEJADOR";

  const load = () => {
    if (!current) return;
    setLoading(true);
    Promise.all([
      api<{ visitas: { id: number; coloniaId: number }[] }>(`/api/meliponarios/${current.id}/visitas`),
      api<{ colonias: Col[] }>(`/api/meliponarios/${current.id}/colonias`),
    ]).then(([v, c]) => { setVisitas((v.visitas as unknown) as Visita[]); setCols(c.colonias); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [current]);

  const colMap = useMemo(() => new Map(cols.map((c) => [c.id, c.codigo])), [cols]);

  const list = useMemo(() => {
    const l = filtroCol === "all" ? visitas : visitas.filter((v) => v.coloniaId === filtroCol);
    return [...l].sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [visitas, filtroCol]);

  // dias de visita (datas únicas)
  const diasVisita = useMemo(() => new Set(visitas.map((v) => v.data)).size, [visitas]);
  const ultimaData = useMemo(() => {
    if (!visitas.length) return null;
    return [...visitas].sort((a, b) => (a.data < b.data ? 1 : -1))[0].data;
  }, [visitas]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5 fade-in">
      {node}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-melidark">Visitas</h1>
        {canEdit && (
          <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold shadow">+ Nova visita</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-2xl">📅</div>
          <div className="mt-2 text-3xl font-extrabold text-melidark">{diasVisita}</div>
          <div className="text-xs font-semibold text-gray-700">Dias de visita</div>
          <div className="text-[10px] text-gray-400">Datas únicas</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl">📋</div>
          <div className="mt-2 text-3xl font-extrabold text-melidark">{visitas.length}</div>
          <div className="text-xs font-semibold text-gray-700">Registros</div>
          <div className="text-[10px] text-gray-400">Histórico individual preservado</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl">🕐</div>
          <div className="mt-2 text-lg font-extrabold text-melidark">{ultimaData ? fmtDate(ultimaData) : "—"}</div>
          <div className="text-xs font-semibold text-gray-700">Última visita</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl">🐝</div>
          <div className="mt-2 text-3xl font-extrabold text-melidark">{new Set(visitas.map((v) => v.coloniaId)).size}</div>
          <div className="text-xs font-semibold text-gray-700">Colônias com visita</div>
        </div>
      </div>

      <div className="card p-3">
        <select value={filtroCol} onChange={(e) => setFiltroCol(e.target.value === "all" ? "all" : Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="all">Todas as colônias</option>
          {cols.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <Empty title="Nenhuma visita registrada." action={canEdit ? <button onClick={() => setShowNew(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-bold">+ Registrar primeira visita</button> : undefined} />
      ) : (
        <div className="space-y-2">
          {list.map((v) => (
            <button key={v.id} onClick={() => setOpen(v)} className="card flex w-full items-center gap-3 p-4 text-left hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-melibg font-bold text-melidark">
                <span className="text-sm">{v.notaGeral ?? "—"}</span><span className="text-[9px] text-gray-400">NOTA</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-melidark">{colMap.get(v.coloniaId) || "—"} <span className="text-xs font-normal text-gray-400">· {fmtDate(v.data)}{v.hora && ` · ${v.hora}`}</span></div>
                <p className="truncate text-sm text-gray-500">{v.observacoes || (v.manejos ? "Manejo: " + v.manejos : "Visita registrada.")}</p>
                <p className="text-xs text-gray-400">por {v.responsavelNome || "Responsável não informado"}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setSelCol(null); }} title={selCol ? "Registrar visita" : "Selecione a colônia"} wide>
        {!selCol ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cols.map((c) => (
              <button key={c.id} onClick={() => setSelCol(c)} className="rounded-xl bg-melibg py-4 font-bold text-melidark hover:bg-melilight/30">{c.codigo}</button>
            ))}
            {cols.length === 0 && <p className="col-span-full text-center text-sm text-gray-400">Cadastre uma colônia primeiro.</p>}
          </div>
        ) : (
          <VisitForm coloniaId={selCol.id} coloniaCodigo={selCol.codigo} onSaved={() => { setShowNew(false); setSelCol(null); show("Visita registrada com sucesso!", "ok"); load(); }} onError={(m) => show(m, "err")} />
        )}
      </Modal>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Visita · ${fmtDate(open.data)}` : ""} wide>
        {open && (
          <div className="space-y-3">
            <div className="rounded-xl bg-melibg p-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Colônia</span><span className="font-bold text-melidark">{colMap.get(open.coloniaId) || "—"}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-gray-500">Responsável</span><span className="font-bold text-melidark">{open.responsavelNome}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-gray-500">Nota</span><span className="font-bold text-melidark">{open.notaGeral ?? "—"}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["População", open.populacao], ["Rainha", open.rainha], ["Postura", open.postura],
                ["Mel", open.mel], ["Pólen", open.polen], ["Espaço", open.espaco],
                ["Problemas", open.problemas], ["Manejos", open.manejos],
              ].filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                <div key={k as string} className="rounded-xl bg-melibg p-3">
                  <div className="text-[11px] uppercase text-gray-400">{k}</div>
                  <div className="text-sm font-semibold text-gray-700">{String(v)}</div>
                </div>
              ))}
            </div>
            {open.observacoes && <div className="rounded-xl border border-gray-100 p-3 text-sm text-gray-600">{open.observacoes}</div>}
            {open.fotos && (() => { try { const arr: string[] = JSON.parse(open.fotos!); return arr.length > 0 ? (
              <div className="flex flex-wrap gap-2">{arr.map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={f} alt="" className="h-20 w-20 rounded-xl object-cover" />
              ))}</div>
            ) : null; } catch { return null; } })()}
          </div>
        )}
      </Modal>
    </div>
  );
}

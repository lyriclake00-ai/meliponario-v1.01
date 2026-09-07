"use client";

import { useEffect, useState } from "react";
import { api, STATUS_COLORS, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { Spinner, Badge, Modal } from "../ui";
import VisitForm from "../VisitForm";
import ColoniaForm from "../ColoniaForm";
import { useToast } from "../useToast";

type Colonia = Record<string, string | number | null>;
type Visita = {
  id: number; data: string; hora: string | null; notaGeral: number | null; responsavelNome: string | null;
  populacao: number | null; rainha: string | null; postura: number | null; mel: number | null; polen: number | null;
  espaco: string | null; problemas: string | null; manejos: string | null; observacoes: string | null; fotos: string | null;
};

export default function ColoniaDetail({ id, onBack, onOpenColonia }: { id: number; onBack: () => void; onOpenColonia: (id: number) => void }) {
  const { current } = useApp();
  const { show, node } = useToast();
  const [data, setData] = useState<{ colonia: Colonia; visitas: Visita[]; filhas: Colonia[]; mae: Colonia | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVisit, setShowVisit] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [detailVisit, setDetailVisit] = useState<Visita | null>(null);
  const [editVisit, setEditVisit] = useState<Visita | null>(null);
  const [gallery, setGallery] = useState<string | null>(null);

  const canEdit = current?.funcao === "ADMIN" || current?.funcao === "MANEJADOR";
  const isAdmin = current?.funcao === "ADMIN";

  const load = () => {
    setLoading(true);
    api<typeof data>(`/api/colonias/${id}`).then((r) => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <Spinner />;
  if (!data) return <div className="p-6 text-center text-gray-400">Colônia não encontrada.</div>;
  const c = data.colonia;
  const foto = c.fotoPrincipal as string | null;

  async function deleteColonia() {
    if (!confirm("Tem certeza que deseja excluir esta colônia? Esta ação registra no histórico.")) return;
    try {
      await api(`/api/colonias/${id}`, { method: "DELETE" });
      show("Colônia excluída.", "ok");
      onBack();
    } catch (e) { show(e instanceof Error ? e.message : "Erro", "err"); }
  }
  async function deleteVisit(vid: number) {
    if (!confirm("Tem certeza que deseja excluir esta visita?")) return;
    try {
      await api(`/api/visitas/${vid}`, { method: "DELETE" });
      show("Visita excluída.", "ok");
      setDetailVisit(null);
      load();
    } catch (e) { show(e instanceof Error ? e.message : "Erro", "err"); }
  }

  const info = [
    ["Origem", c.origem], ["Data de aquisição", fmtDate(c.dataAquisicao as string)], ["Caixa", c.tipoCaixa], ["Localização", c.localizacao],
    ["Rainha", c.rainha], ["População", c.populacao], ["Postura", c.postura], ["Mel", c.mel], ["Pólen", c.polen], ["Espaço", c.espaco], ["Pragas", c.pragas], ["Umidade", c.umidade],
  ].filter(([, v]) => v);

  const last = data.visitas[0];

  return (
    <div className="space-y-5 fade-in">
      {node}
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-melimid">‹ Voltar</button>

      <div className="card overflow-hidden">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-melimid to-melidark text-5xl">🐝</div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-melidark">{c.codigo}</h1>
              {c.nome && <p className="text-gray-500">{c.nome}</p>}
              <p className="text-sm text-gray-500">{c.especie}</p>
            </div>
            <Badge className={STATUS_COLORS[c.status as string] || "bg-gray-100 text-gray-600"}>{c.status}</Badge>
          </div>

          {data.mae && (
            <button onClick={() => onOpenColonia(data.mae!.id as number)} className="mt-2 inline-block rounded-full bg-melibg px-3 py-1 text-xs font-semibold text-melimid">
              🌿 Colônia mãe: {data.mae.codigo as string}
            </button>
          )}

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {info.map(([k, v]) => (
              <div key={k as string}>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">{k}</div>
                <div className="text-sm font-medium text-gray-700">{v as string}</div>
              </div>
            ))}
          </div>
          {c.observacoes && <p className="mt-3 rounded-xl bg-melibg p-3 text-sm text-gray-600">{c.observacoes as string}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {canEdit && <button onClick={() => setShowVisit(true)} className="btn-honey rounded-xl px-4 py-2.5 text-sm font-bold shadow">📋 Registrar visita</button>}
            {canEdit && <button onClick={() => setShowEdit(true)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600">Editar</button>}
            {isAdmin && <button onClick={deleteColonia} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500">Excluir</button>}
          </div>
        </div>
      </div>

      {last && (
        <div className="card p-4">
          <p className="text-xs font-bold uppercase text-melimid">Última visita</p>
          <div className="mt-1 flex items-center justify-between">
            <div>
              <div className="font-bold text-melidark">{fmtDate(last.data)} {last.hora && `· ${last.hora}`}</div>
              <div className="text-sm text-gray-500">por {last.responsavelNome}</div>
            </div>
            <div className="rounded-xl bg-melibg px-3 py-1.5 font-bold text-melidark">Nota {last.notaGeral ?? "—"}</div>
          </div>
        </div>
      )}

      {data.filhas.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-xs font-bold uppercase text-melimid">Colônias filhas (divisões)</p>
          <div className="flex flex-wrap gap-2">
            {data.filhas.map((f) => (
              <button key={f.id as number} onClick={() => onOpenColonia(f.id as number)} className="rounded-full bg-melibg px-3 py-1.5 text-sm font-semibold text-melidark">{f.codigo as string}</button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold text-melidark">Histórico de visitas ({data.visitas.length})</h2>
        {data.visitas.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">Nenhuma visita registrada.</div>
        ) : (
          <div className="space-y-2">
            {data.visitas.map((v) => (
              <button key={v.id} onClick={() => setDetailVisit(v)} className="card flex w-full items-center gap-3 p-4 text-left hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-melibg font-bold text-melidark">
                  <span className="text-sm">{v.notaGeral ?? "—"}</span><span className="text-[9px] text-gray-400">NOTA</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-melidark">{fmtDate(v.data)}</div>
                  <p className="truncate text-sm text-gray-500">{v.observacoes || (v.manejos ? "Manejo: " + v.manejos : "Visita registrada")}</p>
                  <p className="text-xs text-gray-400">por {v.responsavelNome}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={showVisit} onClose={() => setShowVisit(false)} title="Registrar visita" wide>
        <VisitForm coloniaId={id} coloniaCodigo={c.codigo as string} onSaved={() => { setShowVisit(false); show("Visita registrada com sucesso!", "ok"); load(); }} onError={(m) => show(m, "err")} />
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar colônia" wide>
        {current && <ColoniaForm meliponarioId={current.id} existing={c as never} onSaved={() => { setShowEdit(false); show("Colônia atualizada!", "ok"); load(); }} onError={(m) => show(m, "err")} />}
      </Modal>

      <Modal open={!!detailVisit} onClose={() => setDetailVisit(null)} title={`Visita · ${detailVisit ? fmtDate(detailVisit.data) : ""}`} wide>
        {detailVisit && (
          <VisitDetail v={detailVisit} canEdit={canEdit} onEdit={() => { setEditVisit(detailVisit); setDetailVisit(null); }} onDelete={() => deleteVisit(detailVisit.id)} onFoto={setGallery} />
        )}
      </Modal>

      <Modal open={!!editVisit} onClose={() => setEditVisit(null)} title="Editar visita" wide>
        {editVisit && <EditVisit v={editVisit} onSaved={() => { setEditVisit(null); show("Visita atualizada!", "ok"); load(); }} onError={(m) => show(m, "err")} />}
      </Modal>

      {gallery && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setGallery(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gallery} alt="" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

function VisitDetail({ v, canEdit, onEdit, onDelete, onFoto }: { v: Visita; canEdit: boolean; onEdit: () => void; onDelete: () => void; onFoto: (u: string) => void }) {
  const fotos: string[] = v.fotos ? JSON.parse(v.fotos) : [];
  const popL = ["", "Muito fraca", "Fraca", "Boa", "Forte"];
  const rows = [
    ["Responsável", v.responsavelNome], ["Horário", v.hora], ["Nota geral", v.notaGeral],
    ["População", v.populacao ? popL[v.populacao] : null], ["Rainha", v.rainha], ["Postura", v.postura],
    ["Mel", v.mel], ["Pólen", v.polen], ["Espaço", v.espaco], ["Problemas", v.problemas], ["Manejo", v.manejos],
  ].filter(([, val]) => val != null && val !== "");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([k, val]) => (
          <div key={k as string} className="rounded-xl bg-melibg p-3">
            <div className="text-[11px] uppercase text-gray-400">{k}</div>
            <div className="text-sm font-semibold text-gray-700">{String(val)}</div>
          </div>
        ))}
      </div>
      {v.observacoes && <div className="rounded-xl border border-gray-100 p-3 text-sm text-gray-600">{v.observacoes}</div>}
      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fotos.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={f} alt="" onClick={() => onFoto(f)} className="h-24 w-24 cursor-pointer rounded-xl object-cover" />
          ))}
        </div>
      )}
      {canEdit && (
        <div className="flex gap-2 pt-2">
          <button onClick={onEdit} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600">Editar</button>
          <button onClick={onDelete} className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500">Excluir</button>
        </div>
      )}
    </div>
  );
}

function EditVisit({ v, onSaved, onError }: { v: Visita; onSaved: () => void; onError: (m: string) => void }) {
  const [obs, setObs] = useState(v.observacoes || "");
  const [nota, setNota] = useState<number | null>(v.notaGeral);
  const [data, setData] = useState(v.data);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await api(`/api/visitas/${v.id}`, { method: "PUT", body: JSON.stringify({ observacoes: obs, notaGeral: nota, data }) });
      onSaved();
    } catch (e) { onError(e instanceof Error ? e.message : "Erro"); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <label className="block"><span className="mb-1 block text-sm font-semibold text-melidark">Data</span>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5" /></label>
      <div><p className="mb-2 text-sm font-semibold text-melidark">Nota geral</p>
        <div className="flex gap-2">{[1, 2, 3, 4].map((n) => (
          <button key={n} onClick={() => setNota(n)} className={`flex-1 rounded-xl border py-2 font-bold ${nota === n ? "border-melimid bg-melimid text-white" : "border-gray-200 text-gray-500"}`}>{n}</button>
        ))}</div></div>
      <label className="block"><span className="mb-1 block text-sm font-semibold text-melidark">Observações</span>
        <textarea rows={4} value={obs} onChange={(e) => setObs(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5" /></label>
      <button onClick={save} disabled={saving} className="btn-primary w-full rounded-xl py-3 font-bold disabled:opacity-60">{saving ? "Salvando..." : "Salvar alterações"}</button>
    </div>
  );
}

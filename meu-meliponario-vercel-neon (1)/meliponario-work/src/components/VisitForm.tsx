"use client";

import { useState } from "react";
import { api, fileToDataUrl } from "@/lib/client";
import { useApp } from "./AppContext";
import { Field, inputCls } from "./ui";

const PROBLEMAS = ["Nenhum", "Formigas", "Forídeos", "Ácaros", "Invasores", "Umidade", "Outro"];
const MANEJOS = ["Limpeza", "Alimentação", "Expansão", "Redução", "Troca de caixa", "Controle de pragas", "Tratamento", "Divisão", "Transferência", "Inspeção", "Outro"];

function Segmented({ options, value, onChange }: { options: { v: number | string; l: string }[]; value: number | string | null; onChange: (v: number | string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${value === o.v ? "border-melimid bg-melimid text-white shadow" : "border-gray-200 bg-white text-gray-600 hover:border-melilight"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Multi({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => {
    if (o === "Nenhum") return onChange(["Nenhum"]);
    const without = value.filter((x) => x !== "Nenhum");
    onChange(without.includes(o) ? without.filter((x) => x !== o) : [...without, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${value.includes(o) ? "border-meliamber bg-meliamber/10 text-meliamber" : "border-gray-200 bg-white text-gray-600"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function VisitForm({
  coloniaId,
  coloniaCodigo,
  onSaved,
  onError,
}: {
  coloniaId: number;
  coloniaCodigo: string;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const { user } = useApp();
  const now = new Date();
  const [data, setData] = useState(now.toISOString().slice(0, 10));
  const [populacao, setPopulacao] = useState<number | null>(null);
  const [rainha, setRainha] = useState<string | null>(null);
  const [postura, setPostura] = useState<number | null>(null);
  const [mel, setMel] = useState<number | null>(null);
  const [polen, setPolen] = useState<number | null>(null);
  const [espaco, setEspaco] = useState<string | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [manejos, setManejos] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [nota, setNota] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function addFotos(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5 - fotos.length);
    const urls = await Promise.all(arr.map((f) => fileToDataUrl(f)));
    setFotos((p) => [...p, ...urls].slice(0, 5));
  }

  async function save() {
    setSaving(true);
    try {
      await api("/api/visitas", {
        method: "POST",
        body: JSON.stringify({
          coloniaId, data, notaGeral: nota, populacao, rainha, postura, mel, polen, espaco,
          problemas: problemas.length ? problemas : null,
          manejos: manejos.length ? manejos : null,
          observacoes: obs, fotos,
        }),
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-melibg p-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Colônia</span><span className="font-bold text-melidark">{coloniaCodigo}</span></div>
        <div className="mt-1 flex justify-between"><span className="text-gray-500">Responsável</span><span className="font-bold text-melidark">{user?.nome}</span></div>
      </div>

      <Field label="Data da visita">
        <input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Avaliação geral (nota)</p>
        <Segmented options={[{ v: 1, l: "1" }, { v: 2, l: "2" }, { v: 3, l: "3" }, { v: 4, l: "4" }]} value={nota} onChange={(v) => setNota(v as number)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">População</p>
        <Segmented options={[{ v: 1, l: "Muito fraca" }, { v: 2, l: "Fraca" }, { v: 3, l: "Boa" }, { v: 4, l: "Forte" }]} value={populacao} onChange={(v) => setPopulacao(v as number)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Rainha</p>
        <Segmented options={[{ v: "Presente", l: "Presente" }, { v: "Não localizada", l: "Não localizada" }, { v: "Suspeita de problema", l: "Suspeita" }, { v: "Não avaliada", l: "Não avaliada" }]} value={rainha} onChange={(v) => setRainha(v as string)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Postura / Cria</p>
        <Segmented options={[{ v: 1, l: "Muito ruim" }, { v: 2, l: "Ruim" }, { v: 3, l: "Boa" }, { v: 4, l: "Excelente" }]} value={postura} onChange={(v) => setPostura(v as number)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Mel</p>
        <Segmented options={[{ v: 1, l: "Nenhuma" }, { v: 2, l: "Pouca" }, { v: 3, l: "Boa" }, { v: 4, l: "Alta" }]} value={mel} onChange={(v) => setMel(v as number)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Pólen</p>
        <Segmented options={[{ v: 1, l: "Nenhum" }, { v: 2, l: "Pouco" }, { v: 3, l: "Bom" }, { v: 4, l: "Alto" }]} value={polen} onChange={(v) => setPolen(v as number)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Espaço</p>
        <Segmented options={[{ v: "Suficiente", l: "Suficiente" }, { v: "Pouco", l: "Pouco" }, { v: "Necessita expansão", l: "Necessita expansão" }]} value={espaco} onChange={(v) => setEspaco(v as string)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Pragas / Problemas</p>
        <Multi options={PROBLEMAS} value={problemas} onChange={setProblemas} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Manejo realizado</p>
        <Multi options={MANEJOS} value={manejos} onChange={setManejos} />
      </div>

      <Field label="Observações">
        <textarea className={inputCls} rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Anotações da visita..." />
      </Field>

      <div>
        <p className="mb-2 text-sm font-semibold text-melidark">Fotos ({fotos.length}/5)</p>
        <div className="flex flex-wrap gap-2">
          {fotos.map((f, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <button type="button" onClick={() => setFotos((p) => p.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">✕</button>
            </div>
          ))}
          {fotos.length < 5 && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-2xl text-gray-400 hover:border-melimid">
              📷
              <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => addFotos(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary sticky bottom-0 w-full rounded-xl py-3.5 text-base font-bold shadow-lg disabled:opacity-60">
        {saving ? "Salvando..." : "Salvar visita"}
      </button>
    </div>
  );
}

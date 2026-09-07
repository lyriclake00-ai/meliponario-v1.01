"use client";

import { useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { useApp } from "../AppContext";
import { useToast } from "../useToast";
import type jsPDF from "jspdf";

// jsPDF is loaded only when the user actually generates a PDF, so the heavy
// library never blocks the app from booting.
async function loadPdf() {
  const [pdfMod, tableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  // jsPDF ships the constructor as a *named* export; the default export is a
  // namespace object in some bundlers. Resolve it defensively.
  const m = pdfMod as unknown as Record<string, unknown>;
  const d = (m.default ?? {}) as Record<string, unknown>;
  const JsPDF = (m.jsPDF ?? d.jsPDF ?? m.default) as unknown as typeof jsPDF;
  if (typeof JsPDF !== "function") {
    throw new Error("Não foi possível carregar o gerador de PDF.");
  }
  const t = tableMod as unknown as Record<string, unknown>;
  const autoTable = (t.default ?? t.applyPlugin) as (
    doc: jsPDF,
    opts: Record<string, unknown>
  ) => void;
  return { JsPDF, autoTable };
}

type ReportData = {
  meliponario: { nome: string; cidade: string | null; estado: string | null };
  colonias: Record<string, string | number | null>[];
  visitas: Record<string, string | number | null>[];
  producoes: Record<string, string | number | null>[];
  divisoes: Record<string, string | number | null>[];
  team: { nome: string; email: string; funcao: string; status: string }[];
  auditorias: { userNome: string | null; descricao: string | null; dataHora: string }[];
  resumo: { totalColonias: number; ativas: number; visitas: number; producaoTotal: number; divisoes: number };
};

const GREEN: [number, number, number] = [45, 106, 79];
const DARK: [number, number, number] = [27, 67, 50];

function csv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const content = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export default function Relatorios() {
  const { current } = useApp();
  const { show, node } = useToast();
  const [busy, setBusy] = useState("");
  const year = new Date().getFullYear();

  async function fetchData(): Promise<ReportData> {
    return api<ReportData>(`/api/meliponarios/${current!.id}/report`);
  }

  function header(doc: jsPDF, title: string, sub: string) {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(title, 14, 13);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(sub, 14, 21);
    doc.setTextColor(0, 0, 0);
  }

  async function livroManejo() {
    setBusy("livro");
    try {
      const d = await fetchData();
      const { JsPDF, autoTable } = await loadPdf();
      const doc = new JsPDF();
      // CAPA
      doc.setFillColor(...DARK); doc.rect(0, 0, 210, 297, "F");
      doc.setTextColor(244, 180, 0); doc.setFontSize(30); doc.setFont("helvetica", "bold");
      doc.text("🐝", 105, 90, { align: "center" });
      doc.setTextColor(255, 255, 255);
      doc.text(d.meliponario.nome.toUpperCase(), 105, 120, { align: "center" });
      doc.setFontSize(20); doc.setFont("helvetica", "normal");
      doc.text("Livro de Manejo", 105, 135, { align: "center" });
      doc.setFontSize(40); doc.setFont("helvetica", "bold"); doc.setTextColor(244, 180, 0);
      doc.text(String(year), 105, 170, { align: "center" });
      doc.setFontSize(11); doc.setTextColor(200, 220, 210);
      doc.text(`${d.meliponario.cidade || ""} ${d.meliponario.estado ? "- " + d.meliponario.estado : ""}`, 105, 185, { align: "center" });

      // RESUMO
      doc.addPage(); header(doc, "Resumo Geral", `${d.meliponario.nome} · ${year}`);
      autoTable(doc, {
        startY: 36,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total de colônias", String(d.resumo.totalColonias)],
          ["Colônias ativas", String(d.resumo.ativas)],
          ["Visitas realizadas", String(d.resumo.visitas)],
          ["Produção total", `${d.resumo.producaoTotal.toFixed(1)}`],
          ["Divisões realizadas", String(d.resumo.divisoes)],
        ],
        headStyles: { fillColor: GREEN },
      });

      // LISTA DE COLONIAS
      doc.addPage(); header(doc, "Lista de Colônias", `${d.colonias.length} colônias`);
      autoTable(doc, {
        startY: 36,
        head: [["Código", "Espécie", "Origem", "Aquisição", "Status"]],
        body: d.colonias.map((c) => [c.codigo, c.especie || "—", c.origem || "—", fmtDate(c.dataAquisicao as string), c.status]),
        headStyles: { fillColor: GREEN }, styles: { fontSize: 8 },
      });

      // HISTORICO DE VISITAS
      doc.addPage(); header(doc, "Histórico de Visitas", `${d.visitas.length} registros`);
      autoTable(doc, {
        startY: 36,
        head: [["Data", "Colônia", "Responsável", "Nota", "Observações"]],
        body: d.visitas.map((v) => [fmtDate(v.data as string), v.coloniaCodigo, v.responsavelNome || "—", v.notaGeral ?? "—", (v.observacoes as string || "").slice(0, 40)]),
        headStyles: { fillColor: GREEN }, styles: { fontSize: 8 },
      });

      // PRODUCAO
      if (d.producoes.length) {
        doc.addPage(); header(doc, "Produção", `${d.producoes.length} registros`);
        autoTable(doc, {
          startY: 36,
          head: [["Data", "Colônia", "Produto", "Quantidade", "Responsável"]],
          body: d.producoes.map((p) => [fmtDate(p.data as string), p.coloniaCodigo, p.produto, `${p.quantidade}${p.unidade}`, p.responsavelNome || "—"]),
          headStyles: { fillColor: GREEN }, styles: { fontSize: 8 },
        });
      }

      // DIVISOES
      if (d.divisoes.length) {
        doc.addPage(); header(doc, "Divisões e Genealogia", `${d.divisoes.length} divisões`);
        autoTable(doc, {
          startY: 36,
          head: [["Data", "Mãe", "Filha", "Responsável"]],
          body: d.divisoes.map((v) => [fmtDate(v.data as string), v.maeCodigo, v.filhaCodigo, v.responsavelNome || "—"]),
          headStyles: { fillColor: GREEN }, styles: { fontSize: 8 },
        });
      }

      // EQUIPE
      doc.addPage(); header(doc, "Equipe", `${d.team.length} membros`);
      autoTable(doc, {
        startY: 36,
        head: [["Nome", "E-mail", "Função", "Status"]],
        body: d.team.map((t) => [t.nome, t.email, t.funcao, t.status]),
        headStyles: { fillColor: GREEN }, styles: { fontSize: 8 },
      });

      // AUDITORIA
      if (d.auditorias.length) {
        doc.addPage(); header(doc, "Auditoria", "Alterações recentes");
        autoTable(doc, {
          startY: 36,
          head: [["Data/Hora", "Usuário", "Ação"]],
          body: d.auditorias.slice(0, 40).map((a) => [new Date(a.dataHora).toLocaleString("pt-BR"), a.userNome || "—", a.descricao || "—"]),
          headStyles: { fillColor: GREEN }, styles: { fontSize: 7 },
        });
      }

      doc.save(`Livro-de-Manejo-${year}.pdf`);
      show("PDF gerado!", "ok");
    } catch (e) { show(e instanceof Error ? e.message : "Erro", "err"); } finally { setBusy(""); }
  }

  async function relatorioCompleto() {
    setBusy("completo");
    try {
      const d = await fetchData();
      const { JsPDF, autoTable } = await loadPdf();
      const doc = new JsPDF();
      header(doc, "Relatório Completo", `${d.meliponario.nome} · ${new Date().toLocaleDateString("pt-BR")}`);
      autoTable(doc, { startY: 36, head: [["Colônia", "Espécie", "Status"]], body: d.colonias.map((c) => [c.codigo, c.especie || "—", c.status]), headStyles: { fillColor: GREEN } });
      let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold"); doc.text("Visitas recentes", 14, y);
      autoTable(doc, { startY: y + 3, head: [["Data", "Colônia", "Nota", "Responsável"]], body: d.visitas.slice(0, 30).map((v) => [fmtDate(v.data as string), v.coloniaCodigo, v.notaGeral ?? "—", v.responsavelNome || "—"]), headStyles: { fillColor: GREEN }, styles: { fontSize: 8 } });
      doc.save("Relatorio-Completo.pdf");
      show("PDF gerado!", "ok");
    } catch (e) { show(e instanceof Error ? e.message : "Erro", "err"); } finally { setBusy(""); }
  }

  async function exportCsv(tipo: string) {
    setBusy("csv-" + tipo);
    try {
      const d = await fetchData();
      if (tipo === "colonias") csv(d.colonias, "colonias.csv");
      if (tipo === "visitas") csv(d.visitas, "visitas.csv");
      if (tipo === "producao") csv(d.producoes, "producao.csv");
      if (tipo === "membros") csv(d.team as unknown as Record<string, unknown>[], "membros.csv");
      show("CSV exportado!", "ok");
    } catch (e) { show(e instanceof Error ? e.message : "Erro", "err"); } finally { setBusy(""); }
  }

  const cards = [
    { key: "livro", title: "📖 Livro de Manejo (PDF)", desc: "Relatório profissional completo para impressão A4.", action: livroManejo },
    { key: "completo", title: "📄 Relatório completo (PDF)", desc: "Resumo geral do meliponário.", action: relatorioCompleto },
  ];
  const exports = [
    { key: "colonias", title: "Colônias" }, { key: "visitas", title: "Visitas" },
    { key: "producao", title: "Produção" }, { key: "membros", title: "Equipe" },
  ];

  return (
    <div className="space-y-5 fade-in">
      {node}
      <h1 className="text-2xl font-extrabold text-melidark">Relatórios</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <button key={c.key} onClick={c.action} disabled={busy === c.key} className="card p-5 text-left hover:shadow-md disabled:opacity-60">
            <div className="text-lg font-bold text-melidark">{c.title}</div>
            <p className="mt-1 text-sm text-gray-500">{c.desc}</p>
            {busy === c.key && <p className="mt-2 text-xs text-melimid">Gerando...</p>}
          </button>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-bold text-melidark">Exportar dados (CSV / Excel)</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {exports.map((e) => (
            <button key={e.key} onClick={() => exportCsv(e.key)} disabled={busy === "csv-" + e.key} className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:border-melimid disabled:opacity-60">
              {e.title}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">Arquivos CSV podem ser abertos no Excel, Google Sheets ou LibreOffice. Use isso como backup dos seus dados.</p>
      </div>
    </div>
  );
}

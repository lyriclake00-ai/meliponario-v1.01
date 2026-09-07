"use client";

import dynamic from "next/dynamic";

const Loading = () => (
  <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">
    Carregando gráfico...
  </div>
);

// Charts are loaded on demand (client-only). This keeps the heavy charting
// library out of the initial bundle so the app always boots, even if the
// chart library fails to load on a given device/browser.
export const EvolutionChart = dynamic(
  () => import("./ChartsImpl").then((m) => m.EvolutionChart),
  { ssr: false, loading: Loading }
);

export const BarChartSimple = dynamic(
  () => import("./ChartsImpl").then((m) => m.BarChartSimple),
  { ssr: false, loading: Loading }
);

export const PieChartSimple = dynamic(
  () => import("./ChartsImpl").then((m) => m.PieChartSimple),
  { ssr: false, loading: Loading }
);

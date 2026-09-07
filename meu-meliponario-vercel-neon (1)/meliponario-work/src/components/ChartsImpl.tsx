"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const GREEN = "#2d6a4f";
const HONEY = "#f4b400";
const COLORS = ["#2d6a4f", "#f4b400", "#e8891b", "#52b788", "#95d5b2", "#e63946"];

export function EvolutionChart({ data }: { data: { data: string; nota: number }[] }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-gray-400">Sem dados de avaliação ainda.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="data" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
        <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="nota" stroke={GREEN} strokeWidth={3} dot={{ r: 4, fill: HONEY }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarChartSimple({ data, dataKey = "valor", nameKey = "nome", color = GREEN }: { data: Record<string, unknown>[]; dataKey?: string; nameKey?: string; color?: string }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-gray-400">Sem dados.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieChartSimple({ data }: { data: { nome: string; valor: number }[] }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-gray-400">Sem dados.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

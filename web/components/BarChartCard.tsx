"use client";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type Datum = { name: string; value: number; share?: number | null };

const PALETTE = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#6366f1", "#eab308",
];

function fmt(v: number) {
  const eok = (v * 1000) / 1e8; // 천원 → 억
  if (Math.abs(eok) >= 10000) return `${(eok / 10000).toFixed(1)}조`;
  return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}억`;
}

export default function BarChartCard({
  title,
  data,
  height = 320,
}: {
  title: string;
  data: Datum[];
  height?: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" tickFormatter={fmt} stroke="#8b93a7" fontSize={11} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            stroke="#8b93a7"
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: number, _n, p) => [
              `${fmt(v)}${p.payload.share != null ? ` (${p.payload.share}%)` : ""}`,
              "예산액",
            ]}
            contentStyle={{
              background: "#0b0e14",
              border: "1px solid #232a3a",
              borderRadius: 8,
              color: "#e6e9ef",
            }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

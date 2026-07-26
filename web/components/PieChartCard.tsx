"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type Slice = { name: string; value: number };

const PALETTE = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4",
];

function makeFmt(won: boolean) {
  return (v: number) => {
    const eok = won ? v / 1e8 : (v * 1000) / 1e8;
    if (Math.abs(eok) >= 10000) return `${(eok / 10000).toFixed(1)}조`;
    if (Math.abs(eok) < 1) return `${((eok * 1e8) / 1e4).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만`;
    return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}억`;
  };
}

export default function PieChartCard({
  title,
  data,
  won = false,
  valueLabel = "예산액",
}: {
  title: string;
  data: Slice[];
  won?: boolean;
  valueLabel?: string;
}) {
  const fmt = makeFmt(won);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => [`${fmt(v)} (${((v / total) * 100).toFixed(1)}%)`, valueLabel]}
            contentStyle={{
              background: "#0b0e14",
              border: "1px solid #232a3a",
              borderRadius: 8,
              color: "#e6e9ef",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-3 space-y-1 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              {d.name}
            </span>
            <span className="text-[var(--muted)]">
              {fmt(d.value)} · {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

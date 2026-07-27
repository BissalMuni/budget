"use client";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

// 예산-결산 매칭(회계별). 단위 원.
function eok(won: number | null): string {
  if (won == null) return "-";
  const v = won / 1e8;
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(2)}조`;
  return `${v.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}억`;
}

type Row = {
  account: string;
  budget: number | null;
  expenditure: number | null;
  revenue: number | null;
  exec_rate: number | null;
  note?: string;
};
export type ReconcileData = {
  laf_hg_nm: string;
  settle_year: string;
  budget_basis: string;
  note: string;
  totals: { budget: number | null; expenditure: number | null; revenue: number | null; exec_rate: number | null };
  rows: Row[];
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

export default function ReconcileClient({ data }: { data: ReconcileData }) {
  const chart = data.rows.map((r) => ({
    name: r.account,
    당초예산: r.budget ?? 0,
    세출결산: r.expenditure ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <a href="/" className="text-sm text-[var(--muted)] hover:underline">← 전체 목록</a>
        <h1 className="mt-1 text-2xl font-bold">
          {data.laf_hg_nm} {data.settle_year} 예산 · 결산 매칭
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          당초예산(예산서) vs 결산·집행(지방재정365)을 회계별로 연결합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="당초예산 총계" value={eok(data.totals.budget)} sub="기금 제외" />
        <Kpi label="세출결산(집행)" value={eok(data.totals.expenditure)} sub="기금 포함" />
        <Kpi label="세입결산" value={eok(data.totals.revenue)} />
        <Kpi label="집행률(기금 제외)" value={data.totals.exec_rate != null ? `${data.totals.exec_rate}%` : "-"} />
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h3 className="mb-3 font-semibold">회계별 당초예산 vs 세출결산</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chart} margin={{ left: 8, right: 16 }}>
            <XAxis dataKey="name" stroke="#8b93a7" fontSize={12} />
            <YAxis tickFormatter={(v: number) => eok(v)} stroke="#8b93a7" fontSize={11} width={60} />
            <Tooltip
              formatter={(v: number, n) => [eok(v), n as string]}
              contentStyle={{ background: "#0b0e14", border: "1px solid #232a3a", borderRadius: 8, color: "#e6e9ef" }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Legend />
            <Bar dataKey="당초예산" radius={[4, 4, 0, 0]}>
              {chart.map((_, i) => <Cell key={i} fill="#3b82f6" />)}
            </Bar>
            <Bar dataKey="세출결산" radius={[4, 4, 0, 0]}>
              {chart.map((_, i) => <Cell key={i} fill="#22c55e" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">회계</th>
              <th className="px-4 py-3 text-right font-medium">당초예산</th>
              <th className="px-4 py-3 text-right font-medium">세출결산(집행)</th>
              <th className="px-4 py-3 text-right font-medium">세입결산</th>
              <th className="px-4 py-3 text-right font-medium">집행률</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.account} className="border-b border-[var(--line)]/40 last:border-0">
                <td className="px-4 py-2 font-medium">
                  {r.account}
                  {r.note && <div className="text-xs font-normal text-[var(--muted)]">{r.note}</div>}
                </td>
                <td className="px-4 py-2 text-right">{eok(r.budget)}</td>
                <td className="px-4 py-2 text-right">{eok(r.expenditure)}</td>
                <td className="px-4 py-2 text-right text-[var(--muted)]">{eok(r.revenue)}</td>
                <td className="px-4 py-2 text-right">
                  {r.exec_rate != null ? (
                    <span className={r.exec_rate >= 100 ? "text-amber-400" : "text-emerald-400"}>
                      {r.exec_rate}%
                    </span>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 text-xs text-[var(--muted)]">
        ※ {data.note} 기준: {data.budget_basis}.
      </p>
    </div>
  );
}

"use client";
import { useState } from "react";
import BarChartCard, { type Datum } from "@/components/BarChartCard";
import PieChartCard, { type Slice } from "@/components/PieChartCard";

// lib/data 의 fmtKRW 는 node:fs 를 끌고 와서 클라이언트에서 import 불가 → 동일 로직 복제
function fmtKRW(vThousand: number | null): string {
  if (vThousand == null) return "-";
  const won = vThousand * 1000;
  const eok = won / 1e8;
  if (Math.abs(eok) >= 1)
    return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}억`;
  return `${won.toLocaleString("ko-KR")}원`;
}

export type RevenueTableRow = {
  code: string | null;
  name: string;
  amount: number | null;
  share: number | null;
  diff: number | null;
  growth: number | null;
};

export type Mover = {
  code: string | null;
  name: string;
  diff: number | null;
  growth: number | null;
};

export type DashboardData = {
  header: {
    nameKo: string;
    year: string;
    doctypeLabel: string;
    validation: { mismatches: number } | null;
  };
  kpis: {
    total: number | null;
    general: number | null;
    special: number | null;
    growth: number | null;
  };
  mismatches: { name: string; gap: number }[];
  accSlices: Slice[];
  revenueByJang: Datum[];
  revenueByJangFull: Datum[];
  revenueRows: RevenueTableRow[];
  expByFunction: Datum[];
  expByNature: Datum[];
  expByOrg: Datum[];
  movers: Mover[];
  footer: { mokCount: number; title: string; parsedAt: string | null } | null;
};

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [view, setView] = useState<"dashboard" | "revenue">("dashboard");
  const { header, kpis, mismatches, accSlices } = data;

  // ─────────────────────────────────────────── 세입총괄 상세 화면
  if (view === "revenue") {
    const rows = data.revenueRows;
    const totalRow = rows[0];
    const body = rows.slice(1);
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <button
              type="button"
              onClick={() => setView("dashboard")}
              className="text-sm text-[var(--muted)] hover:underline"
            >
              ← 돌아오기
            </button>
            <h1 className="mt-1 text-2xl font-bold">
              {header.nameKo} {header.year} 세입 총괄
            </h1>
          </div>
          {totalRow?.amount != null && (
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">
              세입 총계 {fmtKRW(totalRow.amount)}
            </span>
          )}
        </div>

        {data.revenueByJangFull.length > 0 && (
          <BarChartCard
            title="세입 총괄 (장별 전체)"
            data={data.revenueByJangFull}
            height={Math.max(320, data.revenueByJangFull.length * 28)}
          />
        )}

        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">코드</th>
                <th className="px-4 py-3 font-medium">과목</th>
                <th className="px-4 py-3 text-right font-medium">예산액</th>
                <th className="px-4 py-3 text-right font-medium">비중</th>
                <th className="px-4 py-3 text-right font-medium">전년 대비</th>
              </tr>
            </thead>
            <tbody>
              {body.map((r, i) => (
                <tr
                  key={`${r.code ?? "x"}-${i}`}
                  className="border-b border-[var(--line)]/40 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-2 text-[var(--muted)]">{r.code ?? "-"}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-right">{fmtKRW(r.amount)}</td>
                  <td className="px-4 py-2 text-right text-[var(--muted)]">
                    {r.share != null ? `${r.share}%` : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.diff != null ? (
                      <span className={r.diff >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {r.diff >= 0 ? "▲" : "▼"} {fmtKRW(Math.abs(r.diff))}
                        {r.growth != null && (
                          <span className="ml-1 text-[var(--muted)]">({r.growth}%)</span>
                        )}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setView("dashboard")}
          className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm hover:bg-white/[0.04]"
        >
          ← 돌아오기
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────── 대시보드 화면
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <a href="/" className="text-sm text-[var(--muted)] hover:underline">
            ← 전체 목록
          </a>
          <h1 className="mt-1 text-2xl font-bold">
            {header.nameKo} {header.year} {header.doctypeLabel}
          </h1>
        </div>
        {header.validation && (
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              header.validation.mismatches === 0
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-amber-500/15 text-amber-400"
            }`}
          >
            {header.validation.mismatches === 0
              ? "✓ 정합성 통과"
              : `⚠ 정합성 불일치 ${header.validation.mismatches}건`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="총 예산" value={fmtKRW(kpis.total)} />
        <Kpi label="일반회계" value={fmtKRW(kpis.general)} />
        <Kpi label="특별회계" value={fmtKRW(kpis.special)} />
        <Kpi
          label="전년 대비"
          value={kpis.total && kpis.growth != null ? `${kpis.growth}%` : "-"}
        />
      </div>

      {mismatches.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <div className="font-medium text-amber-400">데이터 품질 알림</div>
          <ul className="mt-1 list-disc pl-5 text-[var(--muted)]">
            {mismatches.map((c, i) => (
              <li key={i}>
                {c.name}: 차이 {(c.gap / 1000).toLocaleString("ko-KR")}천원 (ODL 행 누락 추정)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {accSlices.length > 0 && <PieChartCard title="회계별 예산 구성" data={accSlices} />}

        {data.revenueByJang.length > 0 && (
          <button
            type="button"
            onClick={() => setView("revenue")}
            className="group relative block w-full text-left transition hover:-translate-y-0.5"
            aria-label="세입 총괄 상세 보기"
          >
            <span className="pointer-events-none absolute right-5 top-5 z-10 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300 opacity-80 group-hover:opacity-100">
              자세히 →
            </span>
            <span className="block rounded-xl ring-1 ring-transparent group-hover:ring-blue-500/40">
              <BarChartCard title="세입 총괄 (장별)" data={data.revenueByJang} />
            </span>
          </button>
        )}

        {data.expByFunction.length > 0 && (
          <BarChartCard title="세출 기능별 (분야)" data={data.expByFunction} />
        )}
        {data.expByNature.length > 0 && (
          <BarChartCard title="세출 성질별 (편성목군)" data={data.expByNature} />
        )}
        {data.expByOrg.length > 0 && (
          <BarChartCard title="세출 조직별 (부서·과 상위)" data={data.expByOrg} />
        )}
        {data.movers.length > 0 && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h3 className="mb-3 font-semibold">전년 대비 증감 Top (분야)</h3>
            <ul className="space-y-2">
              {data.movers.map((m) => (
                <li key={m.code} className="flex items-center justify-between text-sm">
                  <span>{m.name}</span>
                  <span className={(m.diff ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {(m.diff ?? 0) >= 0 ? "▲" : "▼"} {fmtKRW(Math.abs(m.diff as number))}{" "}
                    <span className="text-[var(--muted)]">({m.growth}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {data.footer && (
        <p className="text-xs text-[var(--muted)]">
          세입 명세 {data.footer.mokCount}개 목 · {data.footer.title} · 단위 천원 · 파싱{" "}
          {data.footer.parsedAt}
        </p>
      )}
    </div>
  );
}

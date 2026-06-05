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
  revenueRows: RevenueTableRow[];
  expByFunction: Datum[];
  expByNature: Datum[];
  expByOrg: Datum[];
  expFunctionRows: RevenueTableRow[];
  expNatureRows: RevenueTableRow[];
  expOrgRows: RevenueTableRow[];
  movers: Mover[];
  footer: { mokCount: number; title: string; parsedAt: string | null } | null;
};

// 코드 계층 스킴: x00 = 3단계(장 X00 / 관 XY0 / 항 XYZ, 세입·성질별),
//               x0 = 2단계(분야 XY0 / 부문 XYZ, 기능별), flat = 코드없음(조직별)
type Scheme = "x00" | "x0" | "flat";

function codeLevel(code: string | null, scheme: Scheme): number {
  if (scheme === "flat" || !code || code.length !== 3) return 1;
  if (scheme === "x00") {
    if (code.endsWith("00")) return 1;
    if (code.endsWith("0")) return 2;
    return 3;
  }
  // x0
  return code.endsWith("0") ? 1 : 2;
}
function parentCode(code: string | null, scheme: Scheme): string | null {
  if (scheme === "flat" || !code || code.length !== 3) return null;
  const lvl = codeLevel(code, scheme);
  if (lvl === 1) return null;
  if (scheme === "x00" && lvl === 2) return code[0] + "00";
  return code.slice(0, 2) + "0";
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

// 차트 카드를 "자세히" 버튼으로 감싸기
function ChartButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full text-left transition hover:-translate-y-0.5"
      aria-label={label}
    >
      <span className="pointer-events-none absolute right-5 top-5 z-10 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300 opacity-80 group-hover:opacity-100">
        자세히 →
      </span>
      <span className="block rounded-xl ring-1 ring-transparent group-hover:ring-blue-500/40">
        {children}
      </span>
    </button>
  );
}

// 계층 펼침 표
function HierTable({
  rows,
  scheme,
  expanded,
  toggle,
}: {
  rows: RevenueTableRow[];
  scheme: Scheme;
  expanded: Set<string>;
  toggle: (code: string) => void;
}) {
  const codeSet = new Set(rows.map((r) => r.code).filter(Boolean) as string[]);
  const childCount = new Map<string, number>();
  for (const r of rows) {
    const p = parentCode(r.code, scheme);
    if (p && codeSet.has(p)) childCount.set(p, (childCount.get(p) ?? 0) + 1);
  }
  const isVisible = (code: string | null): boolean => {
    let p = parentCode(code, scheme);
    while (p) {
      if (codeSet.has(p) && !expanded.has(p)) return false;
      p = parentCode(p, scheme);
    }
    return true;
  };
  const shown = rows.filter((r) => isVisible(r.code));

  return (
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
          {shown.map((r, i) => {
            const lvl = codeLevel(r.code, scheme);
            const kids = r.code ? childCount.get(r.code) ?? 0 : 0;
            const open = r.code ? expanded.has(r.code) : false;
            return (
              <tr
                key={`${r.code ?? "x"}-${i}`}
                onClick={kids > 0 && r.code ? () => toggle(r.code!) : undefined}
                className={`border-b border-[var(--line)]/40 last:border-0 hover:bg-white/[0.02] ${
                  kids > 0 ? "cursor-pointer" : ""
                }`}
              >
                <td className="px-4 py-2 text-[var(--muted)]">{r.code ?? "-"}</td>
                <td className="px-4 py-2">
                  <span
                    style={{ paddingLeft: `${(lvl - 1) * 16}px` }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      className={`w-3 text-xs text-[var(--muted)] ${kids > 0 ? "" : "opacity-0"}`}
                    >
                      {open ? "▾" : "▸"}
                    </span>
                    <span className={lvl === 1 ? "font-medium" : ""}>{r.name}</span>
                    {kids > 0 && (
                      <span className="ml-1 rounded bg-white/[0.06] px-1 text-[10px] text-[var(--muted)]">
                        {kids}
                      </span>
                    )}
                  </span>
                </td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [view, setView] = useState<string>("dashboard");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { header, kpis, mismatches, accSlices } = data;

  const toggle = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  const open = (key: string) => {
    setExpanded(new Set());
    setView(key);
  };

  // 상세(드릴다운) 표 정의
  const DETAILS: Record<
    string,
    { title: string; totalLabel: string; barTitle: string; rows: RevenueTableRow[]; scheme: Scheme }
  > = {
    revenue: {
      title: "세입 총괄",
      totalLabel: "세입 총계",
      barTitle: "세입 총괄 (장별)",
      rows: data.revenueRows,
      scheme: "x00",
    },
    function: {
      title: "세출 기능별",
      totalLabel: "세출 총계",
      barTitle: "세출 기능별 (분야)",
      rows: data.expFunctionRows,
      scheme: "x0",
    },
    nature: {
      title: "세출 성질별",
      totalLabel: "세출 총계",
      barTitle: "세출 성질별 (편성목군)",
      rows: data.expNatureRows,
      scheme: "x00",
    },
    org: {
      title: "세출 조직별",
      totalLabel: "세출 총계",
      barTitle: "세출 조직별 (상위)",
      rows: data.expOrgRows,
      scheme: "flat",
    },
  };

  // ─────────────────────────────────────────── 상세(드릴다운) 화면
  const detail = DETAILS[view];
  if (detail) {
    const totalRow = detail.rows[0];
    const body = detail.rows.slice(1);
    const bar: Datum[] = body
      .filter((r) => codeLevel(r.code, detail.scheme) === 1 && r.amount != null)
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
      .slice(0, 30)
      .map((r) => ({ name: r.name, value: r.amount as number, share: r.share }));

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
              {header.nameKo} {header.year} {detail.title}
            </h1>
          </div>
          {totalRow?.amount != null && (
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">
              {detail.totalLabel} {fmtKRW(totalRow.amount)}
            </span>
          )}
        </div>

        {bar.length > 0 && (
          <BarChartCard
            title={`${detail.barTitle} 전체`}
            data={bar}
            height={Math.max(320, bar.length * 28)}
          />
        )}

        <p className="text-xs text-[var(--muted)]">
          상위 코드(장·분야)만 먼저 표시됩니다. 행을 누르면 하위 코드가 펼쳐집니다.
        </p>

        <HierTable rows={body} scheme={detail.scheme} expanded={expanded} toggle={toggle} />

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
          <ChartButton label="세입 총괄 상세 보기" onClick={() => open("revenue")}>
            <BarChartCard title="세입 총괄 (장별)" data={data.revenueByJang} />
          </ChartButton>
        )}

        {data.expByFunction.length > 0 && (
          <ChartButton label="세출 기능별 상세 보기" onClick={() => open("function")}>
            <BarChartCard title="세출 기능별 (분야)" data={data.expByFunction} />
          </ChartButton>
        )}
        {data.expByNature.length > 0 && (
          <ChartButton label="세출 성질별 상세 보기" onClick={() => open("nature")}>
            <BarChartCard title="세출 성질별 (편성목군)" data={data.expByNature} />
          </ChartButton>
        )}
        {data.expByOrg.length > 0 && (
          <ChartButton label="세출 조직별 상세 보기" onClick={() => open("org")}>
            <BarChartCard title="세출 조직별 (부서·과 상위)" data={data.expByOrg} />
          </ChartButton>
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

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

// 분류별 코드 계층 스킴:
//  revenue = 장 X00 → 관 XY0 → 항 XYZ
//  function = 분야 XY0 → 부문 XYZ
//  nature   = 편성목군 X00 → 편성목 XYZ → 통계목 XYZ-NN
//  org      = 코드 없음 → 실·국 금액 = 소속 과 금액 합, 으로 계층 복원
type Scheme = "revenue" | "function" | "nature" | "org";

type Node = {
  row: RevenueTableRow;
  key: string;
  level: number;
  parentKey: string | null;
  hasChildren: boolean;
};

function codeParent(code: string, scheme: Scheme): string | null {
  if (scheme === "revenue") {
    if (code.length !== 3 || code.endsWith("00")) return null;
    if (code.endsWith("0")) return code[0] + "00";
    return code.slice(0, 2) + "0";
  }
  if (scheme === "function") {
    if (code.length !== 3 || code.endsWith("0")) return null;
    return code.slice(0, 2) + "0";
  }
  if (scheme === "nature") {
    if (/^\d{3}-\d{2}$/.test(code)) return code.slice(0, 3);
    if (code.length !== 3 || code.endsWith("00")) return null;
    return code[0] + "00";
  }
  return null;
}

// 행 배열 → 계층 노드 배열 (표시 순서 유지)
function buildNodes(rows: RevenueTableRow[], scheme: Scheme): Node[] {
  if (scheme === "org") {
    // 실·국 행 다음에 그 과들이 이어지고, 과 금액 합 = 실국 금액
    const nodes: Node[] = [];
    let i = 0;
    while (i < rows.length) {
      const parent = rows[i];
      const pkey = `o${i}`;
      const target = parent.amount ?? 0;
      i++;
      const children: { row: RevenueTableRow; idx: number }[] = [];
      let acc = 0;
      while (i < rows.length && acc < target) {
        children.push({ row: rows[i], idx: i });
        acc += rows[i].amount ?? 0;
        i++;
      }
      // 단일 과가 실국과 동일(직속 담당관) → 중복이므로 펼침 없는 단일 행
      const redundant = children.length === 1 && (children[0].row.amount ?? 0) === target;
      if (redundant || children.length === 0) {
        nodes.push({ row: parent, key: pkey, level: 1, parentKey: null, hasChildren: false });
      } else {
        nodes.push({ row: parent, key: pkey, level: 1, parentKey: null, hasChildren: true });
        for (const c of children)
          nodes.push({ row: c.row, key: `o${c.idx}`, level: 2, parentKey: pkey, hasChildren: false });
      }
    }
    return nodes;
  }

  // 코드 기반 분류
  const codeSet = new Set(rows.map((r) => r.code).filter(Boolean) as string[]);
  const nodes: Node[] = rows.map((r, idx) => {
    let parentKey = r.code ? codeParent(r.code, scheme) : null;
    if (parentKey && !codeSet.has(parentKey)) parentKey = null; // 부모 누락 → 루트로
    return { row: r, key: r.code ?? `_${idx}`, level: 1, parentKey, hasChildren: false };
  });
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const hasKids = new Set(nodes.map((n) => n.parentKey).filter(Boolean) as string[]);
  for (const n of nodes) {
    let lvl = 1;
    let p = n.parentKey;
    const seen = new Set<string>();
    while (p && byKey.has(p) && !seen.has(p)) {
      seen.add(p);
      lvl++;
      p = byKey.get(p)!.parentKey;
    }
    n.level = lvl;
    n.hasChildren = hasKids.has(n.key);
  }
  return nodes;
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
  nodes,
  expanded,
  toggle,
}: {
  nodes: Node[];
  expanded: Set<string>;
  toggle: (key: string) => void;
}) {
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const childCount = new Map<string, number>();
  for (const n of nodes) {
    if (n.parentKey) childCount.set(n.parentKey, (childCount.get(n.parentKey) ?? 0) + 1);
  }
  const isVisible = (n: Node): boolean => {
    let p = n.parentKey;
    const seen = new Set<string>();
    while (p && byKey.has(p) && !seen.has(p)) {
      seen.add(p);
      if (!expanded.has(p)) return false;
      p = byKey.get(p)!.parentKey;
    }
    return true;
  };
  const shown = nodes.filter(isVisible);

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
          {shown.map((n) => {
            const r = n.row;
            const lvl = n.level;
            const kids = n.hasChildren ? childCount.get(n.key) ?? 0 : 0;
            const open = expanded.has(n.key);
            return (
              <tr
                key={n.key}
                onClick={kids > 0 ? () => toggle(n.key) : undefined}
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
      scheme: "revenue",
    },
    function: {
      title: "세출 기능별",
      totalLabel: "세출 총계",
      barTitle: "세출 기능별 (분야)",
      rows: data.expFunctionRows,
      scheme: "function",
    },
    nature: {
      title: "세출 성질별",
      totalLabel: "세출 총계",
      barTitle: "세출 성질별 (편성목군)",
      rows: data.expNatureRows,
      scheme: "nature",
    },
    org: {
      title: "세출 조직별",
      totalLabel: "세출 총계",
      barTitle: "세출 조직별 (실·국별)",
      rows: data.expOrgRows,
      scheme: "org",
    },
  };

  // ─────────────────────────────────────────── 상세(드릴다운) 화면
  const detail = DETAILS[view];
  if (detail) {
    const totalRow = detail.rows[0];
    const body = detail.rows.slice(1);
    const nodes = buildNodes(body, detail.scheme);
    const bar: Datum[] = nodes
      .filter((n) => n.level === 1 && n.row.amount != null)
      .sort((a, b) => (b.row.amount ?? 0) - (a.row.amount ?? 0))
      .slice(0, 30)
      .map((n) => ({ name: n.row.name, value: n.row.amount as number, share: n.row.share }));

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

        <HierTable nodes={nodes} expanded={expanded} toggle={toggle} />

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

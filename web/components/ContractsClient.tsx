"use client";
import { useMemo, useState } from "react";
import BarChartCard, { type Datum } from "@/components/BarChartCard";
import PieChartCard, { type Slice } from "@/components/PieChartCard";
import SeoulBoundaryMap from "@/components/SeoulBoundaryMap";

// 계약현황(지급처) 대시보드. 금액 단위는 '원'.
function fmtWon(won: number | null): string {
  if (won == null) return "-";
  const eok = won / 1e8;
  if (Math.abs(eok) >= 1) return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
  const man = won / 1e4;
  if (Math.abs(man) >= 1) return `${man.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만`;
  return `${won.toLocaleString("ko-KR")}원`;
}

type Group = { name?: string; vendor?: string; month?: string; count: number; amount: number };
export type ContractsData = {
  district: string;
  laf_hg_nm: string;
  year: string;
  total_count: number;
  total_amount: number;
  distinct_vendors: number;
  top_vendors: Group[];
  by_kind: Group[];
  by_method: Group[];
  by_month: Group[];
  all_vendors: Group[]; // 검색용 전체
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

export default function ContractsClient({ data }: { data: ContractsData }) {
  const [q, setQ] = useState("");

  const vendorBar: Datum[] = data.top_vendors
    .slice(0, 15)
    .map((v) => ({ name: v.vendor ?? "", value: v.amount }));
  const kindSlices: Slice[] = data.by_kind.map((k) => ({ name: k.name ?? "", value: k.amount }));
  const methodSlices: Slice[] = data.by_method.map((m) => ({ name: m.name ?? "", value: m.amount }));
  const monthBar: Datum[] = [...data.by_month]
    .sort((a, b) => (a.month ?? "").localeCompare(b.month ?? ""))
    .map((m) => ({ name: (m.month ?? "").slice(4) + "월", value: m.amount }));

  const filtered = useMemo(() => {
    const kw = q.trim();
    const list = kw
      ? data.all_vendors.filter((v) => (v.vendor ?? "").includes(kw))
      : data.all_vendors;
    return list.slice(0, 200);
  }, [q, data.all_vendors]);

  return (
    <div className="space-y-6">
      <div>
        <a href="/" className="text-sm text-[var(--muted)] hover:underline">← 전체 목록</a>
        <h1 className="mt-1 text-2xl font-bold">
          {data.laf_hg_nm} {data.year} 지급처(계약) 분석
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          지방재정365 계약현황 데이터 · 예산·결산의 숫자를 실제 지급받은 <b>업체</b>로 연결합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="총 계약금액" value={fmtWon(data.total_amount)} />
        <Kpi label="계약 건수" value={data.total_count.toLocaleString("ko-KR") + "건"} />
        <Kpi label="지급처(업체) 수" value={data.distinct_vendors.toLocaleString("ko-KR") + "곳"} />
        <Kpi
          label="건당 평균"
          value={fmtWon(data.total_count ? Math.round(data.total_amount / data.total_count) : 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SeoulBoundaryMap active={data.district} activeAmount={data.total_amount} />
        <BarChartCard title="상위 지급처 업체 (계약금액)" data={vendorBar} height={420} won valueLabel="계약액" />
        {kindSlices.length > 0 && (
          <PieChartCard title="계약종류별 (용역·공사·물품)" data={kindSlices} won valueLabel="계약액" />
        )}
        {methodSlices.length > 0 && (
          <PieChartCard title="계약방법별 (경쟁·수의)" data={methodSlices} won valueLabel="계약액" />
        )}
        {monthBar.length > 0 && (
          <BarChartCard title="월별 계약금액" data={monthBar} height={320} won valueLabel="계약액" />
        )}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">지급처 검색</h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="업체명 검색…"
            className="w-56 rounded-lg border border-[var(--line)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                <th className="px-3 py-2 font-medium">업체</th>
                <th className="px-3 py-2 text-right font-medium">계약 건수</th>
                <th className="px-3 py-2 text-right font-medium">계약금액</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={i} className="border-b border-[var(--line)]/40 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3 py-2">{v.vendor}</td>
                  <td className="px-3 py-2 text-right text-[var(--muted)]">{v.count}</td>
                  <td className="px-3 py-2 text-right">{fmtWon(v.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--muted)]">일치하는 업체가 없습니다.</p>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">
            상위 200곳까지 표시 · 총 {data.distinct_vendors.toLocaleString("ko-KR")}곳
          </p>
        </div>
      </div>
    </div>
  );
}

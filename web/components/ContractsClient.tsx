"use client";
import { useMemo, useState } from "react";
import BarChartCard, { type Datum } from "@/components/BarChartCard";
import PieChartCard, { type Slice } from "@/components/PieChartCard";

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

// 서울 25개 자치구 근사 중심좌표 (지도 마커 배치용). slug 는 districts.json 과 일치.
const GU: Record<string, { ko: string; lat: number; lng: number }> = {
  gangnam: { ko: "강남", lat: 37.5172, lng: 127.0473 },
  gangdong: { ko: "강동", lat: 37.5301, lng: 127.1238 },
  gangbuk: { ko: "강북", lat: 37.6396, lng: 127.0257 },
  gangseo: { ko: "강서", lat: 37.5509, lng: 126.8495 },
  gwanak: { ko: "관악", lat: 37.4784, lng: 126.9516 },
  gwangjin: { ko: "광진", lat: 37.5385, lng: 127.0823 },
  guro: { ko: "구로", lat: 37.4954, lng: 126.8874 },
  geumcheon: { ko: "금천", lat: 37.4569, lng: 126.8955 },
  nowon: { ko: "노원", lat: 37.6542, lng: 127.0568 },
  dobong: { ko: "도봉", lat: 37.6688, lng: 127.0471 },
  dongdaemun: { ko: "동대문", lat: 37.5744, lng: 127.0398 },
  dongjak: { ko: "동작", lat: 37.5124, lng: 126.9393 },
  mapo: { ko: "마포", lat: 37.5663, lng: 126.9019 },
  seodaemun: { ko: "서대문", lat: 37.5791, lng: 126.9368 },
  seocho: { ko: "서초", lat: 37.4837, lng: 127.0324 },
  seongdong: { ko: "성동", lat: 37.5633, lng: 127.0371 },
  seongbuk: { ko: "성북", lat: 37.5894, lng: 127.0167 },
  songpa: { ko: "송파", lat: 37.5145, lng: 127.106 },
  yangcheon: { ko: "양천", lat: 37.5169, lng: 126.8664 },
  yeongdeungpo: { ko: "영등포", lat: 37.5264, lng: 126.8962 },
  yongsan: { ko: "용산", lat: 37.5384, lng: 126.9654 },
  eunpyeong: { ko: "은평", lat: 37.6027, lng: 126.9291 },
  jongno: { ko: "종로", lat: 37.5735, lng: 126.979 },
  jung: { ko: "중", lat: 37.5636, lng: 126.9976 },
  jungnang: { ko: "중랑", lat: 37.6063, lng: 127.0927 },
};

// 서울 미니맵: 데이터 있는 구는 금액 비례 마커로 강조, 나머지는 옅은 점.
function SeoulMiniMap({ active, activeAmount }: { active: string; activeAmount: number }) {
  const W = 460, H = 360, pad = 30;
  const lats = Object.values(GU).map((g) => g.lat);
  const lngs = Object.values(GU).map((g) => g.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const px = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * pad);
  const py = (lat: number) => pad + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * pad);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h3 className="mb-1 font-semibold">지도 · 지급처 위치(자치구)</h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        현재 강조된 구의 계약 총액 {fmtWon(activeAmount)}. 다른 구는 데이터 수집 시 채워집니다.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {Object.entries(GU).map(([slug, g]) => {
          const on = slug === active;
          const r = on ? Math.max(10, Math.min(34, Math.sqrt(activeAmount / 1e8) * 1.6)) : 4;
          return (
            <g key={slug}>
              <circle
                cx={px(g.lng)}
                cy={py(g.lat)}
                r={r}
                fill={on ? "rgba(59,130,246,0.35)" : "rgba(148,163,184,0.18)"}
                stroke={on ? "#3b82f6" : "rgba(148,163,184,0.35)"}
                strokeWidth={on ? 2 : 1}
              />
              <text
                x={px(g.lng)}
                y={py(g.lat) + (on ? 0 : 3) + (on ? r + 12 : 0)}
                textAnchor="middle"
                className={on ? "fill-blue-300" : "fill-slate-500"}
                fontSize={on ? 12 : 9}
                fontWeight={on ? 700 : 400}
              >
                {g.ko}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
        <SeoulMiniMap active={data.district} activeAmount={data.total_amount} />
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

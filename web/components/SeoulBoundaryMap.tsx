"use client";
import gu from "@/lib/seoul_gu_paths.json";

// 서울 25개 자치구 경계 SVG 지도. 데이터 있는 구(active)를 강조·금액 음영.
// 새 의존성 없이 정적 export 가능. 25구 확장 시 amounts 에 값만 채우면 코로플레스.
type Props = {
  active: string; // 강조할 구 slug
  activeAmount: number; // 강조 구 금액(원)
  amounts?: Record<string, number>; // slug -> 금액 (25구 확장용, 옵션)
};

function eok(won: number): string {
  const v = won / 1e8;
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}조`;
  return `${v.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}억`;
}

export default function SeoulBoundaryMap({ active, activeAmount, amounts }: Props) {
  const map = amounts ?? { [active]: activeAmount };
  const vals = Object.values(map).filter((v) => v > 0);
  const max = vals.length ? Math.max(...vals) : 1;

  const fillFor = (slug: string): string => {
    const v = map[slug] ?? 0;
    if (v <= 0) return "rgba(148,163,184,0.06)";
    const t = Math.sqrt(v / max); // 제곱근 스케일로 대비 완화
    return `rgba(59,130,246,${(0.15 + t * 0.6).toFixed(3)})`;
  };

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h3 className="mb-1 font-semibold">지도 · 자치구 경계</h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        강조된 구 계약 총액 {eok(activeAmount)}. 다른 구는 수집 시 금액 음영으로 채워집니다.
      </p>
      <svg viewBox={gu.viewBox} className="w-full">
        {gu.districts.map((d) => {
          const on = d.slug === active;
          return (
            <path
              key={d.slug}
              d={d.path}
              fill={fillFor(d.slug)}
              stroke={on ? "#3b82f6" : "rgba(148,163,184,0.35)"}
              strokeWidth={on ? 2 : 0.7}
            >
              <title>{d.ko}{map[d.slug] ? ` · ${eok(map[d.slug])}` : ""}</title>
            </path>
          );
        })}
        {gu.districts.map((d) => {
          const on = d.slug === active;
          return (
            <text
              key={`t-${d.slug}`}
              x={d.cx}
              y={d.cy}
              textAnchor="middle"
              className={on ? "fill-blue-100" : "fill-slate-500"}
              fontSize={on ? 13 : 9}
              fontWeight={on ? 700 : 400}
            >
              {d.ko}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

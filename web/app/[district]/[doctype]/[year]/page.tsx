import {
  getCatalog,
  getMeta,
  getRevenue,
  getSummary,
  type SummaryTable,
} from "@/lib/data";
import { type Datum } from "@/components/BarChartCard";
import { type Slice } from "@/components/PieChartCard";
import DashboardClient from "@/components/DashboardClient";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getCatalog().datasets.map((d) => ({
    district: d.district,
    doctype: d.doctype,
    year: d.year,
  }));
}

type Params = Promise<{ district: string; doctype: string; year: string }>;

// scope의 행에서 조건에 맞는 1단계 분류만 Datum[]로
function toData(
  table: SummaryTable | undefined,
  scope: string,
  isTop: (code: string | null) => boolean,
  topN = 12,
): Datum[] {
  if (!table) return [];
  const st = table.subtables.find((s) => s.scope === scope);
  if (!st) return [];
  return st.rows
    .slice(1)
    .filter((r) => isTop(r.code) && r.amount != null)
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, topN)
    .map((r) => ({ name: r.name, value: r.amount as number, share: r.share }));
}

export default async function Dashboard({ params }: { params: Params }) {
  const { district, doctype, year } = await params;
  const cat = getCatalog();
  const item = cat.datasets.find(
    (d) => d.district === district && d.doctype === doctype && d.year === year,
  );
  const summary = getSummary(district, doctype, year);
  const revenue = getRevenue(district, doctype, year);
  const meta = getMeta(district, doctype, year);
  if (!item || !summary) notFound();

  const nameKo = item.name_ko;
  const accounts = summary.accounts as SummaryTable | undefined;
  const revenueT = summary.revenue_summary as SummaryTable | undefined;
  const fn = summary.exp_by_function as SummaryTable | undefined;
  const org = summary.exp_by_org as SummaryTable | undefined;
  const nature = summary.exp_by_nature as SummaryTable | undefined;

  const total =
    accounts?.subtables[0]?.rows[0]?.amount ?? null;

  // 회계별: 일반회계 + 말단 특별회계들
  const accRows = accounts?.subtables[0]?.rows ?? [];
  const accSlices: Slice[] = accRows
    .filter(
      (r) =>
        r.name === "일반회계" ||
        (r.name.endsWith("특별회계") &&
          r.name !== "특별회계" &&
          r.name !== "기타특별회계"),
    )
    .map((r) => ({ name: r.name.replace("특별회계", "특별"), value: r.amount as number }));

  const revenueByJang = toData(revenueT, "전체", (c) => !!c && c.length === 3 && c.endsWith("00"));
  const expByFunction = toData(fn, "전체", (c) => !!c && c.length === 3 && c.endsWith("0"));
  const expByNature = toData(nature, "전체", (c) => !!c && c.length === 3 && c.endsWith("00"));
  // 조직별: 코드가 없어 상위/하위 구분 어려움 → 금액 상위 12개 (부서·과 혼재)
  const expByOrg = toData(org, "전체", () => true);

  // 전년 대비 증감 Top movers (기능별 분야)
  const movers = (fn?.subtables.find((s) => s.scope === "전체")?.rows ?? [])
    .slice(1)
    .filter((r) => r.code && r.code.endsWith("0") && r.code.length === 3 && r.diff != null)
    .sort((a, b) => Math.abs(b.diff as number) - Math.abs(a.diff as number))
    .slice(0, 6);

  // 세입총괄 상세용: 장별 전체(최대 30개) + 전체 scope 원본 행 테이블
  const revenueByJangFull = toData(
    revenueT,
    "전체",
    (c) => !!c && c.length === 3 && c.endsWith("00"),
    30,
  );
  const revenueRows = (revenueT?.subtables.find((s) => s.scope === "전체")?.rows ?? []).map(
    (r) => ({
      code: r.code,
      name: r.name,
      amount: r.amount,
      share: r.share,
      diff: r.diff,
      growth: r.growth,
    }),
  );

  const val = summary._validation;
  const mismatches = Object.values(val)
    .flat()
    .filter((c) => !c.ok)
    .map((c) => ({ name: c.name, gap: c.gap }));

  return (
    <DashboardClient
      data={{
        header: {
          nameKo,
          year,
          doctypeLabel: cat.doctypes[doctype] ?? doctype,
          validation: item.validation
            ? { mismatches: item.validation.mismatches }
            : null,
        },
        kpis: {
          total,
          general: accRows.find((r) => r.name === "일반회계")?.amount ?? null,
          special: accRows.find((r) => r.name === "특별회계")?.amount ?? null,
          growth: accounts?.subtables[0]?.rows[0]?.growth ?? null,
        },
        mismatches,
        accSlices,
        revenueByJang,
        revenueByJangFull,
        revenueRows,
        expByFunction,
        expByNature,
        expByOrg,
        movers: movers.map((m) => ({
          code: m.code,
          name: m.name,
          diff: m.diff,
          growth: m.growth,
        })),
        footer: revenue
          ? {
              mokCount: revenue.rows.filter((r) => r.kind === "목").length,
              title: (meta?.title as string) ?? "",
              parsedAt: item.parsed_at,
            }
          : null,
      }}
    />
  );
}

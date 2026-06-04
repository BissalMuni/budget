// data/ 트리(레포 루트)에서 parsed JSON과 catalog를 읽는다 (서버 전용).
import fs from "node:fs";
import path from "node:path";

// web/의 부모 = 레포 루트, 그 아래 data/
const DATA = path.join(process.cwd(), "..", "data");

export type SummaryRow = {
  code: string | null;
  name: string;
  amount: number | null;
  share: number | null;
  prev_amount: number | null;
  prev_share: number | null;
  diff: number | null;
  growth: number | null;
};
export type SubTable = { scope: string; rows: SummaryRow[] };
export type SummaryTable = { title: string; subtables: SubTable[] };
export type ValidationCheck = {
  name: string;
  ok: boolean;
  total: number;
  sum: number;
  gap: number;
  n_top?: number;
};
export type Summary = {
  [key: string]: SummaryTable | Record<string, ValidationCheck[]>;
  _validation: Record<string, ValidationCheck[]>;
};

export type RevenueRow = {
  level: number;
  kind: string;
  code: string | null;
  name: string;
  account: string | null;
  amount: number | null;
  prev_amount: number | null;
  diff: number | null;
  accounts?: string[];
  depts?: string[];
  detail_raw?: string;
};
export type Revenue = { district: string; year: string; rows: RevenueRow[] };

export type DatasetItem = {
  district: string;
  name_ko: string;
  code: string | null;
  doctype: string;
  year: string;
  title: string | null;
  total_pages: number | null;
  parsed: Record<string, boolean>;
  parsed_at: string | null;
  validation: { checks: number; mismatches: number } | null;
};
export type Catalog = {
  districts: Record<string, { name_ko: string; code: string }>;
  doctypes: Record<string, string>;
  datasets: DatasetItem[];
  count: number;
};

function readJson<T>(...parts: string[]): T | null {
  const p = path.join(DATA, ...parts);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

export function getCatalog(): Catalog {
  return (
    readJson<Catalog>("catalog.json") ?? {
      districts: {},
      doctypes: {},
      datasets: [],
      count: 0,
    }
  );
}

export function getSummary(d: string, t: string, y: string): Summary | null {
  return readJson<Summary>(d, t, y, "parsed", "summary.json");
}

export function getRevenue(d: string, t: string, y: string): Revenue | null {
  return readJson<Revenue>(d, t, y, "parsed", "revenue.json");
}

export function getMeta(d: string, t: string, y: string): Record<string, unknown> | null {
  return readJson(d, t, y, "meta.json");
}

// 표에서 특정 scope의 행을 꺼내고, 1단계(최상위) 분류만 필터
export function topRows(
  table: SummaryTable | undefined,
  scope = "전체",
  isTop?: (code: string | null) => boolean,
): SummaryRow[] {
  if (!table) return [];
  const st = table.subtables.find((s) => s.scope === scope);
  if (!st) return [];
  const body = st.rows.slice(1); // 총계 제외
  return isTop ? body.filter((r) => isTop(r.code)) : body;
}

export const fmtKRW = (vThousand: number | null): string => {
  if (vThousand == null) return "-";
  const won = vThousand * 1000;
  const eok = won / 1e8;
  if (Math.abs(eok) >= 1) return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}억`;
  return `${won.toLocaleString("ko-KR")}원`;
};

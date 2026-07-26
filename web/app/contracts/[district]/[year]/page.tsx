import { getContractAgg, listContractDatasets } from "@/lib/data";
import ContractsClient from "@/components/ContractsClient";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return listContractDatasets().map((d) => ({ district: d.district, year: d.year }));
}

type Params = Promise<{ district: string; year: string }>;

export default async function ContractsPage({ params }: { params: Params }) {
  const { district, year } = await params;
  const agg = getContractAgg(district, year);
  if (!agg) notFound();

  return (
    <ContractsClient
      data={{
        district: agg.district,
        laf_hg_nm: agg.laf_hg_nm,
        year: agg.year,
        total_count: agg.total_count,
        total_amount: agg.total_amount,
        distinct_vendors: agg.distinct_vendors,
        top_vendors: agg.top_vendors,
        by_kind: agg.by_kind,
        by_method: agg.by_method,
        by_month: agg.by_month,
        all_vendors: agg.all_vendors,
      }}
    />
  );
}

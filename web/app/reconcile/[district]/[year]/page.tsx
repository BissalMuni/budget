import { getReconcile, listReconcileDatasets } from "@/lib/data";
import ReconcileClient from "@/components/ReconcileClient";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return listReconcileDatasets().map((d) => ({ district: d.district, year: d.year }));
}

type Params = Promise<{ district: string; year: string }>;

export default async function ReconcilePage({ params }: { params: Params }) {
  const { district, year } = await params;
  const rec = getReconcile(district, year);
  if (!rec) notFound();

  return (
    <ReconcileClient
      data={{
        laf_hg_nm: rec.laf_hg_nm,
        settle_year: rec.settle_year,
        budget_basis: rec.budget_basis,
        note: rec.note,
        totals: rec.totals,
        rows: rec.rows,
      }}
    />
  );
}

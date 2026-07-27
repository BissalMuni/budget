import { getCatalog, listContractDatasets, listReconcileDatasets } from "@/lib/data";

export default function Home() {
  const cat = getCatalog();
  const contracts = listContractDatasets();
  const reconciles = listReconcileDatasets();
  const byDistrict = new Map<string, typeof cat.datasets>();
  for (const d of cat.datasets) {
    if (!byDistrict.has(d.district)) byDistrict.set(d.district, []);
    byDistrict.get(d.district)!.push(d);
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">서울 자치구 예산 · 결산 분석</h1>
        <p className="mt-2 text-[var(--muted)]">
          예산서 PDF를 구조화 데이터로 파싱해 시각화합니다. 자치구 · 연도 · 예산/결산별로
          데이터를 쌓아 비교합니다. 현재 {cat.count}개 데이터셋.
        </p>
      </section>

      <section className="space-y-4">
        {cat.datasets.length === 0 && (
          <p className="text-[var(--muted)]">아직 파싱된 데이터셋이 없습니다.</p>
        )}
        {[...byDistrict.entries()].map(([district, items]) => (
          <div key={district} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="text-lg font-semibold">
              {items[0].name_ko}
              <span className="ml-2 text-sm text-[var(--muted)]">{district}</span>
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {items.map((d) => {
                const ok = d.validation ? d.validation.mismatches === 0 : null;
                return (
                  <a
                    key={`${d.doctype}-${d.year}`}
                    href={`/${d.district}/${d.doctype}/${d.year}`}
                    className="group rounded-lg border border-[var(--line)] px-4 py-3 hover:border-blue-500 transition-colors"
                  >
                    <div className="font-medium">
                      {d.year} {cat.doctypes[d.doctype] ?? d.doctype}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {Object.entries(d.parsed)
                        .filter(([, v]) => v)
                        .map(([k]) => k)
                        .join(" · ") || "미파싱"}
                    </div>
                    {ok !== null && (
                      <div className={`mt-1 text-xs ${ok ? "text-emerald-400" : "text-amber-400"}`}>
                        {ok ? "✓ 정합성 통과" : `⚠ 불일치 ${d.validation!.mismatches}건`}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {reconciles.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">예산 · 결산 매칭</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              당초예산(예산서)과 결산·집행(지방재정365)을 회계별로 연결해 집행률을 봅니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {reconciles.map((c) => (
              <a
                key={`${c.district}-${c.year}`}
                href={`/reconcile/${c.district}/${c.year}`}
                className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-3 hover:border-blue-500 transition-colors"
              >
                <div className="font-medium">
                  {c.name_ko} <span className="text-sm text-[var(--muted)]">{c.year} 예산·결산</span>
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">회계별 예산 대비 집행</div>
              </a>
            ))}
          </div>
        </section>
      )}

      {contracts.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">지급처(계약) 분석</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              예산·결산의 숫자를 실제 지급받은 <b>업체</b>로 연결합니다 (지방재정365 계약현황).
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {contracts.map((c) => (
              <a
                key={`${c.district}-${c.year}`}
                href={`/contracts/${c.district}/${c.year}`}
                className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-3 hover:border-blue-500 transition-colors"
              >
                <div className="font-medium">
                  {c.name_ko} <span className="text-sm text-[var(--muted)]">{c.year} 지급처</span>
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">계약현황 · 업체별 지급 지도</div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

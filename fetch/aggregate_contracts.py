# 수집한 계약현황 원자료(contracts.json)를 업체·계약종류·계약방법·월별로 집계한다.
# 최종목적: "어느 자치단체가 어떤 업체에 얼마 지급했는지" → 지도/대시보드 입력.
#
# 사용: python fetch/aggregate_contracts.py <district> <year>
import os
import sys
import json
from collections import defaultdict


def amt(r):
    try:
        return int(r.get("ctrt_tot_tott_amt") or 0)
    except (TypeError, ValueError):
        return 0


def main():
    district = sys.argv[1] if len(sys.argv) > 1 else "gangnam"
    year = sys.argv[2] if len(sys.argv) > 2 else "2024"
    base = os.path.join("data", district, "contracts", year)
    rows = json.load(open(os.path.join(base, "contracts.json"), encoding="utf-8"))

    def group(keyfn):
        g = defaultdict(lambda: {"count": 0, "amount": 0})
        for r in rows:
            k = keyfn(r) or "(미상)"
            g[k]["count"] += 1
            g[k]["amount"] += amt(r)
        return dict(sorted(g.items(), key=lambda kv: -kv[1]["amount"]))

    by_vendor = group(lambda r: r.get("clt_nm"))
    by_kind = group(lambda r: r.get("ctrt_knd_nm"))
    by_method = group(lambda r: r.get("ctrt_mth_nm"))
    by_month = group(lambda r: (r.get("_ymd") or "")[:6])

    laf_nm = rows[0].get("laf_hg_nm") if rows else district
    result = {
        "district": district, "laf_hg_nm": laf_nm, "year": year,
        "total_count": len(rows),
        "total_amount": sum(amt(r) for r in rows),
        "distinct_vendors": len(by_vendor),
        "top_vendors": [{"vendor": k, **v} for k, v in list(by_vendor.items())[:50]],
        "all_vendors": [{"vendor": k, **v} for k, v in by_vendor.items()],
        "by_kind": [{"name": k, **v} for k, v in by_kind.items()],
        "by_method": [{"name": k, **v} for k, v in by_method.items()],
        "by_month": [{"month": k, **v} for k, v in by_month.items()],
    }
    out = os.path.join(base, "aggregated.json")
    json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    def won(n):
        return f"{n/1e8:,.1f}억"
    print(f"[{laf_nm} {year}] 계약 {result['total_count']:,}건 / 총 {won(result['total_amount'])} / 업체 {result['distinct_vendors']:,}곳")
    print("상위 지급처(업체):")
    for v in result["top_vendors"][:12]:
        print(f"  - {v['vendor'][:28]:28s} {v['count']:>4}건  {won(v['amount'])}")
    print("계약종류별:", {v['name']: won(v['amount']) for v in result['by_kind']})
    print("계약방법별:", {v['name']: won(v['amount']) for v in result['by_method'][:6]})
    print("wrote", out)


if __name__ == "__main__":
    main()

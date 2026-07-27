# 예산-결산 매칭: 당초예산(예산서) vs 결산(집행, 지방재정365 API)을 회계별로 연결한다.
#
# 예산: data/<d>/budget/2025/parsed/summary.json 의 '회계별 예산규모' 표.
#       그 표의 전년도값(prev_amount)이 2024 당초예산이므로 2024 결산과 짝이 맞는다.
#       (2025 결산은 아직 미공개 → 2024로 매칭)
# 결산: lofin365 세출결산(AJGCF)·세입결산(IIBBH), 강남 laf_cd=1133000, 단위 원.
# 단위 통일: 예산서는 천원 → ×1000 하여 '원'으로.
#
# 사용: LOFIN_KEY=키 python fetch/reconcile.py <district> <laf_cd> <settle_year>
#   예: python fetch/reconcile.py gangnam 1133000 2024
import os
import sys
import json
import importlib.util
import urllib.parse
import urllib.request

spec = importlib.util.spec_from_file_location("lofin", "fetch/lofin_api.py")
lofin = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lofin)


def api(uri, fyr, laf_cd):
    key = os.environ["LOFIN_KEY"]
    params = {"Key": key, "Type": "json", "pIndex": 1, "pSize": 400, "fyr": fyr}
    url = lofin.HOST + uri + "?" + urllib.parse.urlencode(params)
    raw = urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=40
    ).read().decode("utf-8")
    o = json.loads(raw)
    k = list(o.keys())[0]
    if k == "RESULT":
        return None
    hit = [r for r in o[k][1]["row"] if r["laf_cd"] == laf_cd]
    return hit[0] if hit else None


def acc_prev(accounts_rows, name):
    """회계별 예산규모 표에서 name 행의 전년도(=결산연도) 당초예산(천원→원)."""
    for r in accounts_rows:
        if r["name"].replace(" ", "") == name:
            return (r["prev_amount"] or 0) * 1000
    return None


def rate(num, den):
    return round(num / den * 100, 1) if den else None


def main():
    district = sys.argv[1] if len(sys.argv) > 1 else "gangnam"
    laf_cd = sys.argv[2] if len(sys.argv) > 2 else "1133000"
    syear = sys.argv[3] if len(sys.argv) > 3 else "2024"

    # 예산서(2025)에서 전년도(=syear) 당초예산 추출
    summ = json.load(open(os.path.join("data", district, "budget", "2025",
                                        "parsed", "summary.json"), encoding="utf-8"))
    acc_rows = summ["accounts"]["subtables"][0]["rows"]
    bud_general = acc_prev(acc_rows, "일반회계")
    bud_special = acc_prev(acc_rows, "특별회계")
    bud_total = acc_prev(acc_rows, "총계")

    # 결산(API)
    se = api("AJGCF", syear, laf_cd)   # 세출결산
    si = api("IIBBH", syear, laf_cd)   # 세입결산
    assert se and si, "결산 데이터 없음"
    exp_general = se["pfa_amt1"]
    exp_special = se["pfa_amt3"] + se["pfa_amt2"]   # 기타특별+공기업특별
    exp_fund = se["pfa_amt4"]                        # 기금(예산서 총괄엔 없음)
    exp_total = se["tot_pfa_amt"]
    rev_general = int(si["pfa_amt1"])
    rev_special = int(si["pfa_amt3"]) + int(si["pfa_amt2"])
    rev_total = int(si["total"])

    rows = [
        {"account": "일반회계", "budget": bud_general,
         "expenditure": exp_general, "revenue": rev_general,
         "exec_rate": rate(exp_general, bud_general)},
        {"account": "특별회계", "budget": bud_special,
         "expenditure": exp_special, "revenue": rev_special,
         "exec_rate": rate(exp_special, bud_special)},
        {"account": "기금", "budget": None,
         "expenditure": exp_fund, "revenue": None, "exec_rate": None,
         "note": "예산서 세입·세출 총괄엔 미포함(별도 기금운용계획)"},
    ]
    result = {
        "district": district,
        "laf_hg_nm": se["laf_hg_nm"],
        "settle_year": syear,
        "budget_basis": "당초예산 (2025 예산서의 전년도값)",
        "unit": "원",
        "note": ("결산은 예산현액(당초+추경+이월) 기준 집행액이라 당초예산 대비 "
                 "집행률이 100%를 넘을 수 있음. 2025 결산 미공개로 2024 매칭."),
        "totals": {
            "budget": bud_total,
            "expenditure": exp_total,
            "revenue": rev_total,
            "exec_rate": rate(exp_general + exp_special, bud_total),  # 기금 제외 대비
        },
        "rows": rows,
    }
    outdir = os.path.join("data", district, "reconcile", syear)
    os.makedirs(outdir, exist_ok=True)
    out = os.path.join(outdir, "reconcile.json")
    json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    def eok(n):
        return "-" if n is None else f"{n/1e8:,.0f}억"
    print(f"[{result['laf_hg_nm']} {syear} 예산-결산 매칭]")
    for r in rows:
        print(f"  {r['account']:6s} 당초예산 {eok(r['budget']):>9} | "
              f"세출결산 {eok(r['expenditure']):>9} | "
              f"집행률 {r['exec_rate'] if r['exec_rate'] is not None else '-'}%")
    print(f"  총계    당초예산 {eok(bud_total)} | 세출결산 {eok(exp_total)} | 세입결산 {eok(rev_total)}")
    print("wrote", out)


if __name__ == "__main__":
    main()

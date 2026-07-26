# 계약현황 API(WCEGCF)로 특정 자치단체의 1년치 계약을 날짜 순회로 수집한다.
# smz_ctrt_ymd 는 정확한 YYYYMMDD 만 받으므로 매일 호출(주말·공휴일은 INFO-200=0건).
# 일일 트래픽 제한(ERROR-337) 시 중단하고, 다음 실행 때 state 에서 이어받는다(재개 가능).
#
# 사용: LOFIN_KEY=... python fetch/harvest_contracts.py <laf_cd> <year>
#   예: python fetch/harvest_contracts.py 1133000 2024
import os
import sys
import json
import time
import datetime
import urllib.parse
import urllib.request

HOST = "https" + "://www.lofin365.go.kr/lf/hub/WCEGCF"


def call(key, laf_cd, ymd, pindex, psize=1000):
    params = {"Key": key, "Type": "json", "pIndex": pindex, "pSize": psize,
              "laf_cd": laf_cd, "smz_ctrt_ymd": ymd}
    url = HOST + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req, timeout=40).read().decode("utf-8")
    return json.loads(raw)


def day_rows(key, laf_cd, ymd):
    """하루치 전체 계약 행을 페이지네이션으로 모은다. (rows, status)"""
    o = call(key, laf_cd, ymd, 1)
    k = list(o.keys())[0]
    if k == "RESULT":
        code = o[k][0]["CODE"]
        return [], code            # INFO-200(무데이터) / ERROR-337(트래픽) 등
    total = o[k][0]["head"][0]["list_total_count"]
    rows = o[k][1]["row"]
    got = len(rows)
    pi = 2
    while got < total:
        o2 = call(key, laf_cd, ymd, pi)
        k2 = list(o2.keys())[0]
        if k2 != k:
            break
        r2 = o2[k2][1]["row"]
        rows += r2
        got += len(r2)
        pi += 1
        time.sleep(0.15)
    return rows, "INFO-000"


def main():
    key = os.environ.get("LOFIN_KEY")
    assert key, "env LOFIN_KEY 필요"
    laf_cd = sys.argv[1] if len(sys.argv) > 1 else "1133000"
    year = int(sys.argv[2]) if len(sys.argv) > 2 else 2024

    outdir = os.path.join("data", "gangnam", "contracts", str(year))
    os.makedirs(outdir, exist_ok=True)
    data_path = os.path.join(outdir, "contracts.json")
    state_path = os.path.join(outdir, "_state.json")

    # 재개: 기존 수집분 + 마지막 완료일
    all_rows = []
    done_dates = set()
    if os.path.exists(data_path):
        all_rows = json.load(open(data_path, encoding="utf-8"))
        done_dates = {r["_ymd"] for r in all_rows}
    if os.path.exists(state_path):
        done_dates |= set(json.load(open(state_path, encoding="utf-8")).get("done", []))

    d = datetime.date(year, 1, 1)
    end = datetime.date(year, 12, 31)
    done_list = sorted(done_dates)
    stopped = None
    n_days_data = 0
    while d <= end:
        ymd = d.strftime("%Y%m%d")
        if ymd in done_dates:
            d += datetime.timedelta(days=1)
            continue
        try:
            rows, status = day_rows(key, laf_cd, ymd)
        except Exception as e:
            stopped = f"EXC {ymd} {e}"
            break
        if status == "ERROR-337":
            stopped = f"일일 트래픽 제한 도달 @ {ymd} (다음 실행 때 이어서)"
            break
        for r in rows:
            r["_ymd"] = ymd
        all_rows += rows
        done_dates.add(ymd)
        done_list.append(ymd)
        if rows:
            n_days_data += 1
        if len(done_list) % 30 == 0:
            print(f"  ...{ymd} 누적 {len(all_rows)}건")
        time.sleep(0.15)
        d += datetime.timedelta(days=1)

    json.dump(all_rows, open(data_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"done": sorted(done_dates)}, open(state_path, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"저장: {data_path}  총 {len(all_rows)}건  (수집완료일수 {len(done_dates)}/{(end-datetime.date(year,1,1)).days+1})")
    if stopped:
        print("중단:", stopped)
    else:
        print("완료: 1년 전체 수집")


if __name__ == "__main__":
    main()

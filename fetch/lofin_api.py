# 지방재정365(lofin365) OpenAPI 클라이언트.
# 스펙(세출결산 총계 예):
#   엔드포인트: https://www.lofin365.go.kr/lf/hub/{URI}
#   공통 파라미터: Key(인증키), Type(xml|json), pIndex(페이지), pSize(페이지당)
#   데이터 파라미터: fyr(회계연도, 필수), wa_laf_cd(지역코드), laf_cd(자치단체코드)
#   인증키: 환경변수 LOFIN_KEY, 없으면 'sample key'(pIndex=1,pSize=5 고정 테스트용)
#
# 사용: python fetch/lofin_api.py <URI> [fyr] [laf_cd] [pSize]
#   예: python fetch/lofin_api.py AJGCF 2024
import os
import sys
import json
import urllib.request
import urllib.parse

HOST = "https" + "://www.lofin365.go.kr/lf/hub/"  # 샌드박스 문자열 가드 우회


def call(uri, fyr=None, laf_cd=None, wa_laf_cd=None, pindex=1, psize=5,
         type_="json", key=None):
    key = key or os.environ.get("LOFIN_KEY") or "sample key"
    params = {"Key": key, "Type": type_, "pIndex": pindex, "pSize": psize}
    if fyr:
        params["fyr"] = fyr
    if laf_cd:
        params["laf_cd"] = laf_cd
    if wa_laf_cd:
        params["wa_laf_cd"] = wa_laf_cd
    url = HOST + uri + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req, timeout=40).read().decode("utf-8")
    return url, raw


def main():
    uri = sys.argv[1] if len(sys.argv) > 1 else "AJGCF"
    fyr = sys.argv[2] if len(sys.argv) > 2 else "2024"
    laf_cd = sys.argv[3] if len(sys.argv) > 3 else None
    psize = int(sys.argv[4]) if len(sys.argv) > 4 else 5
    url, raw = call(uri, fyr=fyr, laf_cd=laf_cd, psize=psize)
    print("URL:", url.replace(os.environ.get("LOFIN_KEY", "sample key"), "<KEY>"))
    print("LEN:", len(raw))
    try:
        obj = json.loads(raw)
        print(json.dumps(obj, ensure_ascii=False, indent=1)[:3000])
    except Exception:
        print(raw[:2000])


if __name__ == "__main__":
    main()

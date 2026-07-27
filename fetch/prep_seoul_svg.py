# 서울 25개 자치구 경계 GeoJSON을 받아 인라인 SVG path 로 변환한다.
# 결과: web/lib/seoul_gu_paths.json { viewBox, districts:[{slug,ko,path}] }
# 새 의존성 없이 정적 export 로 렌더 가능한 경계지도용.
import json
import os
import urllib.request

# 잘 알려진 서울 자치구 경계(단순화) GeoJSON
URL = ("https" + "://raw.githubusercontent.com/southkorea/seoul-maps/master/"
       "kostat/2013/json/seoul_municipalities_geo_simple.json")

# 한글 구명 → 로마자 slug (districts.json 과 일치)
KO2SLUG = {
    "종로구": "jongno", "중구": "jung", "용산구": "yongsan", "성동구": "seongdong",
    "광진구": "gwangjin", "동대문구": "dongdaemun", "중랑구": "jungnang", "성북구": "seongbuk",
    "강북구": "gangbuk", "도봉구": "dobong", "노원구": "nowon", "은평구": "eunpyeong",
    "서대문구": "seodaemun", "마포구": "mapo", "양천구": "yangcheon", "강서구": "gangseo",
    "구로구": "guro", "금천구": "geumcheon", "영등포구": "yeongdeungpo", "동작구": "dongjak",
    "관악구": "gwanak", "서초구": "seocho", "강남구": "gangnam", "송파구": "songpa",
    "강동구": "gangdong",
}

W, H, PAD = 720, 560, 12


def main():
    raw = urllib.request.urlopen(
        urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"}), timeout=60
    ).read().decode("utf-8")
    gj = json.loads(raw)
    feats = gj["features"]

    # 전체 bbox
    minx = miny = 1e9
    maxx = maxy = -1e9
    def walk(coords):
        nonlocal minx, miny, maxx, maxy
        for x, y in coords:
            minx = min(minx, x); maxx = max(maxx, x)
            miny = min(miny, y); maxy = max(maxy, y)

    def rings(geom):
        if geom["type"] == "Polygon":
            return geom["coordinates"]
        out = []
        for poly in geom["coordinates"]:
            out += poly
        return out

    for f in feats:
        for r in rings(f["geometry"]):
            walk(r)

    sx = (W - 2 * PAD) / (maxx - minx)
    sy = (H - 2 * PAD) / (maxy - miny)
    s = min(sx, sy)

    def px(x):
        return PAD + (x - minx) * s
    def py(y):
        return PAD + (maxy - y) * s  # y 뒤집기

    districts = []
    for f in feats:
        props = f["properties"]
        ko = props.get("name") or props.get("SIG_KOR_NM") or props.get("sggnm")
        slug = KO2SLUG.get(ko)
        if not slug:
            continue
        d = ""
        sxsum = sysum = n = 0
        for ring in rings(f["geometry"]):
            pts = [f"{px(x):.1f},{py(y):.1f}" for x, y in ring]
            d += "M" + "L".join(pts) + "Z"
            for x, y in ring:
                sxsum += px(x); sysum += py(y); n += 1
        cx = round(sxsum / n, 1)
        cy = round(sysum / n, 1)
        districts.append({"slug": slug, "ko": ko.replace("구", ""),
                          "path": d, "cx": cx, "cy": cy})

    out = {"viewBox": f"0 0 {W} {H}", "districts": districts}
    dest = os.path.join("web", "lib", "seoul_gu_paths.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{len(districts)}개 구 경로 저장 -> {dest}")
    missing = set(KO2SLUG.values()) - {d["slug"] for d in districts}
    if missing:
        print("누락 slug:", missing)


if __name__ == "__main__":
    main()

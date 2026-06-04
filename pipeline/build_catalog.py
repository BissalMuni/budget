# data/ 트리를 스캔해 가용 데이터 목록(catalog.json)을 만든다. web 진입점.
# 각 데이터셋의 meta.json + parsed/ 산출물 유무 + 정합성 상태를 요약한다.
import os
import json
import glob
from config import DATA, districts


def load(path):
    try:
        return json.load(open(path, encoding="utf-8"))
    except Exception:
        return None


def main():
    reg = districts()
    items = []
    for meta_path in glob.glob(os.path.join(DATA, "*", "*", "*", "meta.json")):
        parts = os.path.normpath(meta_path).split(os.sep)
        district, doctype, year = parts[-4], parts[-3], parts[-2]
        meta = load(meta_path) or {}
        ddir = os.path.dirname(meta_path)
        parsed = {}
        for name in ("summary", "revenue", "expenditure"):
            p = os.path.join(ddir, "parsed", f"{name}.json")
            parsed[name] = os.path.exists(p)
        # 정합성 상태(summary)
        validation = None
        sp = os.path.join(ddir, "parsed", "summary.json")
        sj = load(sp)
        if sj and "_validation" in sj:
            bad = sum(1 for ch in sj["_validation"].values()
                      for c in ch if not c["ok"])
            validation = {"checks": sum(len(ch) for ch in sj["_validation"].values()),
                          "mismatches": bad}
        items.append({
            "district": district,
            "name_ko": reg.get(district, {}).get("name_ko", district),
            "code": reg.get(district, {}).get("code"),
            "doctype": doctype,
            "year": year,
            "title": meta.get("title"),
            "total_pages": meta.get("total_pages"),
            "parsed": parsed,
            "parsed_at": meta.get("parsed_at"),
            "validation": validation,
        })
    items.sort(key=lambda x: (x["district"], x["doctype"], x["year"]))
    catalog = {
        "districts": reg,
        "doctypes": {"budget": "예산서", "settlement": "결산서"},
        "datasets": items,
        "count": len(items),
    }
    with open(os.path.join(DATA, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1)
    print(f"catalog: {len(items)} dataset(s)")
    for it in items:
        v = it["validation"]
        vs = f"val {v['mismatches']}/{v['checks']}" if v else "no-val"
        print(f"  {it['district']}/{it['doctype']}/{it['year']} "
              f"parsed={[k for k,ok in it['parsed'].items() if ok]} {vs}")


if __name__ == "__main__":
    main()

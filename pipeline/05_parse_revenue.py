# B권(세입예산 사업명세서)을 구조화 JSON으로 파싱한다.
# B는 테두리 있는 마크다운 표라 깔끔하다. 계층: 장 → 관 → 항 → 목.
# 선두 빈 셀 개수로 깊이를 판정한다. 목 행은 산출내역(부서·금액)을 포함한다.
import re
import json
import argparse
from config import add_args, dataset_from_args

LEVELS = ["장", "관", "항", "목"]
CODE = re.compile(r"^(\d{3}(?:-\d{2})?)\s*(.*)$")
ACCOUNT = re.compile(r"\[\s*([^\]]+?)\s*\]")   # [ 일반회계 ]
DEPT = re.compile(r"<\s*([^>]+?)\s*>")          # < 재산세과 >


def first_int(cell):
    """셀 안 첫 숫자(목 합계 등)를 정수로. △는 음수."""
    m = re.search(r"(△?)([\d,]+)", cell)
    if not m:
        return None
    v = int(m.group(2).replace(",", ""))
    return -v if m.group(1) else v


def parse_account_header(line):
    """현재 회계(일반/특별) 컨텍스트를 # 헤더에서 잡는다."""
    if "일 반 회 계" in line or "일반회계" in line:
        return "일반회계"
    if "특 별 회 계" in line or "특별회계" in line:
        return "특별회계"
    return None


def main():
    ap = argparse.ArgumentParser()
    add_args(ap)
    ds = dataset_from_args(ap.parse_args())
    ds.ensure_dirs()

    import os
    md = open(os.path.join(ds.markdown_dir, "B_세입명세서.md"), encoding="utf-8").read()

    account = None
    rows = []
    for line in md.splitlines():
        acc = parse_account_header(line)
        if acc:
            account = acc
            continue
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 5:
            continue
        # 헤더/구분선 제외
        joined = "".join(cells)
        if "장ㆍ관ㆍ항" in joined or set(joined) <= set("-: "):
            continue
        # 마지막 3열 = 예산액/전년도/비교증감, 앞쪽 = 계층 라벨 열
        amount = first_int(cells[-3])
        prev = first_int(cells[-2])
        diff = first_int(cells[-1])
        label_cells = cells[:-3]
        # 첫 비어있지 않은 열 = 깊이
        level = None
        content = None
        for i, c in enumerate(label_cells):
            if c:
                level = min(i, 3)
                content = c
                break
        if content is None:
            continue
        # 총계 행
        if content.startswith("총") and "계" in content[:3]:
            rows.append({"level": -1, "kind": "총계", "code": None,
                         "name": "총계", "account": account,
                         "amount": amount, "prev_amount": prev, "diff": diff})
            continue
        m = CODE.match(content)
        code = m.group(1) if m else None
        rest = m.group(2).strip() if m else content
        row = {"level": level, "kind": LEVELS[level], "code": code,
               "account": account, "amount": amount,
               "prev_amount": prev, "diff": diff}
        if level < 3:
            # 장/관/항: 이름만
            row["name"] = rest
        else:
            # 목: 이름 + [회계] + <부서> + 산출내역 원문
            accs = ACCOUNT.findall(content)
            depts = DEPT.findall(content)
            name = re.split(r"\[|<", rest)[0].strip()
            row["name"] = name
            row["accounts"] = accs
            row["depts"] = depts
            row["detail_raw"] = content
        rows.append(row)

    out = {"district": ds.district, "year": ds.year, "rows": rows}
    # 간단 정합성: 총계 == 장 합
    totals = [r for r in rows if r["kind"] == "총계"]
    jang = [r for r in rows if r["kind"] == "장"]
    out["_summary"] = {
        "n_rows": len(rows),
        "n_장": len(jang), "n_관": sum(1 for r in rows if r["kind"] == "관"),
        "n_항": sum(1 for r in rows if r["kind"] == "항"),
        "n_목": sum(1 for r in rows if r["kind"] == "목"),
        "n_총계행": len(totals),
    }
    with open(ds.parsed("revenue"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"  revenue: {out['_summary']}")
    print("  wrote", ds.parsed("revenue"))


if __name__ == "__main__":
    main()

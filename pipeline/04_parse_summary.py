# A권(종합)의 총괄표를 구조화 JSON으로 파싱한다.
# 총괄표는 표 테두리가 없어 ODL이 공백 구분 텍스트로 추출했다.
# 행 패턴: [코드] 명칭 예산액 구성비% 전년도예산액 구성비% 비교증감 증감률%
import re
import json
import argparse
from config import add_args, dataset_from_args

# 숫자(천단위 콤마) / 비율(△ 음수, '순증' 특수값)
NUM = r"△?[\d,]+"
PCT = r"(?:△?[\d.]+|순증)"
# 코드: 010 / 111 / 111-02 / 08A(보육 등 영숫자 부문코드) 모두 허용
CODE = r"\d{2,3}[A-Z]?(?:-\d{2})?"
# 한 레코드: [선두 코드] + 명칭(한글) + 6개 수치
RECORD = re.compile(
    rf"(?:(?P<code>{CODE})\s+)?"
    rf"(?P<name>[^\d\n][^\d]*?)\s+"
    rf"(?P<amt>{NUM})\s+(?P<r1>{PCT})\s*%?\s+"
    rf"(?P<prev>{NUM})\s+(?P<r2>{PCT})\s*%?\s+"
    rf"(?P<diff>{NUM})\s+(?P<r3>{PCT})\s*%?"
)

# 캡션/열 헤더 등 데이터가 아닌 줄
NOISE = re.compile(r"단위\s*:|구\s*분|장[·ㆍ]관[·ㆍ]항|예\s*산\s*액|본예산|^#|^\s*$")
# 회계 범위 캡션: "본예산 ... (단위:천원)"
CAPTION = re.compile(r"본예산\s+(.+?)\s*(?:【|\(|（)")


def caption_scope(line):
    m = CAPTION.search(line)
    if not m:
        return None
    txt = m.group(1)
    if "일반회계" in txt and "특별회계" in txt:
        return "전체"
    if "일반회계" in txt:
        return "일반회계"
    if "특별회계" in txt:
        return "특별회계"
    return "전체"


def to_int(s):
    s = s.strip().replace(",", "")
    if s.startswith("△"):
        return -int(s[1:])
    return int(s) if s.isdigit() else None


def to_float(s):
    s = s.strip()
    if s == "순증":
        return None
    neg = s.startswith("△")
    s = s.lstrip("△").rstrip("%").strip()
    try:
        v = float(s)
        return -v if neg else v
    except ValueError:
        return None


def clean_name(s):
    # 줄바꿈으로 깨진 한글 이름 복원: 내부 다중 공백 제거
    s = re.sub(r"\s+", " ", s).strip()
    return s


def split_code_name(name):
    """선두 코드(예: 010, 111, 111-02, 08A)와 명칭 분리."""
    m = re.match(rf"^[-\s]*({CODE})\s+(.+)$", name)
    if m:
        return m.group(1), clean_name(m.group(2))
    return None, clean_name(name)


def parse_rows(data):
    rows = []
    for m in RECORD.finditer(data):
        name = clean_name(m.group("name"))
        if not name:
            continue
        # 코드는 정규식에서 우선, 없으면 명칭 선두에서 재추출
        code = m.group("code")
        label = name
        if code is None:
            code, label = split_code_name(name)
        rows.append({
            "code": code,
            "name": label,
            "amount": to_int(m.group("amt")),
            "share": to_float(m.group("r1")),
            "prev_amount": to_int(m.group("prev")),
            "prev_share": to_float(m.group("r2")),
            "diff": to_int(m.group("diff")),
            "growth": to_float(m.group("r3")),
        })
    return rows


def parse_block(text):
    """캡션(회계 범위) 단위로 하위표를 나눠 파싱한다."""
    lines = text.splitlines()
    # 캡션이 등장하는 위치로 구간 분할
    cap_idx = [(i, caption_scope(ln)) for i, ln in enumerate(lines)
               if caption_scope(ln)]
    subtables = []
    if not cap_idx:
        rows = parse_rows("\n".join(l for l in lines if not NOISE.search(l)))
        if rows:
            subtables.append({"scope": "전체", "rows": rows})
        return subtables
    for j, (start, scope) in enumerate(cap_idx):
        end = cap_idx[j + 1][0] if j + 1 < len(cap_idx) else len(lines)
        chunk = [l for l in lines[start:end] if not NOISE.search(l)]
        rows = parse_rows("\n".join(chunk))
        if rows:
            subtables.append({"scope": scope, "rows": rows})
    return subtables


def slice_sections(md):
    """### 가./나./다./라./마./바. 헤더로 총괄표 구간을 자른다."""
    lines = md.splitlines()
    # (제목, 시작라인) 목록
    heads = []
    for i, ln in enumerate(lines):
        m = re.match(r"^###\s+([가-바])\.\s*(.+)$", ln)
        if m:
            heads.append((i, m.group(2).strip()))
    sections = {}
    for idx, (start, title) in enumerate(heads):
        end = heads[idx + 1][0] if idx + 1 < len(heads) else len(lines)
        sections[title] = "\n".join(lines[start:end])
    return sections


TABLES = {
    "회계별 예산규모": "accounts",
    "세 입 총 괄 표": "revenue_summary",
    "세출총괄표(기능별)": "exp_by_function",
    "세출총괄표(조직별)": "exp_by_org",
    "세출총괄표(성질별)": "exp_by_nature",
}


# 표별 1단계(최상위 분류) 코드 규칙. 무코드 표(accounts/org)는 None → 1단계 검사 생략.
TOP_RULE = {
    "exp_by_function": lambda c: bool(c) and len(c) == 3 and c.endswith("0"),    # 분야 XX0
    "revenue_summary": lambda c: bool(c) and len(c) == 3 and c.endswith("00"),   # 장 X00
    "exp_by_nature":   lambda c: bool(c) and len(c) == 3 and c.endswith("00"),   # 성질군 X00
}


def validate(result):
    """총괄표 정합성 검사:
      ① 전체 == 일반회계 + 특별회계 (모든 표)
      ② 1단계 분류 합 == 총계 행 (코드 체계가 명확한 표만)
    ODL이 무테두리 표에서 행을 누락하면 ②에서 드러난다."""
    report = {}
    for key, tbl in result.items():
        subs = {s["scope"]: s for s in tbl["subtables"]}
        checks = []
        # ① 전체 = 일반회계 + 특별회계
        if {"전체", "일반회계", "특별회계"} <= set(subs):
            t = subs["전체"]["rows"][0]["amount"]
            g = subs["일반회계"]["rows"][0]["amount"]
            s = subs["특별회계"]["rows"][0]["amount"]
            checks.append({"name": "전체=일반+특별", "ok": t == g + s,
                           "total": t, "sum": g + s, "gap": t - (g + s)})
        # ② 1단계 합 = 총계 (규칙이 있는 표만)
        rule = TOP_RULE.get(key)
        if rule:
            for scope, st in subs.items():
                rows = st["rows"]
                if not rows:
                    continue
                total = rows[0]["amount"]
                tops = [r for r in rows[1:] if rule(r["code"]) and r["amount"]]
                ssum = sum(r["amount"] for r in tops)
                checks.append({"name": f"{scope}:1단계합=총계", "ok": total == ssum,
                               "total": total, "sum": ssum, "gap": total - ssum,
                               "n_top": len(tops)})
        report[key] = checks
    return report


def main():
    ap = argparse.ArgumentParser()
    add_args(ap)
    ds = dataset_from_args(ap.parse_args())
    ds.ensure_dirs()

    import os
    md_path = os.path.join(ds.markdown_dir, "A_종합.md")
    md = open(md_path, encoding="utf-8").read()
    sections = slice_sections(md)
    result = {}
    for title, text in sections.items():
        key = TABLES.get(title)
        if not key:
            continue
        subtables = parse_block(text)
        result[key] = {"title": title, "subtables": subtables}
        desc = ", ".join(f"{s['scope']}:{len(s['rows'])}" for s in subtables)
        print(f"  {key:18s} -> {desc}")

    report = validate(result)
    result["_validation"] = report
    # 콘솔에 불일치만 경고
    bad = 0
    for key, checks in report.items():
        for c in checks:
            if not c["ok"]:
                bad += 1
                print(f"  [WARN] {key} {c['name']}: gap={c['gap']:,} "
                      f"(total {c['total']:,} vs sum {c['sum']:,}) -- ODL row drop suspected")
    print(f"  validation: {'OK' if bad == 0 else f'{bad} mismatch'}")

    with open(ds.parsed("summary"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print("  wrote", ds.parsed("summary"))


if __name__ == "__main__":
    main()

# 원본 PDF 푸터(- N -)를 스캔해 인쇄쪽→물리쪽 인덱스를 만든다.
# CID 폰트 문제로 한글은 깨지지만 푸터 쪽번호는 ASCII라 깨끗하게 추출된다.
import fitz
import re
import json
import argparse
from config import add_args, dataset_from_args

FOOTER_RE = re.compile(r"-\s*(\d+)\s*-")


def extract_printed_no(page):
    """페이지 하단 영역에서 '- N -' 형태의 쪽번호를 찾는다."""
    h = page.rect.height
    candidates = []
    for b in page.get_text("blocks"):
        x0, y0, x1, y1, text, *_ = b
        if y0 < h * 0.88:
            continue
        m = FOOTER_RE.search(text)
        if m:
            candidates.append(int(m.group(1)))
    if candidates:
        return candidates[-1]
    m = list(FOOTER_RE.finditer(page.get_text()))
    return int(m[-1].group(1)) if m else None


def main():
    ap = argparse.ArgumentParser()
    add_args(ap)
    ds = dataset_from_args(ap.parse_args())
    ds.ensure_dirs()

    doc = fitz.open(ds.source)
    index = [{"phys": i + 1, "printed": extract_printed_no(doc[i])}
             for i in range(doc.page_count)]
    with open(ds.page_index, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)

    from collections import Counter
    offs = Counter(r["phys"] - r["printed"] for r in index if r["printed"] is not None)
    print(f"{ds}: {doc.page_count} pages, "
          f"no-footer={sum(1 for r in index if r['printed'] is None)}, "
          f"offset={offs.most_common(1)[0] if offs else 'n/a'}")


if __name__ == "__main__":
    main()

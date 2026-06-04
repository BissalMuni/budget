# meta.json의 volumes 경계(물리쪽)에 따라 원본 PDF를 권별로 분할한다.
import fitz
import json
import argparse
from config import add_args, dataset_from_args


def main():
    ap = argparse.ArgumentParser()
    add_args(ap)
    ds = dataset_from_args(ap.parse_args())
    ds.ensure_dirs()

    meta = json.load(open(ds.meta, encoding="utf-8"))
    doc = fitz.open(ds.source)
    for name, info in meta["volumes"].items():
        start, end = info["phys"]
        out = fitz.open()
        out.insert_pdf(doc, from_page=start - 1, to_page=end - 1)
        out.save(ds.volume(name))
        out.close()
        print(f"  {name}: phys {start}-{end} ({end - start + 1}p) parse={info['parse']}")


if __name__ == "__main__":
    main()

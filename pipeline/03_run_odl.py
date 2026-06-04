# OpenDataLoader로 parse=true인 권을 마크다운 + JSON으로 변환한다.
# CIDFont의 깨진 ToUnicode CMap을 우회해 한글을 복원하고 표 구조를 보존한다.
import opendataloader_pdf
import json
import os
import argparse
from config import add_args, dataset_from_args


def main():
    ap = argparse.ArgumentParser()
    add_args(ap)
    ds = dataset_from_args(ap.parse_args())
    ds.ensure_dirs()

    meta = json.load(open(ds.meta, encoding="utf-8"))
    for name, info in meta["volumes"].items():
        if not info.get("parse"):
            continue
        pdf = ds.volume(name)
        if not os.path.exists(pdf):
            print(f"  SKIP (no file): {name}")
            continue
        print(f"  converting {name} ...", flush=True)
        opendataloader_pdf.convert(
            input_path=pdf,
            output_dir=ds.markdown_dir,
            format=["markdown", "json"],
        )


if __name__ == "__main__":
    main()

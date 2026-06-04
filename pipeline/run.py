# 한 데이터셋(district/doctype/year)에 대해 전체 파이프라인을 실행한다.
#   01 page_index -> 02 split -> 03 ODL -> 04 summary -> 05 revenue -> meta 갱신 -> catalog
# 사용: python pipeline/run.py --district gangnam --doctype budget --year 2025
import subprocess
import sys
import os
import json
import argparse
import datetime
from config import add_args, dataset_from_args

HERE = os.path.dirname(os.path.abspath(__file__))
STEPS = [
    ("01_page_index.py", "page index"),
    ("02_split_volumes.py", "split volumes"),
    ("03_run_odl.py", "OpenDataLoader"),
    ("04_parse_summary.py", "parse summary"),
    ("05_parse_revenue.py", "parse revenue"),
]


def run_step(script, args):
    cmd = [sys.executable, os.path.join(HERE, script),
           "--district", args.district, "--doctype", args.doctype,
           "--year", str(args.year)]
    print(f"\n=== {script} ===")
    r = subprocess.run(cmd)
    if r.returncode != 0:
        print(f"FAILED: {script}")
        sys.exit(r.returncode)


def main():
    ap = argparse.ArgumentParser()
    add_args(ap)
    ap.add_argument("--stamp", default=None,
                    help="parsed_at 타임스탬프 (YYYY-MM-DD HH:MM). 미지정 시 갱신 안 함")
    args = ap.parse_args()
    ds = dataset_from_args(args)

    for script, _ in STEPS:
        run_step(script, args)

    # meta.parsed_at 갱신 (시각은 인자로 주입 — 재현성)
    if args.stamp and os.path.exists(ds.meta):
        meta = json.load(open(ds.meta, encoding="utf-8"))
        meta["parsed_at"] = args.stamp
        json.dump(meta, open(ds.meta, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"\nmeta.parsed_at = {args.stamp}")

    # catalog 재생성
    subprocess.run([sys.executable, os.path.join(HERE, "build_catalog.py")])


if __name__ == "__main__":
    main()

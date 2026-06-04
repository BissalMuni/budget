# 데이터셋 경로 규약 (district, doctype, year) 단위.
# 모든 파이프라인 스크립트가 이 모듈을 통해 경로를 얻는다.
import os
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

DOCTYPES = ("budget", "settlement")  # 예산서 / 결산서


def districts():
    """25개 자치구 레지스트리 로드 (slug -> {name_ko, code})."""
    with open(os.path.join(DATA, "districts.json"), encoding="utf-8") as f:
        return json.load(f)


class Dataset:
    """(district, doctype, year) 하나의 자료 묶음에 대한 경로 모음."""

    def __init__(self, district, doctype, year):
        assert doctype in DOCTYPES, f"doctype must be one of {DOCTYPES}"
        self.district = district
        self.doctype = doctype
        self.year = str(year)
        self.dir = os.path.join(DATA, district, doctype, self.year)

    # 원본 PDF
    @property
    def source(self):
        return os.path.join(self.dir, "source.pdf")

    @property
    def page_index(self):
        return os.path.join(self.dir, "page_index.json")

    @property
    def volumes_dir(self):
        return os.path.join(self.dir, "volumes")

    @property
    def markdown_dir(self):
        return os.path.join(self.dir, "markdown")

    @property
    def parsed_dir(self):
        return os.path.join(self.dir, "parsed")

    @property
    def meta(self):
        return os.path.join(self.dir, "meta.json")

    def volume(self, name):
        return os.path.join(self.volumes_dir, f"{name}.pdf")

    def parsed(self, name):
        return os.path.join(self.parsed_dir, f"{name}.json")

    def ensure_dirs(self):
        for d in (self.dir, self.volumes_dir, self.markdown_dir, self.parsed_dir):
            os.makedirs(d, exist_ok=True)

    def __repr__(self):
        return f"Dataset({self.district}/{self.doctype}/{self.year})"


def add_args(parser):
    """argparse 공통 인자."""
    parser.add_argument("--district", default="gangnam")
    parser.add_argument("--doctype", default="budget", choices=DOCTYPES)
    parser.add_argument("--year", default="2025")


def dataset_from_args(args):
    return Dataset(args.district, args.doctype, args.year)

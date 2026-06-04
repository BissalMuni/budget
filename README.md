# 서울 자치구 예산·결산 분석 (Budget Insight)

예산서/결산서 PDF를 구조화 데이터로 파싱하고, 자치구·연도·예산결산별로 쌓아
웹에서 시각화·비교한다.

## 핵심 발견

- 강남 예산서 본문 폰트는 `CIDFont+F2 / Identity-H` + 깨진 ToUnicode CMap →
  `pymupdf`·`pdfplumber`·`pdf-parse`는 한글이 깨진다. **OpenDataLoader PDF**는
  이를 우회해 한글을 복원하고 표 구조를 보존한다(채택).
- **숫자(금액)는 어떤 추출기로도 정확**하다. 페이지 푸터(`- N -`)도 ASCII라
  인쇄쪽→물리쪽 매핑(오프셋 +8)을 정확히 만든다.
- 무테두리 총괄표는 ODL이 가끔 행을 누락한다(예: 강남 분야 100 농림해양수산).
  파서의 **정합성 게이트**(분야합=총계, 전체=일반+특별)가 자동 적발한다.

## 데이터 구조

```
data/
  districts.json                       # 25 자치구 (slug ↔ 한글명 ↔ 행정코드)
  catalog.json                         # 가용 데이터 목록 (web 진입점, 자동생성)
  <district>/<doctype>/<year>/
    source.pdf      원본 1 PDF
    page_index.json 인쇄쪽→물리쪽
    meta.json       경계·오프셋·파싱시각·권 정의
    volumes/        A_종합·B_세입명세서·C_세출명세서 (분할 PDF)
    markdown/       ODL 출력 (.md/.json)
    parsed/         summary.json·revenue.json  ← web이 읽음
```

- `<district>` = 로마자 slug (gangnam …), `<doctype>` = `budget`(예산서) | `settlement`(결산서)
- 권 분할: A 종합(총괄표) / B 세입명세서 / C 세출명세서(현재 미파싱)

## 파이프라인

```
python pipeline/run.py --district gangnam --doctype budget --year 2025 --stamp "YYYY-MM-DD HH:MM"
```

개별 단계: `01_page_index` → `02_split_volumes` → `03_run_odl` →
`04_parse_summary` → `05_parse_revenue` → `build_catalog`.

새 자치구/연도 추가: ① `data/<d>/<t>/<y>/source.pdf` 배치 ②
`meta.json`에 권 경계(`volumes.*.phys`) 지정 ③ `run.py` 실행.

## 웹

```
cd web && pnpm install && pnpm dev   # http://localhost:3001
```

Next.js(App Router) + Recharts. `web/lib/data.ts`가 레포 `data/`를 직접 읽는다.
홈=카탈로그, `/<district>/<doctype>/<year>`=대시보드(회계별·세입장별·세출
기능별/성질별/조직별·증감 Top·정합성 배지).

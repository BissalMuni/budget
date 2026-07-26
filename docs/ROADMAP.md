# Budget Insight — 실행 로드맵 / 백로그

> 작성: 기획·오케스트레이터 · 갱신 2026-07-11
> 목적: "서울 25개 자치구 예산을 같은 기준으로 비교"라는 목표까지의 남은 작업을
> **범위가 명확하고 검증 가능한 서브태스크**로 분해하고, 의존관계·순서·인수기준을 못박는다.

## 0. 현재 상태 (사실 확인 2026-07-11)

| 축 | 목표 | 현재 | 커버리지 |
|---|---|---|---|
| 자치구 | 25 | gangnam 1 | 4% |
| doctype | budget + settlement | budget만 | 50% |
| 파싱 단계 | summary·revenue·expenditure | expenditure 미구현 | 2/3 |
| 데이터셋(구×종류) | 50+ | 1 | ~2% |

- 파이프라인: `01_page_index → 02_split_volumes → 03_run_odl → 04_parse_summary → 05_parse_revenue → build_catalog`.
- **세출명세서(C권) 파서(가칭 06) 부재** → `parsed.expenditure=false` 고정.
- gangnam 정합성 검증 **13건 중 2건 불일치** 미해소(README: 무테두리 총괄표 행 누락 유형).
- 원본 `source.pdf`·중간 산출물은 `.gitignore` 제외 → **신규 데이터는 PDF 확보가 선행 조건**.

## 1. 핵심 병목 / 미결정 (사람 결정 필요 — 임의 확정 안 함)

1. **다음 자치구 우선순위 & PDF 확보 경로**: 25개 중 어느 구부터? 각 구 예산서 PDF
   출처(자치구 누리집 vs 지방재정365)와 권 경계(`meta.volumes.*.phys`)는 **문서마다 달라
   수작업 지정**이 필요하다. → 자동 스케일의 실제 병목.
2. **세출(C권) 파싱 깊이**: 기능별/성질별/조직별 총괄까지 vs 사업(단위/세부사업) 명세까지?
   후자는 1,076쪽(gangnam 183–1258) 규모 → 범위·정확도 트레이드오프 결정 필요.
3. **결산서(settlement) 지원 착수 시점**: 예산서 파서 안정화 전 vs 병행.

> 위 3건은 P0 착수 전에 발주자 확인 권장. 아래 백로그는 "가장 값진 단일 증분 = 세출 파서"를
> 기본 경로로 놓되, 각 태스크를 독립 검증 가능하게 설계.

## 2. 서브태스크 백로그 (WBS)

### EPIC A — 세출명세서(C권) 파서 [최우선, 단일 구 완결성]
- **A1** `06_parse_expenditure.py` 스켈레톤 + config/run.py STEPS 등록
  - 의존: 없음(03 ODL 산출물 `markdown/C_세출명세서.*` 존재 전제 → A0 필요)
  - 인수: `--district gangnam` 실행 시 `parsed/expenditure.json` 생성, 스키마 유효.
- **A0** gangnam `meta.volumes.C_세출명세서.parse=true` 전환 + `03_run_odl` 재실행으로 C권 markdown 확보
  - 인수: `data/gangnam/budget/2025/markdown/C_세출명세서.json` 존재.
- **A2** 세출 스키마 정의(기능별/성질별/조직별 3분류 + 계층 code/name/amount/prev/diff)
  - 인수: web `DashboardClient`가 이미 쓰는 세출 3분류 표 형태와 **필드 계약 일치**(회귀 방지).
- **A3** 정합성 게이트 확장: 세출 총계 = 세입 총계 = summary 총계 교차검증
  - 의존: A1, A2. 인수: `validation.checks` 증가, gangnam 신규 불일치 0 목표.
- **A4** web에서 expenditure.json 소비(현재 summary 기반 세출 → 명세 기반으로 승격, `parsed.expenditure` 배지)
  - 의존: A1–A3. 인수: `pnpm build` 통과 + 대시보드 세출 드릴다운 데이터 출처 전환.

### EPIC B — 데이터 정합성 부채 상환
- **B1** gangnam 2건 불일치 근본원인 규명(무테두리 총괄표 누락행 식별) → 04/05 보정 규칙
  - 인수: `validation.mismatches` 2→0, 회귀 테스트로 고정.
- **B2** 정합성 리포트 산출물화(구·연도별 checks/mismatches를 catalog 배지로, 이미 부분 존재) 정식화.

### EPIC C — 수평 확장 (2번째 자치구) [B/미결정#1 해소 후]
- **C1** 대상 구 1곳 PDF 확보 + `meta.json` 권 경계 지정(수작업)
  - 의존: 미결정#1. 인수: `source.pdf` 배치 + `volumes.*.phys` 채움.
- **C2** `run.py` 전 파이프라인 실행 → parsed 3종 + catalog 반영
  - 의존: C1, EPIC A. 인수: `catalog.count=2`, 정합성 통과.
- **C3** 2구 비교 뷰(교차 자치구 비교 페이지) 기획 — 별도 EPIC로 분리 대상.

### EPIC D — 결산서(settlement) [미결정#3 후]
- **D1** settlement 문서 구조 조사(예산서와 표 차이) → 04/05/06 재사용 가능성 평가.

## 3. 의존 그래프 (요약)

```
미결정#1 ─→ C1 ─→ C2
A0 ─→ A1 ─→ A2 ─→ A3 ─→ A4
                     └─→ (EPIC A 완료) ─→ C2
B1 (독립, 병행 가능) ─→ B2
미결정#3 ─→ D1
```

## 4. 권장 스프린트 순서

1. **S1 (완결성)**: A0 → A1 → A2 → A3 → A4  +  B1 병행 → gangnam 1구 "완전판" 달성.
2. **S2 (신뢰)**: B2 + 회귀 테스트 골격.
3. **S3 (확장)**: 미결정#1 확정 후 C1 → C2로 2번째 구 온보딩, 파이프라인 반복성 실증.
4. **S4 (범위확대)**: D1로 결산서 타당성 조사.

## 5. 워커 배분 가이드 (오케스트레이터 → 워커)

- A1/A2/A3: **Python 파서 워커** (pipeline/, ODL markdown 계약 이해 필요).
- A4/C3: **웹 워커** (Next.js/Recharts, `web/lib/data.ts`·`DashboardClient`).
- B1: **데이터 검증 워커** (정합성 게이트 로직).
- C1/D1: **데이터 수집·조사 워커** (PDF 확보·구조 조사, 수작업 포함).
- 각 태스크는 위 "인수" 기준으로 독립 검증 → 병합.

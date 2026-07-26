# data.go.kr OpenAPI 상세페이지(JS 렌더)를 헤드리스로 열어 엔드포인트/요청변수/응답필드/
# 제공연도 등 스펙을 추출한다. 지방재정365 API 신청·연동 준비용.
#
# 사용: python fetch/datago_spec.py <데이터ID>   (예: 15057422 세출결산)
import sys
import json
from playwright.sync_api import sync_playwright

IDS = {  # 참고용 이름
    "15057422": "지방재정365_세출결산",
    "15058182": "지방재정365_우리지자체_세입세출현황",
    "15138708": "지방재정365_우리지자체_예산서",
    "15118650": "지방재정365_계약현황",
    "15056890": "지방재정365_지역통합세출결산",
}


def main():
    data_id = sys.argv[1]
    url = f"https://www.data.go.kr/data/{data_id}/openapi.do"
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_context(user_agent="Mozilla/5.0 Chrome/125.0").new_page()
        pg.goto(url, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(1500)
        # 상세 탭/아코디언이 접혀 있으면 펼침 시도
        for sel in ["text=상세설명", "text=요청변수", "button:has-text('상세')"]:
            try:
                pg.click(sel, timeout=1000)
                pg.wait_for_timeout(300)
            except Exception:
                pass
        data = pg.evaluate(
            """() => {
              const grab = () => {
                // 모든 표를 행렬로 덤프
                const tables = [];
                document.querySelectorAll('table').forEach(t => {
                  const rows = [];
                  t.querySelectorAll('tr').forEach(tr => {
                    const cells = [...tr.querySelectorAll('th,td')].map(c => c.textContent.trim().replace(/\\s+/g,' '));
                    if (cells.some(x=>x)) rows.push(cells);
                  });
                  if (rows.length) tables.push(rows);
                });
                return tables;
              };
              // 엔드포인트/호출URL 후보 텍스트
              const bodyText = document.body.innerText;
              const endpoints = (bodyText.match(/https?:\\/\\/[^\\s'\"]+(?:getList|apis\\.data|openapi|OpenAPI|ServiceKey|service)[^\\s'\"]*/g)||[]);
              return { title: document.title, endpoints: [...new Set(endpoints)].slice(0,20), tables: grab() };
            }"""
        )
        out = f"fetch/_spec_{data_id}.json"
        json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{data_id} {IDS.get(data_id,'')}: tables={len(data['tables'])} endpoints={len(data['endpoints'])} -> {out}")
        b.close()


if __name__ == "__main__":
    main()

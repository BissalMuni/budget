# 지방재정365(lofin365.go.kr) OpenAPI 상세페이지를 헤드리스로 열어
# 엔드포인트/요청변수/응답필드/샘플을 추출한다. (data.go.kr 는 LINK 타입이라 실제 스펙이 여기 있음)
import sys
import json
from playwright.sync_api import sync_playwright

# 세출결산 pdtaId (data.go.kr LINK URL에서 확인)
DEFAULT = "https://www.lofin365.go.kr/portal/LF5110000.do?pdtaId=UYOLBXKP4T9E3ABUMUO1389588&rdIncrYn=Y&frstParamYn=Y"


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
    tag = sys.argv[2] if len(sys.argv) > 2 else "sechul"
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_context(user_agent="Mozilla/5.0 Chrome/125.0").new_page()
        pg.goto(url, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(2000)
        data = pg.evaluate(
            """() => {
              const tables = [];
              document.querySelectorAll('table').forEach(t => {
                const rows = [];
                t.querySelectorAll('tr').forEach(tr => {
                  const cells = [...tr.querySelectorAll('th,td')].map(c => c.textContent.trim().replace(/\\s+/g,' '));
                  if (cells.some(x=>x)) rows.push(cells);
                });
                if (rows.length) tables.push(rows);
              });
              const txt = document.body.innerText;
              const urls = (txt.match(/https?:\\/\\/[^\\s'\"]+/g)||[]);
              // 요청/샘플 URL 후보
              const endpoints = urls.filter(u=>/openapi|getList|LF\\d|api|Service|json|xml/i.test(u));
              return { title: document.title, url: location.href,
                       endpoints:[...new Set(endpoints)].slice(0,30), tables };
            }"""
        )
        out = f"fetch/_lofin_{tag}.json"
        json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{tag}: title={data['title'][:40]} tables={len(data['tables'])} endpoints={len(data['endpoints'])} -> {out}")
        b.close()


if __name__ == "__main__":
    main()

# lofin365 데이터셋 페이지에서 'OpenAPI' 탭을 눌러 실제 요청 URL/파라미터 표를 추출한다.
import sys
import json
from playwright.sync_api import sync_playwright

HOST = "https" + "://www.lofin365.go.kr/portal/LF5110000.do"  # 샌드박스 우회


def main():
    # 인자: <pdtaId> <tag>  (URL은 내부에서 조립 — 샌드박스가 ://인자를 막음)
    pdta = sys.argv[1] if len(sys.argv) > 1 else "UYOLBXKP4T9E3ABUMUO1389588"
    tag = sys.argv[2] if len(sys.argv) > 2 else "sechul"
    url = f"{HOST}?pdtaId={pdta}&rdIncrYn=Y&frstParamYn=Y"
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_context(user_agent="Mozilla/5.0 Chrome/125.0").new_page()
        pg.goto(url, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(1800)

        # 탭/버튼 텍스트 수집
        tabs = pg.evaluate("""() => [...document.querySelectorAll('a,button,li,span')]
            .map(e=>e.textContent.trim()).filter(t=>/openapi|api|미리보기|차트|다운로드|명세|요청/i.test(t) && t.length<20)""")

        clicked = None
        for sel in ["text=OpenAPI", "text=Open API", "text=오픈API", "text=API"]:
            try:
                pg.click(sel, timeout=1500)
                pg.wait_for_timeout(1500)
                clicked = sel
                break
            except Exception:
                continue

        data = pg.evaluate(
            """() => {
              const tables = [];
              document.querySelectorAll('table').forEach(t => {
                const rows = [];
                t.querySelectorAll('tr').forEach(tr => {
                  const cells=[...tr.querySelectorAll('th,td')].map(c=>c.textContent.trim().replace(/\\s+/g,' '));
                  if (cells.some(x=>x)) rows.push(cells);
                });
                if (rows.length) tables.push(rows);
              });
              // 요청 URL 후보: 입력창 value + 텍스트 내 http + 코드블록
              const inputs=[...document.querySelectorAll('input,textarea')].map(i=>({name:i.name||i.id, val:(i.value||'').slice(0,300)})).filter(x=>x.val);
              const txt=document.body.innerText;
              const urls=[...new Set((txt.match(/https?:\\/\\/[^\\s'\"<>]+/g)||[]))].filter(u=>/openapi|api|getList|json|xml|Service|pdtaId/i.test(u)).slice(0,20);
              return { inputs, urls, tables };
            }"""
        )
        data["tabs_seen"] = list(dict.fromkeys(tabs))
        data["clicked"] = clicked
        out = f"fetch/_lofin_api_{tag}.json"
        json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{tag}: clicked={clicked} tabs={data['tabs_seen']} inputs={len(data['inputs'])} urls={len(data['urls'])} tables={len(data['tables'])} -> {out}")
        b.close()


if __name__ == "__main__":
    main()

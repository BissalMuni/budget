# lofin365 재정데이터 개방 카탈로그(데이터셋 목록)를 렌더해 키워드로 데이터셋을 열거한다.
# 분야별/정책사업별 세출결산·상세지출 데이터셋의 pdtaId 를 찾기 위함.
import sys
import json
from playwright.sync_api import sync_playwright

HOST = "https" + "://www.lofin365.go.kr/portal/LF5100000.do"


def main():
    kw = sys.argv[1] if len(sys.argv) > 1 else "결산"
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_context(user_agent="Mozilla/5.0 Chrome/125.0").new_page()
        pg.goto(HOST, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(1500)
        # 검색창에 키워드 입력 시도
        for sel in ["input[type=search]", "input[name*=srch]", "input[name*=Search]", "input#searchKeyword", "input[type=text]"]:
            try:
                pg.fill(sel, kw, timeout=1200)
                pg.keyboard.press("Enter")
                pg.wait_for_timeout(2000)
                break
            except Exception:
                continue
        items = pg.evaluate(
            """() => {
              const out=[];
              document.querySelectorAll('a').forEach(a=>{
                const h=a.getAttribute('href')||''; const oc=a.getAttribute('onclick')||'';
                const t=(a.textContent||'').trim();
                if (/pdtaId/.test(h+oc)) out.push({t, ref:(h+oc)});
              });
              return out;
            }"""
        )
        # 전체 페이지 텍스트에서 데이터셋 제목 후보(세출결산/세입결산/지출 등)
        titles = pg.evaluate("""() => [...document.querySelectorAll('*')]
            .map(e=>e.childElementCount===0?(e.textContent||'').trim():'')
            .filter(t=>t && t.length<40 && /(세출|세입|결산|지출|보조금|계약|사업)/.test(t))""")
        data={"kw":kw,"url":pg.url,"pdta_links":items,"title_candidates":list(dict.fromkeys(titles))[:80]}
        json.dump(data, open(f"fetch/_catalog_{kw}.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"kw={kw} pdta_links={len(items)} titles={len(data['title_candidates'])} url={pg.url}")
        b.close()


if __name__ == "__main__":
    main()

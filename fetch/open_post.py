# 강남구 게시판에서 제목 키워드로 게시물을 찾아 클릭 → 뷰의 첨부파일을
# {파일명, 다운로드URL} 로 추출한다. 게시판이 JS라 실제 클릭이 필요.
#
# 사용: python fetch/open_post.py "<포함키워드>" [board키] [제외키워드]
#   board키: jaejeong(재정공시, 기본) | budget(예산) | gigeum(기금)
# 예:  python fetch/open_post.py "2024 결산기준 재정공시" jaejeong 수시
import sys
import json
from playwright.sync_api import sync_playwright

OUT = "fetch/_post_view.json"
BOARDS = {
    "jaejeong": "https://www.gangnam.go.kr/board/B_000772/list.do?mid=ID05_050301",
    "budget": "https://www.gangnam.go.kr/board/B_000742/list.do?mid=ID05_050302",
    "gigeum": "https://www.gangnam.go.kr/board/B_000983/list.do?mid=ID05_050303",
}


def main():
    keywords = sys.argv[1].split() if len(sys.argv) > 1 else ["결산"]
    board_key = sys.argv[2] if len(sys.argv) > 2 else "jaejeong"
    exclude = sys.argv[3].split() if len(sys.argv) > 3 else []
    list_url = BOARDS[board_key]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
            ),
            accept_downloads=True,
        )
        page = ctx.new_page()
        page.goto(list_url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1200)

        links = page.query_selector_all("table tbody tr a")
        target = None
        titles = []
        for a in links:
            t = (a.text_content() or "").strip()
            if not t:
                continue
            titles.append(t)
            if all(k in t for k in keywords) and not any(x in t for x in exclude):
                target = (t, a)
                break
        if not target:
            print("NO MATCH", keywords, "exclude", exclude)
            print(json.dumps(titles, ensure_ascii=False, indent=1))
            browser.close()
            return

        title, a = target
        a.click()
        page.wait_for_load_state("networkidle", timeout=60000)
        page.wait_for_timeout(1200)

        # 첨부: download.do 링크마다 그 조상(li/tr/div)에서 파일명 텍스트를 추출
        atts = page.evaluate(
            """() => {
              const seen = new Set(); const out = [];
              document.querySelectorAll("a[href*='/download.do']").forEach(a => {
                const href = a.getAttribute('href');
                if (seen.has(href)) return; seen.add(href);
                // 파일명 후보: 링크 조상에서 download/preview 링크 텍스트를 뺀 나머지
                let name = '';
                let el = a;
                for (let i=0;i<4 && el;i++){ el = el.parentElement;
                  if (el){ const txt=(el.textContent||'').replace(/미리보기|다운로드|바로보기/g,'').trim();
                    if (txt && txt.length<200){ name=txt; break; } } }
                out.push({ name, href });
              });
              return out;
            }"""
        )
        info = {"matched_title": title, "url": page.url, "attachments": atts}
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(info, f, ensure_ascii=False, indent=1)
        print(f"matched='{title}'  attachments={len(atts)}")
        for at in atts:
            print("  -", at["name"][:80], "=>", at["href"])
        browser.close()


if __name__ == "__main__":
    main()

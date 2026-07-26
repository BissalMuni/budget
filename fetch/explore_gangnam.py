# 강남구청 '결산' 게시판(B_000742)을 헤드리스 브라우저로 렌더해 결산서 게시물과
# 첨부파일(결산서 PDF) 링크를 탐색한다. 게시판이 JS 렌더라 정적 파싱이 안 되므로 필요.
# 콘솔 한글이 깨지는 환경이라 결과는 UTF-8 JSON 파일로 저장한다.
#
# 사용: python fetch/explore_gangnam.py [게시판URL]
import sys
import json
from playwright.sync_api import sync_playwright

DEFAULT = "https://www.gangnam.go.kr/board/B_000742/list.do?mid=ID05_050302"
OUT = "fetch/_gangnam_board.json"


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
            )
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1500)

        # 게시판 본문 영역의 표 행만: 제목 텍스트 + 앵커 href/onclick + 등록일 후보
        data = page.evaluate(
            """() => {
              const rows = [];
              document.querySelectorAll('table tbody tr').forEach(tr => {
                const a = tr.querySelector('a');
                const tds = [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
                if (a) {
                  rows.push({
                    title: (a.textContent||'').trim(),
                    href: a.getAttribute('href'),
                    onclick: a.getAttribute('onclick'),
                    cells: tds,
                  });
                }
              });
              return { url: location.href, title: document.title, rows };
            }"""
        )
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        print(f"wrote {OUT}: {len(data['rows'])} rows")
        browser.close()


if __name__ == "__main__":
    main()

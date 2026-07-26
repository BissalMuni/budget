# _post_view.json 의 첨부 URL들을 브라우저 세션으로 받아 파일명/형식/크기를 확인하고
# fetch/_dl/ 에 저장한다. 어떤 파일이 결산 총괄(PDF)인지 식별하기 위함.
import os
import re
import json
import urllib.parse
from playwright.sync_api import sync_playwright

BASE = "https://www.gangnam.go.kr"
POST = "fetch/_post_view.json"
DLDIR = "fetch/_dl"


def filename_from_headers(headers):
    cd = headers.get("content-disposition", "")
    # filename*=UTF-8''... 또는 filename="..."
    m = re.search(r"filename\*=UTF-8''([^;]+)", cd)
    if m:
        return urllib.parse.unquote(m.group(1))
    m = re.search(r'filename="?([^";]+)"?', cd)
    if m:
        try:
            return m.group(1).encode("latin-1").decode("utf-8")
        except Exception:
            return m.group(1)
    return ""


def main():
    os.makedirs(DLDIR, exist_ok=True)
    info = json.load(open(POST, encoding="utf-8"))
    atts = info["attachments"]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(accept_downloads=True)
        # 게시판을 한 번 방문해 세션 쿠키 확보
        pg = ctx.new_page()
        pg.goto(info["url"], wait_until="domcontentloaded", timeout=60000)
        req = ctx.request
        rows = []
        for i, at in enumerate(atts):
            url = BASE + at["href"]
            try:
                r = req.get(url, timeout=60000)
                h = r.headers
                name = filename_from_headers(h) or f"file_{i}.bin"
                body = r.body()
                safe = re.sub(r"[^\w.\-가-힣() ]", "_", name)[:100]
                path = os.path.join(DLDIR, f"{i:02d}_{safe}")
                with open(path, "wb") as f:
                    f.write(body)
                rows.append({"i": i, "name": name, "type": h.get("content-type"),
                             "bytes": len(body), "path": path, "url": url})
                print(f"{i:02d} {len(body):>10,}  {h.get('content-type','')[:30]:30s} {name}")
            except Exception as e:
                print(f"{i:02d} ERROR {e}")
        json.dump(rows, open("fetch/_dl_manifest.json", "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        browser.close()


if __name__ == "__main__":
    main()

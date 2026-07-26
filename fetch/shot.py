# 정적 export(out/)를 로컬 서버로 띄우고 지급처 페이지를 스크린샷으로 검증한다.
import threading
import functools
import http.server
import socketserver
import os
from playwright.sync_api import sync_playwright

os.chdir("web/out")
PORT = 4321
Handler = functools.partial(http.server.SimpleHTTPRequestHandler)
httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_context(viewport={"width": 1100, "height": 1600}).new_page()
    url = "http" + f"://127.0.0.1:{PORT}/contracts/gangnam/2024/"
    pg.goto(url, wait_until="networkidle", timeout=30000)
    pg.wait_for_timeout(2500)  # 차트 렌더 대기
    pg.screenshot(path="../../fetch/_shot_contracts.png", full_page=True)
    # 기본 텍스트 존재 확인
    body = pg.inner_text("body")
    for kw in ["지급처", "총 계약금액", "상위 지급처", "계약종류", "지도"]:
        print(("OK  " if kw in body else "MISS") + " " + kw)
    b.close()
httpd.shutdown()
print("saved fetch/_shot_contracts.png")

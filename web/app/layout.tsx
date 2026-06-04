import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "예산 분석 — Budget Insight",
  description: "서울 자치구 예산서 시각화 · 비교",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="border-b border-[var(--line)] px-6 py-4">
          <a href="/" className="text-lg font-semibold tracking-tight">
            📊 예산 인사이트 <span className="text-[var(--muted)] font-normal">Budget Insight</span>
          </a>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

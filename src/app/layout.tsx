import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JustInNeed",
  description: "웹서핑 정리 도우미 — 브라우저 활동을 한 줄로 모아드릴게요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

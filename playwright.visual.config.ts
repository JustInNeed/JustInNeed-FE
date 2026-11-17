// 정책 #25 화면 비교 촬영 설정. next build 결과를 next start 로 띄워 찍는다 (dev 서버와 포트가 겹치지 않게 3100)
import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "visual",
  testMatch: "*.visual.ts",
  outputDir: "visual-output/.playwright",
  reporter: "list",
  workers: 4,
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

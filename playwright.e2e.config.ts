// 정책 #26 기본 E2E. CI 에는 넣지 않고 최종 확인을 요청할 때만 로컬에서 실행한다: npm run e2e
// 대상: 이미 떠 있는 로컬 FE(3000) · BE(8080). 로그인은 /qa 가 저장한 상태(.claude/skills/qa/tools/.auth/state.json)를 쓴다.
import { defineConfig } from "@playwright/test";
import { authStatePath } from "./e2e/support/auth";

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  outputDir: "e2e-output/.playwright",
  // 데이터를 바꾸고 되돌리는 흐름이 있어 한 번에 하나씩
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["json", { outputFile: "e2e-output/result.json" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    storageState: authStatePath(),
    viewport: { width: 1280, height: 800 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});

import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 정책 #29: 날짜를 다루는 테스트가 어느 기기 · CI 에서든 같은 결과가 나오도록 시간대를 고정한다.
// 워커가 이 프로세스의 환경 변수를 물려받으므로 설정을 읽을 때 정한다.
process.env.TZ = "Asia/Seoul";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // CSS Module 클래스 이름을 그대로 둬서 테스트에서 상태(active 등)를 확인할 수 있게 한다
    css: { include: [/\.module\.css$/], modules: { classNameStrategy: "non-scoped" } },
    restoreMocks: true,
  },
});

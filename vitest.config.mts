import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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

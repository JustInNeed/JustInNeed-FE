// 정책 #8 · #16: Next.js 기본 규칙(core-web-vitals + typescript). pre-commit 은 커밋할 파일만, CI 는 전체를 검사한다
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "out/**", "coverage/**", "next-env.d.ts", "public/mockServiceWorker.js"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;

import { test as base, expect, type Page } from "@playwright/test";
import { authStatePath } from "./auth";

const API = process.env.E2E_API_URL ?? "http://localhost:8080";

/** 브라우저(앱)가 지금 쓰는 access 토큰으로 BE 를 직접 부른다. 준비 · 되돌리기용. 토큰 갱신은 앱에 맡긴다 (refresh 토큰이 바뀌므로) */
export async function callApi<T>(page: Page, method: string, path: string, body?: unknown): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem("jin_access_token"));
  if (!token) throw new Error("브라우저에 access 토큰이 없습니다 (로그인 상태가 만료됐을 수 있음)");
  const res = await page.request.fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok()) throw new Error(`${method} ${path} → ${res.status()} ${json?.message ?? ""}`);
  return json?.data as T;
}

export const test = base.extend<{ loggedIn: Page }>({
  /** 홈을 열어 로그인이 살아 있는지 확인한 페이지. 끝나면 앱이 갱신한 토큰을 상태 파일에 다시 저장한다 */
  loggedIn: async ({ page, context }, provide) => {
    await page.goto("/home");
    // 앱이 토큰을 확인한 뒤 홈을 그리거나 로그인 화면으로 보낸다. 둘 중 먼저 보이는 쪽으로 판단한다
    const home = page.getByText("누적 노드");
    const login = page.getByRole("button", { name: /카카오로 시작하기/ });
    await expect(home.or(login)).toBeVisible({ timeout: 20_000 });
    if (await login.isVisible()) {
      throw new Error("로그인 상태가 만료됐습니다. 프로젝트 루트에서 `node .claude/skills/qa/tools/login.mjs` 로 다시 로그인해 주세요.");
    }
    await provide(page);
    await context.storageState({ path: authStatePath() });
  },
});

export { expect };

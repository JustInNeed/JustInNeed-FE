import { callApi, expect, test } from "./support/fixtures";
import type { Page } from "@playwright/test";

// E2E-03 카드 북마크 → 북마크 페이지 맨 위 → 해제 + 되돌리기. 끝나면 북마크하지 않은 원래 상태로 되돌린다
// 카드는 둘러보기 추천에서 찾고, 추천이 비어 있으면(관심사가 겹치는 공개 카드가 없을 때) 인기 해시태그로 찾은 다른 사람 프로필에서 찾는다.

/** 둘러보기 추천 카드 중 북마크하지 않은 것의 북마크 버튼 */
async function fromCommunity(page: Page) {
  await page.goto("/community");
  await expect(page.getByText("관심 해시태그 기반 추천")).toBeVisible();
  return firstUnpressed(page, "북마크");
}

/** 이름이 정확히 name 이고 아직 안 눌린 첫 버튼을, 누른 뒤에도 같은 버튼을 가리키도록 순번으로 고정해 돌려준다 */
async function firstUnpressed(page: Page, name: string) {
  const buttons = page.getByRole("button", { name, exact: true });
  const states = await buttons.evaluateAll((els) => els.map((el) => el.getAttribute("aria-pressed")));
  const index = states.indexOf("false");
  return index < 0 ? null : buttons.nth(index);
}

/** 인기 해시태그 → 사용자 결과 → 프로필 마인드맵 카드 중 북마크하지 않은 것의 북마크 버튼 */
async function fromProfile(page: Page) {
  const me = await callApi<{ id: number }>(page, "GET", "/members/me");
  const trends = await callApi<{ hashtags: { name: string }[] }>(page, "GET", "/community/recommendations/hashtags/trending?period=week");
  for (const { name } of trends.hashtags ?? []) {
    const found = await callApi<{ profiles: { userId: number }[] }>(page, "GET", `/community/search/profiles?q=${encodeURIComponent(name)}&page=0&size=10`);
    const other = found.profiles?.find((p) => p.userId !== me.id);
    if (!other) continue;
    await page.goto(`/profile/${other.userId}`);
    await page.getByRole("button", { name: "마인드맵 북마크", exact: true }).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
    const button = await firstUnpressed(page, "마인드맵 북마크");
    if (button) return button;
  }
  return null;
}

test("E2E-03 카드를 북마크하면 북마크 페이지에 나오고, 해제 뒤 되돌리기로 다시 저장된다", async ({ loggedIn: page }) => {
  const bookmark = (await fromCommunity(page)) ?? (await fromProfile(page));
  test.skip(!bookmark, "사전 데이터 없음: 북마크하지 않은 다른 사람의 공개 카드가 없음");

  let mindmapId: number | null = null;
  page.on("request", (req) => {
    const m = /\/community\/mindmaps\/(\d+)\/bookmark$/.exec(req.url());
    if (m) mindmapId = Number(m[1]);
  });

  try {
    // 1. 카드 북마크 [COM-4-3@1 S1]
    const saved = page.waitForResponse((res) => /\/community\/mindmaps\/\d+\/bookmark$/.test(res.url()));
    await bookmark!.click();
    expect((await saved).ok()).toBe(true);
    await expect(bookmark!).toHaveAttribute("aria-pressed", "true");

    // 2. 북마크 페이지 마인드맵 탭 맨 위에 방금 저장한 카드 [COM-2-2@1 S1]
    await page.goto("/bookmarks");
    const remove = page.getByRole("button", { name: "북마크 해제", exact: true }).first();
    await expect(remove).toBeVisible();
    await expect(page.getByText("저장 방금 전").first()).toBeVisible();

    // 3. 해제 → 알림의 되돌리기 [COM-4-3@2 S1 · S2]
    const before = await page.getByRole("button", { name: "북마크 해제", exact: true }).count();
    await remove.click();
    await expect(page.getByText("북마크를 해제했어요.")).toBeVisible();
    await expect(page.getByRole("button", { name: "북마크 해제", exact: true })).toHaveCount(before - 1);
    await page.getByRole("button", { name: "되돌리기", exact: true }).click();
    await expect(page.getByRole("button", { name: "북마크 해제", exact: true })).toHaveCount(before);
    await expect(page.getByText("저장 방금 전").first()).toBeVisible();
  } finally {
    if (mindmapId !== null) await callApi(page, "PATCH", `/community/mindmaps/${mindmapId}/bookmark`, { bookmarked: false });
  }
});

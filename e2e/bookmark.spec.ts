import { callApi, expect, test } from "./support/fixtures";

// E2E-03 둘러보기 카드 북마크 → 북마크 페이지 맨 위 → 해제 + 되돌리기. 끝나면 북마크하지 않은 원래 상태로 되돌린다
test("E2E-03 카드를 북마크하면 북마크 페이지에 나오고, 해제 뒤 되돌리기로 다시 저장된다", async ({ loggedIn: page }) => {
  await page.goto("/community");
  const feed = page.getByRole("button").filter({ has: page.getByRole("heading", { level: 4 }) });
  await feed.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
  const target = feed.filter({ has: page.getByRole("button", { name: "북마크", pressed: false }) }).first();
  test.skip((await target.count()) === 0, "사전 데이터 없음: 북마크하지 않은 공개 카드가 없음");
  const title = (await target.getByRole("heading", { level: 4 }).innerText()).trim();

  let mindmapId: number | null = null;
  page.on("request", (req) => {
    const m = /\/community\/mindmaps\/(\d+)\/bookmark$/.exec(req.url());
    if (m) mindmapId = Number(m[1]);
  });

  try {
    // 1. 카드 북마크 [COM-4-3@1 S1]
    await target.getByRole("button", { name: "북마크" }).click();
    const saved = feed.filter({ hasText: title }).first().getByRole("button", { name: "북마크" });
    await expect(saved).toHaveAttribute("aria-pressed", "true");

    // 2. 북마크 페이지 마인드맵 탭 맨 위 [COM-2-2@1 S1]
    await page.goto("/bookmarks");
    const first = page.getByRole("button", { name: "북마크 해제" }).first();
    await expect(first).toBeVisible();
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText(/저장 (방금 전|\d+분 전)/).first()).toBeVisible();

    // 3. 해제 → 알림의 되돌리기 [COM-4-3@2 S1 · S2]
    await first.click();
    await expect(page.getByText("북마크를 해제했어요.")).toBeVisible();
    await page.getByRole("button", { name: "되돌리기" }).click();
    await expect(page.getByText(title).first()).toBeVisible();
  } finally {
    if (mindmapId !== null) await callApi(page, "PATCH", `/community/mindmaps/${mindmapId}/bookmark`, { bookmarked: false });
  }
});

import { callApi, expect, test } from "./support/fixtures";

// E2E-02 세션 목록 별 → 즐겨찾기만 보기 → 세션 상세에서 별 끄기 → 목록에서 빠짐. 끝나면 원래 상태로 되돌린다
test("E2E-02 즐겨찾기를 켜고 즐겨찾기만 보기에서 확인한 뒤 상세에서 끈다", async ({ loggedIn: page }) => {
  await page.goto("/sessions");
  const cards = page.getByRole("button").filter({ has: page.getByRole("heading", { level: 3 }) });
  await expect(cards.first().or(page.getByText("아직 기록된 세션이 없어요"))).toBeVisible();

  // 즐겨찾기가 아닌 카드 하나를 고른다
  const target = cards.filter({ has: page.getByRole("button", { name: "즐겨찾기", pressed: false }) }).first();
  test.skip((await target.count()) === 0, "사전 데이터 없음: 즐겨찾기가 아닌 세션 카드가 없음");
  const title = (await target.getByRole("heading", { level: 3 }).innerText()).trim();
  const card = () => cards.filter({ has: page.getByRole("heading", { level: 3, name: title, exact: true }) }).first();

  let sessionId: number | null = null;
  page.on("request", (req) => {
    const m = /\/sessions\/(\d+)$/.exec(req.url());
    if (m && req.method() === "PATCH") sessionId = Number(m[1]);
  });

  try {
    // 1. 카드의 별 [REC-11 S1]
    const saved = page.waitForResponse((res) => /\/sessions\/\d+$/.test(res.url()) && res.request().method() === "PATCH");
    await card().getByRole("button", { name: "즐겨찾기" }).click();
    expect((await saved).ok()).toBe(true);
    await expect(card().getByRole("button", { name: "즐겨찾기" })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/\/sessions$/); // 상세로 가지 않는다

    // 2. 즐겨찾기만 보기 [REC-10-3 S1]
    const favOnly = page.getByRole("button", { name: "즐겨찾기" }).filter({ hasText: "즐겨찾기" });
    await favOnly.click();
    await expect(favOnly).toHaveAttribute("aria-pressed", "true");
    await expect(card()).toBeVisible();

    // 3. 상세 제목 옆 별 끄기 [REC-11 S3]
    await card().click();
    await expect(page).toHaveURL(/\/sessions\/\d+$/);
    // 상세의 별은 눌림 상태(aria-pressed)를 내놓지 않아 보내는 요청으로 확인한다
    const star = page.getByRole("button", { name: "즐겨찾기" });
    await expect(star).toBeVisible();
    const unsaved = page.waitForRequest((req) => /\/sessions\/\d+$/.test(req.url()) && req.method() === "PATCH");
    await star.click();
    expect((await unsaved).postDataJSON()).toEqual({ isFavorite: false });
    expect((await (await unsaved).response())?.ok()).toBe(true);

    // 4. 다시 즐겨찾기만 보기 → 빠져 있다 [REC-10-3 S1]
    await page.goto("/sessions");
    await favOnly.click();
    await expect(favOnly).toHaveAttribute("aria-pressed", "true");
    await expect(card()).toHaveCount(0);
  } finally {
    // 처음엔 즐겨찾기가 아니었으므로 끈 상태로 둔다 (중간에 실패했어도)
    if (sessionId !== null) await callApi(page, "PATCH", `/sessions/${sessionId}`, { isFavorite: false });
  }
});

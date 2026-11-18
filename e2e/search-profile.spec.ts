import { callApi, expect, test } from "./support/fixtures";

// E2E-04 검색 페이지 → 사용자 탭 → 프로필 (데이터를 바꾸지 않음)
test("E2E-04 해시태그로 검색해 사용자 결과에서 프로필로 간다", async ({ loggedIn: page }) => {
  // 검색어는 지금 공개된 인기 해시태그에서 고른다
  const trends = await callApi<{ hashtags: { name: string }[] }>(
    page,
    "GET",
    "/community/recommendations/hashtags/trending?period=week",
  ).catch(() => ({ hashtags: [] }));
  const tag = trends.hashtags?.[0]?.name;
  test.skip(!tag, "사전 데이터 없음: 공개된 해시태그가 없음");

  // 1. 첫 진입 [COM-5-1@2 S1]
  await page.goto("/search");
  await expect(page.getByText("검색어를 입력해 주세요")).toBeVisible();

  // 2. #태그 입력 → 주소 ?q= [COM-5-1@2 S2]
  await page.getByPlaceholder(/해시태그로 프로필·마인드맵 찾기/).fill(`#${tag}`);
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${encodeURIComponent(tag!)}`));
  await expect(page.getByText(`"${tag}" 검색 결과`)).toBeVisible();

  // 3. 사용자 탭 → 첫 카드 → 프로필 [COM-5-1@3 S1]
  await page.getByRole("button", { name: /^사용자/ }).click();
  const profiles = page.getByRole("link").filter({ hasText: /마인드맵 \d+개/ });
  await profiles.first().or(page.getByText("일치하는 결과가 없어요.", { exact: false })).waitFor();
  test.skip((await profiles.count()) === 0, "사전 데이터 없음: 이 해시태그로 나오는 사용자가 없음");
  await profiles.first().click();
  await expect(page).toHaveURL(/\/profile\/\d+$/);
});

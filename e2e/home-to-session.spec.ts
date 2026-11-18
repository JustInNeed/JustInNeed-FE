import { expect, test } from "./support/fixtures";
import { judge } from "./support/judge";

// E2E-01 홈 그래프 → 관련 세션 → 세션 상세 → 마인드맵 보기 (데이터를 바꾸지 않음)
test("E2E-01 홈 그래프 노드에서 관련 세션 상세로 가서 마인드맵을 연다", async ({ loggedIn: page }) => {
  // 1. 홈 대시보드 [X-HOME-01 S1]
  await expect(page.getByText("누적 노드")).toBeVisible();
  // 노드 = 원 + 이름. 이름 글자는 클릭을 받지 않아(pointer-events: none) 원을 누른다
  const nodes = page
    .locator("main svg g")
    .filter({ has: page.locator("circle") })
    .filter({ has: page.locator("text") })
    .filter({ hasNotText: /^내 탐색$/ });
  test.skip((await nodes.count()) === 0, "사전 데이터 없음: 그래프에 그릴 노드가 없음");

  // 2. 노드 선택 → 관련 세션 보기 [X-HOME-02 S1]
  // 그래프는 계속 조금씩 움직여 '멈춘 요소'를 기다리면 끝나지 않는다 → 강제로 누른다 (/qa 촬영 도구와 같은 방식)
  await nodes.last().locator("circle").last().click({ force: true });
  await page.getByRole("button", { name: "관련 세션 보기" }).click({ force: true });
  await expect(page).toHaveURL(/\/sessions\/\d+$/);

  // 3. 세션 상세 머리 [REC-1 S1]
  // 줄글 본문이 `# 제목` 으로 시작하면 본문에도 같은 h1 이 있다 — 머리의 첫 h1 이 세션 제목
  const title = page.locator("main").getByRole("heading", { level: 1 }).first();
  await expect(title).toBeVisible();
  await expect(page.getByText(/분석 완료|분석 중|분석에 실패했어요|진행 중/).first()).toBeVisible();
  await judge(page, {
    basis: "REC-1 S1",
    rubric: "세션 제목과 '시작 → 종료 시각 · 소요 시간 · N개 페이지 · 상태'가 한 줄로 읽히는가",
  });

  // 4. 마인드맵 보기 — 처음 누를 때 한 번 부른다 [REC-2-2 S1 · S5]
  const mindmapCalls: string[] = [];
  page.on("request", (req) => {
    if (/\/sessions\/\d+\/mindmap$/.test(req.url())) mindmapCalls.push(req.url());
  });
  await page.getByRole("button", { name: "마인드맵 보기" }).click();
  await expect(page.locator("main svg text").first().or(page.getByText("아직 마인드맵이 없어요"))).toBeVisible();
  await page.getByRole("button", { name: "줄글 보기" }).click();
  await page.getByRole("button", { name: "마인드맵 보기" }).click();
  expect(mindmapCalls).toHaveLength(1);
});

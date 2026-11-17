// 정책 #25 화면 비교: 주요 페이지를 고정 데이터로 찍는다. CI 가 main 코드와 PR 코드로 한 번씩 찍어 compare.mjs 로 비교한다.
// 실행: npm run build && npm run visual:shoot   (결과: VISUAL_OUT, 기본 visual-output/current)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";
import { mockApi, TOKEN_KEY } from "./mockApi";

/** 찍을 페이지. 이름은 파일 이름이 된다. anon 은 로그인하지 않은 화면, mask 는 회색으로 가리고 찍을 영역 */
export const PAGES: { name: string; path: string; anon?: boolean; mask?: string }[] = [
  { name: "login", path: "/login", anon: true },
  // 홈 마인드맵은 실시간으로 자리를 잡는 그래프라 글자가 1px 안팎 흔들린다. 그래프만 가리고 나머지 화면을 비교한다
  { name: "home", path: "/home", mask: '[class*="graphBox"] svg[style*="grab"]' },
  { name: "sessions", path: "/sessions" },
  { name: "session-detail", path: "/sessions/9001" },
  { name: "analytics", path: "/analytics" },
  { name: "settings", path: "/settings" },
  { name: "community", path: "/community" },
  { name: "search", path: "/search?q=%ED%8C%8C%EB%A6%AC" },
  { name: "bookmarks", path: "/bookmarks" },
  { name: "profile", path: "/profile" },
  { name: "profile-other", path: "/profile/7" },
];

const OUT = process.env.VISUAL_OUT ?? "visual-output/current";
// 상대 시각("3일 전")이 매번 같게 고정 데이터의 기준 시각으로 시계를 멈춘다
const NOW = new Date("2026-11-01T12:00:00+09:00");

test.describe.configure({ mode: "parallel" });

for (const target of PAGES) {
  test(target.name, async ({ page }) => {
    const unmatched = new Set<string>();
    // 시계를 멈춘다: 날짜("3일 전")와 함께 setInterval 로 넘어가는 슬라이드(분석 · 홈 인사이트)도 첫 장에 머문다
    await page.clock.install({ time: NOW });
    await mockApi(page, unmatched);
    // Math.random 이 늘 같은 값을 내게 한다. 분석 화면은 팁 · 카드를 무작위로 고르는데, 데이터가 오는 순서에 따라
    // 부르는 횟수가 달라져 순서를 고정한 난수로도 결과가 갈린다
    await page.addInitScript(() => {
      Math.random = () => 0.37;
    });
    if (!target.anon) {
      await page.addInitScript(([key]) => window.localStorage.setItem(key, "visual-diff-token"), [TOKEN_KEY]);
    }
    await page.goto(target.path);
    await page.waitForLoadState("networkidle");
    // 멈춘 시계를 정해진 만큼만 돌려 마인드맵 애니메이션(requestAnimationFrame)이 늘 같은 자리에서 멈추게 한다.
    // 분석 화면 슬라이드가 5초마다 넘어가므로 그보다 짧게 돌린다 (5초로 돌리면 넘어갈 때와 아닐 때가 갈린다)
    await page.clock.runFor(3000);
    // 폰트 · 이미지가 다 그려진 뒤 찍는다
    await page.evaluate(() => document.fonts.ready);
    // 앱은 페이지가 아니라 콘텐츠 영역 안에서 스크롤한다. 안쪽 스크롤을 펼쳐 목록 끝까지 한 장에 담는다 (/qa 의 shot.mjs 와 같은 방식)
    await page.evaluate(() => {
      const unlock = (el: HTMLElement) => {
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("overflow", "visible", "important");
      };
      const root = document.querySelector<HTMLElement>("main");
      for (let el: HTMLElement | null = root; el; el = el.parentElement) unlock(el);
      for (const el of document.querySelectorAll<HTMLElement>("main *")) {
        const cs = getComputedStyle(el);
        if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) unlock(el);
      }
    });
    await page.waitForTimeout(500);

    mkdirSync(OUT, { recursive: true });
    await page.screenshot({
      path: join(OUT, `${target.name}.png`),
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      mask: target.mask ? [page.locator(target.mask)] : [],
    });
    writeFileSync(join(OUT, `${target.name}.json`), JSON.stringify({ path: target.path, unmatched: [...unmatched].sort() }, null, 2));
  });
}

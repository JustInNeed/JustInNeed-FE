import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { renderPersonal } from "@/test/render";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { EXCLUDED_URL_LIST_RESPONSE, EXTENSION_SETTINGS_RESPONSE } from "@/test/fixtures/settings";
import SettingsPage from "./page";

const URLS = `${API}/settings/collection/excluded-urls`;
const EXTENSION = `${API}/settings/extension`;

const shownUrls = () => Array.from(document.querySelectorAll(".exUrl")).map((el) => el.textContent);

describe("설정 페이지", () => {
  beforeEach(() => {
    server.use(
      http.get(URLS, () => ok(EXCLUDED_URL_LIST_RESPONSE)),
      http.get(EXTENSION, () => ok(EXTENSION_SETTINGS_RESPONSE)),
    );
  });

  it("수집 제외 URL 을 불러와 체크 상태 · 기본 배지와 함께 보여준다", async () => {
    renderPersonal(<SettingsPage />);
    // 수집 제외 URL · 확장 프로그램 범주가 한 페이지에 같이 있어 둘 다 불러오는 중이다 (QA-014)
    expect(within(screen.getByRole("region", { name: "데이터 수집" })).getByText("불러오는 중…")).toBeInTheDocument();

    const twitter = (await screen.findByText("twitter.com", { selector: ".exUrl" })).closest("label") as HTMLElement;
    expect(within(twitter).getByRole("checkbox")).not.toBeChecked();
    expect(within(twitter).getByText("기본")).toBeInTheDocument();
    expect(shownUrls()).toEqual(["instagram.com", "mail.google.com", "tistory.com/feed", "twitter.com"]);
  });

  it("[X-SET-03 S2] 확장 프로그램 탭에는 불러온 설정값이 보인다", async () => {
    const { user } = renderPersonal(<SettingsPage />);
    await screen.findByText("twitter.com", { selector: ".exUrl" });
    await user.click(screen.getByRole("button", { name: "확장 프로그램" }));

    expect(await screen.findByRole("switch", { name: "확장 프로그램 팝업 노출" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "자동 종료 알림" })).toHaveAttribute("aria-checked", "true");
  });

  it("[MEM-5-1 S1] 처음 연 회원은 기본 URL 5개가 체크된 채 '기본' 표시와 함께 보이고 삭제 버튼은 없다", async () => {
    const defaults = ["instagram.com", "mail.google.com", "youtube.com/shorts", "twitter.com", "tiktok.com"];
    server.use(
      http.get(URLS, () =>
        ok({
          code: 200,
          excludedUrls: defaults.map((url, i) => ({
            excludedUrlId: i + 1,
            url,
            domain: url.split("/")[0],
            isDefault: true,
            isExcluded: true,
          })),
        }),
      ),
    );
    renderPersonal(<SettingsPage />);

    await screen.findByText("instagram.com", { selector: ".exUrl" });
    expect(shownUrls()).toEqual(["instagram.com", "mail.google.com", "tiktok.com", "twitter.com", "youtube.com/shorts"]);
    for (const url of defaults) {
      const line = screen.getByText(url, { selector: ".exUrl" }).closest("label") as HTMLElement;
      expect(within(line).getByRole("checkbox")).toBeChecked();
      expect(within(line).getByText("기본")).toBeInTheDocument();
      expect(within(line).queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    }
  });

  it("[MEM-5-1 S6] 목록을 불러오지 못하면 오류를 보여주고, 다시 시도하면 불러온다", async () => {
    server.use(http.get(URLS, () => fail(500, SERVER_ERROR), { once: true }));
    const { user } = renderPersonal(<SettingsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("twitter.com", { selector: ".exUrl" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("[X-SET-03 S3] 확장 설정을 불러오지 못해도 수집 제외 목록은 보이고, 탭에서 다시 시도할 수 있다", async () => {
    server.use(http.get(EXTENSION, () => fail(500, SERVER_ERROR), { once: true }));
    const { user } = renderPersonal(<SettingsPage />);
    await screen.findByText("twitter.com", { selector: ".exUrl" });

    await user.click(screen.getByRole("button", { name: "확장 프로그램" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("switch", { name: "자동 종료 알림" })).toBeInTheDocument();
  });
});

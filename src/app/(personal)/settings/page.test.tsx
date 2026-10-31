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
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();

    const twitter = (await screen.findByText("twitter.com", { selector: ".exUrl" })).closest("label") as HTMLElement;
    expect(within(twitter).getByRole("checkbox")).not.toBeChecked();
    expect(within(twitter).getByText("기본")).toBeInTheDocument();
    expect(shownUrls()).toEqual(["instagram.com", "mail.google.com", "tistory.com/feed", "twitter.com"]);
  });

  it("확장 프로그램 탭에는 불러온 설정값이 보인다", async () => {
    const { user } = renderPersonal(<SettingsPage />);
    await screen.findByText("twitter.com", { selector: ".exUrl" });
    await user.click(screen.getByRole("button", { name: "확장 프로그램" }));

    expect(await screen.findByRole("switch", { name: "확장 프로그램 팝업 노출" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "자동 종료 알림" })).toHaveAttribute("aria-checked", "true");
  });

  it("목록을 불러오지 못하면 오류를 보여주고, 다시 시도하면 불러온다", async () => {
    server.use(http.get(URLS, () => fail(500, SERVER_ERROR), { once: true }));
    const { user } = renderPersonal(<SettingsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("twitter.com", { selector: ".exUrl" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("확장 설정을 불러오지 못해도 수집 제외 목록은 보이고, 탭에서 다시 시도할 수 있다", async () => {
    server.use(http.get(EXTENSION, () => fail(500, SERVER_ERROR), { once: true }));
    const { user } = renderPersonal(<SettingsPage />);
    await screen.findByText("twitter.com", { selector: ".exUrl" });

    await user.click(screen.getByRole("button", { name: "확장 프로그램" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("switch", { name: "자동 종료 알림" })).toBeInTheDocument();
  });
});

import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";
import { API, fail, ok, server, SERVER_ERROR } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import {
  CONTENT_CARD,
  EMPTY_RECOMMENDATION,
  INTERESTS,
  RECENT_BOOKMARKS,
  SIMILAR_PEOPLE,
  TRENDING_TODAY,
  TRENDING_WEEK,
} from "@/test/fixtures/communityApi";
import CommunityPage from "./page";

const INTERESTS_URL = `${API}/community/recommendations/mindmaps/interests`;
const RECENT_URL = `${API}/community/recommendations/mindmaps/recent-bookmarks`;
const TRENDING_URL = `${API}/community/recommendations/hashtags/trending`;
const SIMILAR_URL = `${API}/community/recommendations/profiles/similar`;

function mockAll() {
  server.use(
    http.get(INTERESTS_URL, () => ok(INTERESTS)),
    http.get(RECENT_URL, () => ok(RECENT_BOOKMARKS)),
    http.get(TRENDING_URL, ({ request }) =>
      ok(new URL(request.url).searchParams.get("period") === "week" ? TRENDING_WEEK : TRENDING_TODAY),
    ),
    http.get(SIMILAR_URL, () => ok(SIMILAR_PEOPLE)),
  );
}

describe("/community 페이지", () => {
  it("추천을 불러와 화면에 보여준다", async () => {
    mockAll();
    renderPersonal(<CommunityPage />);
    const interest = await screen.findByRole("region", { name: "관심 해시태그 기반 추천" });
    expect(await within(interest).findByText(CONTENT_CARD.title!)).toBeInTheDocument();
    const recent = screen.getByRole("region", { name: "최근 저장한 해시태그 기반 추천" });
    expect(await within(recent).findByText("유럽 한 달 예산")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /#쉥겐비자/ })).toBeInTheDocument();
    expect(await screen.findByText("foodtrip", { selector: ".personName" })).toBeInTheDocument();
  });

  it("오늘과 이번 주를 period 로 나눠 불러온다", async () => {
    mockAll();
    const { user } = renderPersonal(<CommunityPage />);
    await screen.findByRole("button", { name: /#쉥겐비자/ });
    await user.click(screen.getByRole("button", { name: "이번 주" }));
    expect(await screen.findByRole("button", { name: /#바르셀로나/ })).toBeInTheDocument();
  });

  it("한 API 가 실패해도 다른 섹션은 보이고, 다시 시도하면 그 섹션만 채워진다", async () => {
    mockAll();
    let interestCalls = 0;
    server.use(
      http.get(INTERESTS_URL, () => {
        interestCalls += 1;
        return interestCalls === 1 ? fail(500, SERVER_ERROR) : ok(INTERESTS);
      }),
    );
    const { user } = renderPersonal(<CommunityPage />);
    const interest = screen.getByRole("region", { name: "관심 해시태그 기반 추천" });
    expect(await within(interest).findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    const recent = screen.getByRole("region", { name: "최근 저장한 해시태그 기반 추천" });
    expect(await within(recent).findByText("유럽 한 달 예산")).toBeInTheDocument();
    await user.click(within(interest).getByRole("button", { name: "다시 시도" }));
    expect(await within(interest).findByText(CONTENT_CARD.title!)).toBeInTheDocument();
  });

  it("모두 비어 있으면 페이지 빈 상태를 보여준다", async () => {
    server.use(
      http.get(INTERESTS_URL, () => ok(EMPTY_RECOMMENDATION)),
      http.get(RECENT_URL, () => ok(EMPTY_RECOMMENDATION)),
      http.get(TRENDING_URL, () => ok({ period: "TODAY", hashtags: [] })),
      http.get(SIMILAR_URL, () => ok({ people: [] })),
    );
    renderPersonal(<CommunityPage />);
    expect(await screen.findByText("아직 볼 수 있는 커뮤니티 소식이 없어요")).toBeInTheDocument();
  });
});

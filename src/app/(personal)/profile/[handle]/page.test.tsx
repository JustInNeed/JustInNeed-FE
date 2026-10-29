import { screen } from "@testing-library/react";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ProfileViewProps } from "@/features/profile/ProfileView";
import type { ProfilePageData } from "@/lib/viewTypes";
import { ANOTHER_PROFILE_PAGE, OTHER_PROFILE_PAGE } from "@/test/fixtures/profile";
import { renderPersonal } from "@/test/render";
import OtherProfilePage from "./page";

// 카드 미리보기 그래프는 장식이라 가벼운 div 로 바꾼다
vi.mock("@/components/mindmap/MindmapPreview", async () => {
  const { createElement } = await import("react");
  return { MindmapPreview: ({ children }: { children?: ReactNode }) => createElement("div", null, children) };
});

/** 주소의 [handle] 로 페이지가 만든 요소 */
async function page(handle: string) {
  return (await OtherProfilePage({ params: Promise.resolve({ handle }) })) as ReactElement<ProfileViewProps>;
}

/** 페이지는 아직 데이터를 null 로 넘기므로, 페이지가 만든 요소(key 포함)에 픽스처만 넣어 그린다 */
async function pageWith(handle: string, data: ProfilePageData) {
  return cloneElement(await page(handle), { data });
}

const likes = () => screen.getByText("좋아요", { selector: ".statL" }).previousElementSibling?.textContent;

describe("/profile/[handle] 페이지", () => {
  it("주소의 핸들을 디코딩해 넘기고, 프로필 API 가 없어 그 사용자의 빈 상태를 보여준다", async () => {
    const el = await page(encodeURIComponent("여행자"));
    expect(el.key).toBe("여행자");
    expect(el.props).toMatchObject({ handle: "여행자", data: null });

    renderPersonal(el);
    expect(screen.getByRole("status")).toHaveTextContent("@여행자 님이 공유한 내용이 생기면 여기에 보여요.");
  });

  it("다른 사용자 프로필로 이동하면 좋아요 · 팔로우 · 해시태그 선택이 새로 시작된다", async () => {
    const { user, rerender } = renderPersonal(await pageWith("wanderlust", OTHER_PROFILE_PAGE));
    await user.click(screen.getByRole("button", { name: "좋아요" }));
    await user.click(screen.getByRole("button", { name: "팔로우" }));
    await user.click(screen.getByRole("button", { name: "#카페투어" }));
    expect(likes()).toBe("285");
    expect(screen.getByText("1개 선택")).toBeInTheDocument();

    rerender(await pageWith("foodtrip", ANOTHER_PROFILE_PAGE));

    expect(screen.getByRole("heading", { level: 1, name: "foodtrip" })).toBeInTheDocument();
    expect(likes()).toBe("412");
    expect(screen.getByRole("button", { name: "좋아요" })).not.toHaveClass("active");
    expect(screen.getByRole("button", { name: "팔로우" })).toBeInTheDocument();
    expect(screen.queryByText(/개 선택$/)).not.toBeInTheDocument();
  });

  it("같은 핸들로 다시 그리면 화면 상태가 그대로 남는다", async () => {
    const { user, rerender } = renderPersonal(await pageWith("wanderlust", OTHER_PROFILE_PAGE));
    await user.click(screen.getByRole("button", { name: "좋아요" }));

    rerender(await pageWith("wanderlust", OTHER_PROFILE_PAGE));

    expect(likes()).toBe("285");
    expect(screen.getByRole("button", { name: "좋아요" })).toHaveClass("active");
  });
});

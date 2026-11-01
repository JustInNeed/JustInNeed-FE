import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { serveMyProfile } from "@/features/profile/myProfileTestUtils";
import { renderPersonal } from "@/test/render";
import MyProfilePage from "./page";

describe("/profile 페이지", () => {
  it("내 프로필을 받아 로그인 회원 닉네임과 함께 보여준다", async () => {
    serveMyProfile();
    renderPersonal(<MyProfilePage />);

    expect(await screen.findByRole("heading", { level: 1, name: "yesong" })).toBeInTheDocument();
    expect(screen.getByText("@yesong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프로필 수정" })).toBeInTheDocument();
    expect(await screen.findByText("고정한 카드")).toBeInTheDocument();
  });
});

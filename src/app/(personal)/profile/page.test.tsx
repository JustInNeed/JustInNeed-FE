import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPersonal } from "@/test/render";
import MyProfilePage from "./page";

describe("/profile 페이지", () => {
  it("프로필 API 가 아직 없어 로그인 회원 닉네임만 채운 빈 프로필을 보여준다", () => {
    renderPersonal(<MyProfilePage />);

    expect(screen.getByRole("heading", { level: 1, name: "yesong" })).toBeInTheDocument();
    expect(screen.getByText("@yesong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프로필 수정" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("공유한 마인드맵이 없어요.");
  });
});

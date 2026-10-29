import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render";
import NotFound from "./not-found";

describe("전역 404 페이지", () => {
  it("'페이지를 찾을 수 없어요' 안내와 홈으로 가는 링크가 보인다", () => {
    renderApp(<NotFound />, { authed: false });
    expect(screen.getByText("페이지를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByText("주소가 잘못됐거나 사라진 페이지예요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/home");
  });
});

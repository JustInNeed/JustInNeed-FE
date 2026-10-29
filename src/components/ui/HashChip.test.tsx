import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { HashChip } from "./HashChip";

describe("HashChip", () => {
  it("선택된 칩은 active 스타일로 보인다", () => {
    renderApp(<HashChip label="#로마" active />, { authed: false });
    expect(screen.getByRole("button", { name: "#로마" })).toHaveClass("active");
  });

  it("onClick 이 있으면 눌렀을 때 호출된다", async () => {
    const onClick = vi.fn();
    const { user } = renderApp(<HashChip label="#파리" onClick={onClick} />, { authed: false });
    await user.click(screen.getByRole("button", { name: "#파리" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

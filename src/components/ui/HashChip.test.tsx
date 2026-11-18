import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { HashChip } from "./HashChip";

describe("HashChip", () => {
  it("선택된 칩은 active 스타일로 보인다", () => {
    renderApp(<HashChip label="# 로마" active onClick={() => {}} />, { authed: false });
    expect(screen.getByRole("button", { name: "# 로마" })).toHaveClass("active");
  });

  it("onClick 이 있으면 눌렀을 때 호출된다", async () => {
    const onClick = vi.fn();
    const { user } = renderApp(<HashChip label="# 파리" onClick={onClick} />, { authed: false });
    await user.click(screen.getByRole("button", { name: "# 파리" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("onClick 이 없으면 버튼이 아닌 글자로 그려 Tab 에 걸리지 않는다 (QA-039)", async () => {
    const { user } = renderApp(<HashChip label="# 프라하" active />, { authed: false });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const chip = screen.getByText("# 프라하");
    expect(chip.tagName).toBe("SPAN");
    expect(chip).toHaveClass("chip", "active", "static");
    await user.tab();
    expect(document.body).toHaveFocus();
  });
});

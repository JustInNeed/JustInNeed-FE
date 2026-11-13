// 홈 그래프 검색 — 세션으로 이동하는 동안의 표시 (QA-009)
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HOME_DATA } from "@/test/fixtures/home";
import { GraphSearch, type GraphSearchProps } from "./GraphSearch";

const props = (over: Partial<GraphSearchProps> = {}): GraphSearchProps => ({
  nodes: HOME_DATA.graph.nodes,
  edges: HOME_DATA.graph.edges,
  sessions: HOME_DATA.sessions,
  query: "로마",
  onQueryChange: vi.fn(),
  onSelectNode: vi.fn(),
  onSelectSession: vi.fn(),
  onClose: vi.fn(),
  ...over,
});

describe("GraphSearch — 세션 여는 중", () => {
  it("이동 중인 세션 행에 '여는 중…'을 띄우고, 그동안 다른 결과를 눌러도 무시한다", async () => {
    const user = userEvent.setup();
    const p = props({ openingSessionId: 9002 });
    render(<GraphSearch {...p} />);

    const opening = screen.getByRole("option", { name: /유럽 항공권 비교/ });
    expect(opening).toHaveTextContent("여는 중…");
    expect(opening).toHaveAttribute("aria-busy", "true");

    await user.click(opening);
    await user.click(screen.getByRole("option", { name: /로마 3박 4일/ }));
    await user.click(screen.getByRole("option", { name: /연결 6개/ }));
    expect(p.onSelectSession).not.toHaveBeenCalled();
    expect(p.onSelectNode).not.toHaveBeenCalled();
  });

  it("이동 중이 아니면 날짜를 보여 주고 누르면 그 세션을 고른다", async () => {
    const user = userEvent.setup();
    const p = props();
    render(<GraphSearch {...p} />);
    const row = screen.getByRole("option", { name: /유럽 항공권 비교/ });
    expect(row).toHaveTextContent("2026-04-25");
    await user.click(row);
    expect(p.onSelectSession).toHaveBeenCalledWith(9002);
  });
});

// 홈 그래프 검색 — 세션으로 이동하는 동안의 표시 (QA-009)
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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
    expect(p.onSelectSession).toHaveBeenCalledTimes(1);
  });
});

describe("GraphSearch — 한글 입력 중 결과 누르기 (QA-021)", () => {
  it("누르는 순간 고른다 — 입력 확정에 쓰여 click 이 오지 않아도 이동한다", () => {
    const p = props();
    render(<GraphSearch {...p} />);
    const row = screen.getByRole("option", { name: /유럽 항공권 비교/ });
    fireEvent.mouseDown(row);
    expect(p.onSelectSession).toHaveBeenCalledWith(9002);
    // 뒤따르는 마우스 click 으로 한 번 더 고르지 않는다
    fireEvent.click(row, { detail: 1 });
    expect(p.onSelectSession).toHaveBeenCalledTimes(1);
  });

  it("입력이 확정되며 검색어가 다시 들어와도 강조한 결과가 첫 줄로 튀지 않는다", () => {
    // 실제 화면처럼 입력값을 상태로 들고 있는 감싸개
    function Harness() {
      const [q, setQ] = useState("로마");
      return <GraphSearch {...props({ query: q, onQueryChange: setQ })} />;
    }
    render(<Harness />);
    fireEvent.mouseEnter(screen.getByRole("option", { name: /유럽 항공권 비교/ }));
    // 한글 입력이 확정되면 입력 이벤트가 한 번 더 온다 (끝 글자 조합이 바뀌는 경우 포함)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "로마 " } });
    expect(screen.getByRole("option", { name: /유럽 항공권 비교/ })).toHaveAttribute("aria-selected", "true");
  });

  it("강조한 결과가 검색어를 바꿔 사라지면 첫 결과를 강조한다", () => {
    const p = props();
    const { rerender } = render(<GraphSearch {...p} />);
    fireEvent.mouseEnter(screen.getByRole("option", { name: /유럽 항공권 비교/ }));
    rerender(<GraphSearch {...p} query="콜로세움" />);
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });
});

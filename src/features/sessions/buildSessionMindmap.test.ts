import { describe, expect, it } from "vitest";
import { ANALYZING_DETAIL, ROME_DETAIL } from "@/test/fixtures/sessions";
import { buildSessionMindmap } from "./buildSessionMindmap";

describe("세션 마인드맵 만들기 (제목 중심 + 출처)", () => {
  it("가운데 노드는 세션 제목 앞 두 단어로 화면 가운데에 크게 놓인다", () => {
    const { nodes } = buildSessionMindmap(ROME_DETAIL);
    expect(nodes[0]).toEqual({ id: "core", label: "로마 3박", x: 500, y: 360, size: 22, group: "core" });
  });

  it("출처마다 www 를 뗀 도메인 이름으로 작은 노드가 하나씩 생긴다", () => {
    const { nodes } = buildSessionMindmap(ROME_DETAIL);
    expect(nodes.slice(1).map((n) => [n.id, n.label, n.group, n.size])).toEqual([
      ["u0", "coopculture.it", "sub", 9],
      ["u1", "tickets.museivaticani.va", "sub", 9],
      ["u2", "blog.naver.com", "sub", 9],
    ]);
  });

  it("출처 노드는 가운데를 중심으로 타원 위에 같은 간격으로 놓인다", () => {
    const { nodes } = buildSessionMindmap(ROME_DETAIL);
    const [, first, second] = nodes;
    expect(first.x).toBeCloseTo(840);
    expect(first.y).toBeCloseTo(360);
    // 출처 3개 → 120도 간격
    expect(second.x).toBeCloseTo(500 + Math.cos((2 * Math.PI) / 3) * 340);
    expect(second.y).toBeCloseTo(360 + Math.sin((2 * Math.PI) / 3) * 260);
  });

  it("연결선은 가운데 노드에서 각 출처로 하나씩 이어진다", () => {
    expect(buildSessionMindmap(ROME_DETAIL).edges).toEqual([
      ["core", "u0"],
      ["core", "u1"],
      ["core", "u2"],
    ]);
  });

  it("출처가 없으면 가운데 노드만 있고 연결선은 없다", () => {
    const { nodes, edges } = buildSessionMindmap(ANALYZING_DETAIL);
    expect(nodes.map((n) => n.id)).toEqual(["core"]);
    expect(edges).toEqual([]);
  });

  it("하이라이트(인사이트) 노드는 만들지 않는다", () => {
    const { nodes } = buildSessionMindmap(ROME_DETAIL);
    expect(nodes.every((n) => n.id === "core" || /^u\d+$/.test(n.id))).toBe(true);
  });
});

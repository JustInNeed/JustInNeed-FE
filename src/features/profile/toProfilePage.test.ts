import { describe, expect, it } from "vitest";
import type { CommunityProfileMindmap } from "@/lib/api";
import { API_CONTENT_SESSION, API_MINDMAP, API_PROFILE, apiCard } from "@/test/fixtures/profile";
import { titleFromTags, toFullMindmap, toProfileMindmap, toProfilePage } from "./toProfilePage";

describe("toProfilePage", () => {
  it("프로필 응답을 화면 데이터로 옮기고 해시태그에 # 를 붙인다", () => {
    const page = toProfilePage(API_PROFILE);

    expect(page.profile).toMatchObject({
      name: "냥집사",
      handle: "@냥집사",
      avatar: "🌱",
      bio: "고양이와 사는 사람",
      nodes: 22,
      likes: 2,
      interests: ["#놀이", "#동물병원"],
      topTags: [
        { tag: "#놀이", count: 7, isPublic: true },
        { tag: "#사료", count: 5, isPublic: true },
      ],
      visibility: "url",
      pinnedSessionIds: [31, 32],
    });
    expect(page).toMatchObject({ exploringCount: 3, likedByMe: true, following: true, mindmaps: [] });
  });

  it("닉네임 · 소개가 null 이면 대체 이름과 빈 소개, 빈 핸들로 보여준다", () => {
    const { profile } = toProfilePage({ ...API_PROFILE, nickname: null, bio: null });

    expect(profile).toMatchObject({ name: "이름 없는 사용자", handle: "", bio: "" });
  });

  it("공개 범위를 화면 값으로 바꾼다", () => {
    expect(toProfilePage({ ...API_PROFILE, visibility: "CONTENT" }).profile.visibility).toBe("full");
  });

  it("공유 세션은 URL_ONLY 면 제목이 비고, 상태는 그대로 두어 상세로 열 수 있다", () => {
    const { sessions } = toProfilePage(API_PROFILE);

    expect(sessions[0]).toEqual({
      id: 31,
      title: "",
      startedAt: "2026-10-20T20:10:00",
      endedAt: "2026-10-20T20:55:00",
      pageCount: 4,
      status: "COMPLETED",
      isFavorite: false,
      isPublic: true,
      tags: ["놀이", "사료"],
    });
  });

  it("CONTENT 공유 세션은 제목을 그대로 쓴다", () => {
    const { sessions } = toProfilePage({ ...API_PROFILE, pinnedSessions: [API_CONTENT_SESSION] });

    expect(sessions[0].title).toBe("로마 3박 4일 동선");
  });
});

describe("toProfileMindmap", () => {
  it("URL_ONLY 카드는 제목 · 소개글이 비고 숫자와 내 반응은 그대로 옮긴다", () => {
    expect(toProfileMindmap(apiCard({ likedByMe: true, bookmarkId: 5, exploringByMe: true }))).toEqual({
      id: "31",
      ownerId: 7,
      title: "",
      snippet: "",
      hashtags: ["#놀이", "#사료"],
      nodes: 9,
      likes: 2,
      likedByMe: true,
      bookmarks: 1,
      bookmarkId: 5,
      exploring: 3,
      exploringByMe: true,
      when: "2026-10-31",
      sessions: [],
    });
  });

  it("CONTENT 카드는 제목 · 소개글을 그대로 쓴다", () => {
    expect(toProfileMindmap(apiCard({ title: "로마 여행", snippet: "첫 문단" }))).toMatchObject({
      title: "로마 여행",
      snippet: "첫 문단",
    });
  });
});

describe("titleFromTags", () => {
  it("해시태그를 이어 붙이고, 없으면 안내 문구를 쓴다", () => {
    expect(titleFromTags(["놀이", "#사료"])).toBe("#놀이 #사료");
    expect(titleFromTags([])).toBe("원문 링크만 공개된 세션");
  });
});

describe("toFullMindmap", () => {
  const node = (id: string, res: CommunityProfileMindmap = API_MINDMAP) => toFullMindmap(res).nodes.find((n) => n.id === id)!;

  it("해시태그 노드와 URL 노드를 만들고 연결선을 그대로 잇는다", () => {
    const map = toFullMindmap(API_MINDMAP);

    expect(map.nodes.map((n) => n.id)).toEqual(["tag:1", "tag:2", "tag:3", "node:1", "node:2", "node:3"]);
    expect(map.edges).toEqual([["tag:1", "node:1"], ["tag:2", "node:1"], ["tag:2", "node:2"]]);
    expect(node("tag:1")).toMatchObject({ label: "놀이", group: "city" });
    expect(node("node:1").group).toBe("sub");
  });

  it("URL 라벨은 주소에서 사이트 이름만 남기고, URL 이 아닌 라벨은 그대로 둔다", () => {
    expect(node("node:1").label).toBe("nightjet.com");
    const res = { ...API_MINDMAP, nodes: [{ ...API_MINDMAP.nodes[0], label: "야간열차 예약" }] };
    expect(node("node:1", res).label).toBe("야간열차 예약");
  });

  it("sourceUrl 이 있는 노드만 원문 주소를 갖는다", () => {
    const res = {
      ...API_MINDMAP,
      nodes: [API_MINDMAP.nodes[0], { ...API_MINDMAP.nodes[1], sourceUrl: null, label: "메모" }],
    };

    expect(toFullMindmap(res).nodeUrls).toEqual({ "node:1": "https://www.nightjet.com/en" });
  });

  it("웹 주소가 아닌 sourceUrl 은 열리지 않게 뺀다", () => {
    const res = { ...API_MINDMAP, nodes: [{ ...API_MINDMAP.nodes[0], sourceUrl: "javascript:alert(1)" }] };

    expect(toFullMindmap(res).nodeUrls).toEqual({});
  });

  it("없는 노드를 가리키는 연결선은 버린다", () => {
    const res = { ...API_MINDMAP, edges: [{ from: "tag:1", to: "node:99" }] };

    expect(toFullMindmap(res).edges).toEqual([]);
  });

  it("연결이 없는 노드 · 해시태그까지 모두 Mindmap 경계 안의 서로 다른 자리에 놓는다", () => {
    const { nodes } = toFullMindmap(API_MINDMAP);

    for (const n of nodes) {
      expect(Number.isFinite(n.x) && Number.isFinite(n.y)).toBe(true);
      expect(Math.hypot(n.x - 600, n.y - 380)).toBeLessThanOrEqual(320);
    }
    expect(new Set(nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`)).size).toBe(nodes.length);
  });

  it("해시태그는 안쪽, 노드는 바깥 원에 놓고 같은 응답이면 배치가 같다", () => {
    const radius = (id: string) => Math.hypot(node(id).x - 600, node(id).y - 380);

    expect(radius("tag:1")).toBeLessThan(radius("node:1"));
    expect(toFullMindmap(API_MINDMAP)).toEqual(toFullMindmap(API_MINDMAP));
  });

  it("노드는 처음 이어진 해시태그 순으로, 연결 없는 노드는 그 뒤에 놓인다", () => {
    const res = { ...API_MINDMAP, nodes: [...API_MINDMAP.nodes].reverse() };
    const order = (id: string, r: CommunityProfileMindmap) => {
      const { x, y } = node(id, r);
      return (Math.atan2(y - 380, x - 600) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    };

    expect(order("node:1", res)).toBeLessThan(order("node:2", res));
    expect(order("node:2", res)).toBeLessThan(order("node:3", res));
  });

  it("해시태그가 하나뿐이어도 · 노드가 없어도 숫자 좌표가 나온다", () => {
    const res = { ...API_MINDMAP, hashtags: API_MINDMAP.hashtags.slice(0, 1), nodes: [], edges: [] };

    expect(toFullMindmap(res).nodes).toEqual([expect.objectContaining({ x: 600, y: 380 })]);
  });
});

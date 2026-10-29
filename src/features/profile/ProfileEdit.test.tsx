import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProvider } from "@/lib/app/PersonalContext";
import { NICKNAME_FORMAT_ERROR } from "@/lib/nickname";
import { MEMBER } from "@/test/fixtures/member";
import { MY_PROFILE, MY_PROFILE_PAGE } from "@/test/fixtures/profile";
import { API, fail, ok, server } from "@/test/msw/server";
import { renderApp, renderPersonal } from "@/test/render";
import { ProfileView } from "./ProfileView";

// 카드 · 팝업의 미리보기 그래프는 장식(aria-hidden)이라 가벼운 div 로 바꿔 DOM 을 줄인다 (요소 수천 개 → 쿼리가 느려짐)
vi.mock("@/components/mindmap/MindmapPreview", async () => {
  const { createElement } = await import("react");
  return { MindmapPreview: ({ children }: { children?: ReactNode }) => createElement("div", null, children) };
});

const titleOf = (id: number) => MY_PROFILE_PAGE.sessions.find((s) => s.id === id)!.title;

/** 내 프로필을 그리고 프로필 수정을 연다 */
async function openEdit() {
  const r = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);
  await r.user.click(screen.getByRole("button", { name: "프로필 수정" }));
  return r;
}

const saveButton = () => screen.getByRole("button", { name: "저장" });
const tagInput = () => screen.getByPlaceholderText("새 해시태그 추가");
const addButton = () => screen.getByRole("button", { name: "추가" });
const interestChips = () => screen.getAllByRole("button", { name: /×$/ }).map((b) => b.textContent!.replace(/\s*×$/, ""));
const pinRow = (id: number) => screen.getByText(titleOf(id)).closest("label")!;
const pinCheckbox = (id: number) => within(pinRow(id)).getByRole("checkbox");

/** 체크된 핀고정 세션 (표시 순서) */
function pinnedTitles() {
  return screen
    .getAllByRole("checkbox")
    .filter((c) => (c as HTMLInputElement).checked)
    .map((c) => c.closest("label")!.querySelector(".pinTitle")!.textContent);
}

function tagRow() {
  return within(document.querySelector<HTMLElement>(".tagRow")!);
}

describe("프로필 수정", () => {
  it("지금 프로필 값으로 채워져 열린다", async () => {
    await openEdit();

    expect(screen.getByDisplayValue("yesong")).toBeInTheDocument(); // 닉네임은 로그인 회원 기준
    expect(screen.getByDisplayValue(MY_PROFILE.bio)).toBeInTheDocument();
    expect(interestChips()).toEqual(MY_PROFILE.interests);
    expect(screen.getByText("최대 10개까지 등록할 수 있어요. (5/10)")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /원문 URL만 공개/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /내용까지 공개/ })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "#파리" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "#예산" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("노드 11개 · 비공개")).toBeInTheDocument();
    // 핀고정 세션이 순서대로 먼저, 나머지 세션이 그 뒤에
    expect(pinnedTitles()).toEqual([9001, 9003, 9002, 9005].map(titleOf));
    expect(screen.getAllByRole("checkbox")).toHaveLength(MY_PROFILE_PAGE.sessions.length);
    expect(screen.getByText("드래그로 순서 변경")).toBeInTheDocument();
  });

  describe("소개", () => {
    it("120자까지만 입력되고 저장하면 프로필에 그대로 보인다", async () => {
      const { user } = await openEdit();
      const bio = screen.getByDisplayValue(MY_PROFILE.bio);

      await user.clear(bio);
      await user.type(bio, "가".repeat(125));
      expect(bio).toHaveValue("가".repeat(120));

      await user.click(saveButton());
      expect(screen.getByText("가".repeat(120))).toBeInTheDocument();
    });
  });

  describe("관심 해시태그", () => {
    it("입력하고 Enter 를 누르면 '#' 을 붙여 추가되고 입력칸이 비워진다", async () => {
      const { user } = await openEdit();

      await user.type(tagInput(), "여행{Enter}");

      expect(interestChips()).toEqual([...MY_PROFILE.interests, "#여행"]);
      expect(tagInput()).toHaveValue("");
      expect(screen.getByText("최대 10개까지 등록할 수 있어요. (6/10)")).toBeInTheDocument();
    });

    it("추가 버튼으로도 추가되고 '#' 을 붙여 입력해도 한 번만 붙는다", async () => {
      const { user } = await openEdit();

      await user.type(tagInput(), "#카페");
      await user.click(addButton());

      expect(interestChips()).toContain("#카페");
      expect(interestChips()).not.toContain("##카페");
    });

    it.each([
      ["한글·영문·숫자가 아니면", "여행!", "한글·영문·숫자만 사용할 수 있어요."],
      ["10자를 넘으면", "가나다라마바사아자차카", "최대 10자까지 입력할 수 있어요."],
      ["대소문자만 다른 같은 태그가 있으면", "hci", "이미 추가된 해시태그입니다."],
      ["비어 있으면", "   ", "내용을 입력해주세요."],
    ])("%s 입력칸 아래 오류가 보이고 추가되지 않는다", async (_, input, message) => {
      const { user } = await openEdit();

      await user.type(tagInput(), input);
      await user.click(addButton());

      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(tagInput()).toHaveAttribute("aria-invalid", "true");
      expect(interestChips()).toEqual(MY_PROFILE.interests);
    });

    it("오류가 보이는 중에 다시 입력하면 오류가 사라진다", async () => {
      const { user } = await openEdit();

      await user.type(tagInput(), "여행!{Enter}");
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await user.type(tagInput(), "{Backspace}");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(tagInput()).not.toHaveAttribute("aria-invalid");
    });

    it("10개가 차면 추가 버튼이 비활성화되고 Enter 로도 더 추가되지 않는다", async () => {
      const { user } = await openEdit();

      for (const t of ["여행", "카페", "사진", "박물관", "기차"]) await user.type(tagInput(), `${t}{Enter}`);
      expect(screen.getByText("최대 10개까지 등록할 수 있어요. (10/10)")).toBeInTheDocument();
      expect(addButton()).toBeDisabled();

      await user.type(tagInput(), "하나더{Enter}");
      expect(screen.getByRole("alert")).toHaveTextContent("해시태그는 최대 10개까지 추가할 수 있어요.");
      expect(interestChips()).toHaveLength(10);
    });

    it("칩을 누르면 빠지고, 10개에서 하나를 빼면 다시 추가할 수 있다", async () => {
      const { user } = await openEdit();
      for (const t of ["여행", "카페", "사진", "박물관", "기차"]) await user.type(tagInput(), `${t}{Enter}`);

      await user.click(screen.getByRole("button", { name: /^#독서/ }));

      expect(interestChips()).not.toContain("#독서");
      expect(screen.getByText("최대 10개까지 등록할 수 있어요. (9/10)")).toBeInTheDocument();
      expect(addButton()).toBeEnabled();
    });
  });

  it("노드 공개 범위를 바꿔 저장하면 다시 열었을 때 그 값이 선택돼 있다", async () => {
    const { user } = await openEdit();

    await user.click(screen.getByRole("radio", { name: /내용까지 공개/ }));
    expect(screen.getByRole("radio", { name: /내용까지 공개/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /원문 URL만 공개/ })).not.toBeChecked();
    await user.click(saveButton());

    await user.click(screen.getByRole("button", { name: "프로필 수정" }));
    expect(screen.getByRole("radio", { name: /내용까지 공개/ })).toBeChecked();
  });

  it("해시태그 공개 토글을 바꿔 저장하면 비공개 태그만 내 프로필에서 잠금 표시된다", async () => {
    const { user } = await openEdit();

    await user.click(screen.getByRole("switch", { name: "#파리" }));
    await user.click(screen.getByRole("switch", { name: "#예산" }));
    expect(screen.getByText("노드 28개 · 비공개")).toBeInTheDocument();
    expect(screen.getByText("노드 11개 · 공개")).toBeInTheDocument();
    await user.click(saveButton());

    expect(tagRow().getByText("#파리")).toHaveClass("topTagPrivate");
    expect(tagRow().getByText("#파리").querySelector("svg")).not.toBeNull();
    expect(tagRow().getByText("#예산")).not.toHaveClass("topTagPrivate");
  });

  describe("핀고정 세션", () => {
    it("세션을 체크하면 핀고정 목록 끝에 붙고, 저장하면 공유 세션에 그 순서로 보인다", async () => {
      const { user } = await openEdit();

      await user.click(pinCheckbox(9004));
      expect(pinnedTitles()).toEqual([9001, 9003, 9002, 9005, 9004].map(titleOf));
      await user.click(saveButton());

      expect(screen.getByText("공유 세션", { selector: ".statL" }).previousElementSibling).toHaveTextContent("5");
      await user.click(screen.getByRole("button", { name: "세션 (5)" }));
      expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
        [9001, 9003, 9002, 9005, 9004].map(titleOf),
      );
    });

    it("핀고정 세션을 끌어다 놓으면 순서가 바뀌고, 저장하면 세션 탭 순서도 바뀐다", async () => {
      const { user } = await openEdit();
      const dataTransfer = { effectAllowed: "none", dropEffect: "none" };

      fireEvent.dragStart(pinRow(9002), { dataTransfer });
      fireEvent.dragOver(pinRow(9001), { dataTransfer });
      expect(pinRow(9002)).toHaveClass("pinRowDragging");
      expect(pinRow(9001)).toHaveClass("pinRowOver");

      fireEvent.drop(pinRow(9001), { dataTransfer });
      fireEvent.dragEnd(pinRow(9002), { dataTransfer });
      expect(pinnedTitles()).toEqual([9002, 9001, 9003, 9005].map(titleOf));
      expect(pinRow(9002)).not.toHaveClass("pinRowDragging");
      expect(pinRow(9001)).not.toHaveClass("pinRowOver");

      await user.click(saveButton());
      await user.click(screen.getByRole("button", { name: "세션 (4)" }));
      expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
        [9002, 9001, 9003, 9005].map(titleOf),
      );
    });

    it("핀고정되지 않은 세션은 끌어 옮길 수 없다", async () => {
      await openEdit();

      expect(pinRow(9001)).toHaveAttribute("draggable", "true");
      expect(pinRow(9004)).not.toHaveAttribute("draggable");
    });

    it("핀고정을 해제하면 확인 팝업이 뜨고 해제를 누르면 공유 목록에서 빠진다", async () => {
      const { user } = await openEdit();

      await user.click(pinCheckbox(9003));
      const dialog = screen.getByRole("dialog", { name: "핀고정을 해제할까요?" });
      expect(dialog).toHaveTextContent("세션 내용은 삭제되지 않아요.");
      expect(pinCheckbox(9003)).toBeChecked(); // 확인 전까지는 그대로

      await user.click(within(dialog).getByRole("button", { name: "해제" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(pinCheckbox(9003)).not.toBeChecked();
      expect(pinnedTitles()).toEqual([9001, 9002, 9005].map(titleOf));

      await user.click(saveButton());
      expect(screen.getByRole("button", { name: "세션 (3)" })).toBeInTheDocument();
    });

    it("확인 팝업에서 취소를 누르면 핀고정이 그대로 남는다", async () => {
      const { user } = await openEdit();

      await user.click(pinCheckbox(9003));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(pinnedTitles()).toEqual([9001, 9003, 9002, 9005].map(titleOf));
    });

    it("확인 팝업은 Esc 나 바깥을 눌러도 닫히고 핀고정은 그대로다", async () => {
      const { user } = await openEdit();

      await user.click(pinCheckbox(9003));
      expect(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" })).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(pinCheckbox(9003));
      await user.click(screen.getByRole("dialog").parentElement!);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(pinCheckbox(9003)).toBeChecked();
    });
  });

  it("저장하면 바꾼 소개 · 관심 해시태그가 프로필에 반영되고 저장 토스트가 뜬다", async () => {
    const { user, updateMember } = await openEdit();

    const bio = screen.getByDisplayValue(MY_PROFILE.bio);
    await user.clear(bio);
    await user.type(bio, "요즘은 동유럽.");
    await user.type(tagInput(), "동유럽{Enter}");
    await user.click(screen.getByRole("button", { name: /^#독서/ }));
    await user.click(saveButton());

    expect(screen.queryByRole("heading", { level: 1, name: "프로필 수정" })).not.toBeInTheDocument();
    expect(screen.getByText("요즘은 동유럽.")).toBeInTheDocument();
    expect(tagRow().getByText("#동유럽")).toBeInTheDocument();
    expect(tagRow().queryByText("#독서")).not.toBeInTheDocument();
    expect(screen.getByText("프로필을 저장했어요.")).toBeInTheDocument();
    // 닉네임을 안 바꿨으면 회원 API 는 부르지 않는다 (불렀다면 MSW 미등록 요청으로 실패)
    expect(updateMember).not.toHaveBeenCalled();
  });

  it("취소하면 바꾼 내용은 버려지고 다시 열어도 원래 값이다", async () => {
    const { user } = await openEdit();

    const bio = screen.getByDisplayValue(MY_PROFILE.bio);
    await user.clear(bio);
    await user.type(bio, "버릴 소개");
    await user.type(tagInput(), "버릴태그{Enter}");
    await user.click(screen.getByRole("switch", { name: "#파리" }));
    await user.click(pinCheckbox(9004));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getByText(MY_PROFILE.bio)).toBeInTheDocument();
    expect(tagRow().queryByText("#버릴태그")).not.toBeInTheDocument();
    expect(tagRow().getByText("#파리")).not.toHaveClass("topTagPrivate");
    expect(screen.getByRole("button", { name: "세션 (4)" })).toBeInTheDocument();
    expect(screen.queryByText("프로필을 저장했어요.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "프로필 수정" }));
    expect(screen.getByDisplayValue(MY_PROFILE.bio)).toBeInTheDocument();
    expect(interestChips()).toEqual(MY_PROFILE.interests);
  });

  describe("닉네임", () => {
    it("형식이 틀리면 입력칸 아래 오류가 보이고 저장 버튼이 비활성화된다", async () => {
      const { user } = await openEdit();
      const nickname = screen.getByDisplayValue("yesong");

      await user.clear(nickname);
      await user.type(nickname, "1abc");
      expect(screen.getByRole("alert")).toHaveTextContent(NICKNAME_FORMAT_ERROR);
      expect(nickname).toHaveAttribute("aria-invalid", "true");
      expect(saveButton()).toBeDisabled();

      await user.clear(nickname);
      await user.type(nickname, "abc1");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(saveButton()).toBeEnabled();
    });

    it("바꿔 저장하면 닉네임 변경 API 로 저장되고 프로필 이름 · 핸들이 새 닉네임으로 바뀐다", async () => {
      let body: unknown;
      server.use(
        http.patch(`${API}/members/me/nickname`, async ({ request }) => {
          body = await request.json();
          return ok({ ...MEMBER, nickname: "sprout" });
        }),
      );
      // 레이아웃처럼 회원 상태를 들고 있는 Provider — updateMember 로 바뀐 닉네임이 화면에 반영된다
      function MemberHost({ children }: { children: ReactNode }) {
        const [member, setMember] = useState(MEMBER);
        return (
          <PersonalProvider member={member} updateMember={setMember} logout={() => {}}>
            {children}
          </PersonalProvider>
        );
      }
      const { user } = renderApp(
        <MemberHost>
          <ProfileView data={MY_PROFILE_PAGE} />
        </MemberHost>,
      );
      await user.click(screen.getByRole("button", { name: "프로필 수정" }));
      const nickname = screen.getByDisplayValue("yesong");
      await user.clear(nickname);
      await user.type(nickname, "sprout");
      await user.click(saveButton());

      expect(await screen.findByRole("heading", { level: 1, name: "sprout" })).toBeInTheDocument();
      expect(screen.getByText("@sprout")).toBeInTheDocument();
      expect(screen.getByText("프로필을 저장했어요.")).toBeInTheDocument();
      expect(body).toEqual({ nickname: "sprout" });
    });

    it("저장 중에는 버튼이 저장 중… 으로 바뀌고 저장 · 취소를 누를 수 없다", async () => {
      let release!: () => void;
      server.use(
        http.patch(`${API}/members/me/nickname`, async () => {
          await new Promise<void>((r) => (release = r));
          return ok({ ...MEMBER, nickname: "sprout" });
        }),
      );
      const { user, updateMember } = await openEdit();
      const nickname = screen.getByDisplayValue("yesong");
      await user.clear(nickname);
      await user.type(nickname, "sprout");
      await user.click(saveButton());

      expect(await screen.findByRole("button", { name: "저장 중…" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();

      release();
      await waitFor(() => expect(updateMember).toHaveBeenCalledWith({ ...MEMBER, nickname: "sprout" }));
      expect(await screen.findByText("프로필을 저장했어요.")).toBeInTheDocument();
    });

    it("이미 쓰는 닉네임이면(409) 입력칸 아래 서버 메시지가 보이고 수정 화면이 유지된다", async () => {
      server.use(http.patch(`${API}/members/me/nickname`, () => fail(409, "이미 사용 중인 닉네임입니다.")));
      const { user, updateMember } = await openEdit();
      const nickname = screen.getByDisplayValue("yesong");
      await user.clear(nickname);
      await user.type(nickname, "admin");
      await user.click(saveButton());

      expect(await screen.findByRole("alert")).toHaveTextContent("이미 사용 중인 닉네임입니다.");
      expect(nickname).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("heading", { level: 1, name: "프로필 수정" })).toBeInTheDocument();
      expect(saveButton()).toBeEnabled();
      expect(updateMember).not.toHaveBeenCalled();
      expect(screen.queryByText("프로필을 저장했어요.")).not.toBeInTheDocument();

      // 닉네임을 다시 고치면 서버 오류 문구는 사라진다
      await user.type(nickname, "1");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("그 밖의 오류면 서버 메시지를 토스트로 알리고 수정 화면이 유지된다", async () => {
      server.use(http.patch(`${API}/members/me/nickname`, () => fail(500, "서버 오류가 발생했습니다.")));
      const { user, updateMember } = await openEdit();
      const nickname = screen.getByDisplayValue("yesong");
      await user.clear(nickname);
      await user.type(nickname, "sprout");
      await user.click(saveButton());

      expect(await screen.findByRole("alert")).toHaveTextContent("서버 오류가 발생했습니다.");
      expect(screen.getByRole("heading", { level: 1, name: "프로필 수정" })).toBeInTheDocument();
      expect(nickname).not.toHaveAttribute("aria-invalid");
      expect(updateMember).not.toHaveBeenCalled();
    });
  });
});

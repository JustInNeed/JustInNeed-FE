import { http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { API, fail, ok, server } from "@/test/msw/server";
import { installFakeExtension, loggedOutExtension, removeFakeExtension } from "@/test/extension";
import { setTokens } from "@/lib/auth/tokens";
import {
  EXTENSION_ID,
  ExtensionMissingError,
  connectExtension,
  consumeConnectAfterLogin,
  getExtensionStatus,
  logoutExtension,
  markConnectAfterLogin,
} from "./extension";

/** POST /auth/extension-code — 받은 Authorization 을 모아 두고 코드를 준다 */
function issueOk(code = "ext-code-1") {
  const auths: (string | null)[] = [];
  server.use(
    http.post(`${API}/auth/extension-code`, ({ request }) => {
      auths.push(request.headers.get("Authorization"));
      return ok({ code, expiresInSeconds: 60 });
    }),
  );
  return auths;
}

afterEach(() => removeFakeExtension());

describe("크롬 확장 연결 도구", () => {
  it("확장 ID 기본값은 확장 manifest key 로 고정한 값이다", () => {
    expect(EXTENSION_ID).toBe("pgmclbgdbaiigahdhpnieemifhgoikpa");
  });

  describe("상태 묻기", () => {
    it("확장이 답하면 로그인 여부 · 회원 id · 버전을 돌려주고, 고정 ID 로 JIN_STATUS 를 보낸다", async () => {
      const sent = installFakeExtension(() => ({ loggedIn: true, memberId: 12, version: "0.1.0" }));
      expect(await getExtensionStatus()).toEqual({ loggedIn: true, memberId: 12, version: "0.1.0" });
      expect(sent).toEqual([{ extensionId: EXTENSION_ID, message: { type: "JIN_STATUS" } }]);
    });

    it("chrome.runtime 이 없으면(확장 없음 · 크롬 아님) null", async () => {
      expect(await getExtensionStatus()).toBeNull();
    });

    it("받는 쪽이 없으면(확장 꺼짐) null", async () => {
      installFakeExtension(() => undefined);
      expect(await getExtensionStatus()).toBeNull();
    });
  });

  describe("연결", () => {
    it("웹 토큰으로 연결 코드를 받아 JIN_CONNECT 로 넘기고, 확장이 저장한 회원 id 를 돌려준다", async () => {
      setTokens({ accessToken: "web-a", refreshToken: "web-r" });
      const auths = issueOk("ext-code-1");
      const sent = installFakeExtension(loggedOutExtension(12));

      expect(await connectExtension()).toBe(12);
      expect(auths).toEqual(["Bearer web-a"]);
      expect(sent.map((s) => s.message)).toEqual([{ type: "JIN_STATUS" }, { type: "JIN_CONNECT", code: "ext-code-1" }]);
    });

    it("확장이 없으면 연결 코드를 받기 전에 ExtensionMissingError (1회용 코드를 헛되이 쓰지 않는다)", async () => {
      setTokens({ accessToken: "web-a", refreshToken: "web-r" });
      // extension-code 핸들러를 등록하지 않았으므로 요청이 나가면 테스트가 실패한다
      await expect(connectExtension()).rejects.toBeInstanceOf(ExtensionMissingError);
    });

    it("확장이 거절하면 확장이 준 문구 그대로 오류", async () => {
      setTokens({ accessToken: "web-a", refreshToken: "web-r" });
      issueOk();
      installFakeExtension((m) =>
        m.type === "JIN_STATUS"
          ? { loggedIn: false, memberId: null, version: "0.1.0" }
          : { ok: false, memberId: null, why: "JIN_CONNECT: POST /auth/token: 401 로그인 정보가 만료되었어요." },
      );
      await expect(connectExtension()).rejects.toThrow("JIN_CONNECT: POST /auth/token: 401 로그인 정보가 만료되었어요.");
    });

    it("연결 코드 발급이 실패하면 서버 문구 그대로 오류이고 확장에는 JIN_CONNECT 를 보내지 않는다", async () => {
      setTokens({ accessToken: "web-a", refreshToken: "web-r" });
      server.use(http.post(`${API}/auth/extension-code`, () => fail(409, "이미 로그아웃된 로그인이에요.")));
      const sent = installFakeExtension(loggedOutExtension());
      await expect(connectExtension()).rejects.toThrow("이미 로그아웃된 로그인이에요.");
      expect(sent.map((s) => s.message.type)).toEqual(["JIN_STATUS"]);
    });
  });

  describe("로그아웃", () => {
    it("확장에 JIN_LOGOUT 을 보낸다", async () => {
      const sent = installFakeExtension(loggedOutExtension());
      await logoutExtension();
      expect(sent.map((s) => s.message)).toEqual([{ type: "JIN_LOGOUT" }]);
    });

    it("확장이 없어도 오류 없이 끝난다 (웹 로그아웃을 막지 않는다)", async () => {
      await expect(logoutExtension()).resolves.toBeUndefined();
    });
  });

  it("로그인 뒤 연결 페이지로 돌아오라는 표시는 한 번 꺼내면 지워진다", () => {
    expect(consumeConnectAfterLogin()).toBe(false);
    markConnectAfterLogin();
    expect(consumeConnectAfterLogin()).toBe(true);
    expect(consumeConnectAfterLogin()).toBe(false);
  });
});

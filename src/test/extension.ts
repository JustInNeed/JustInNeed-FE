// 크롬 확장을 흉내 낸다. window.chrome.runtime.sendMessage 가 handler 의 답을 비동기로 돌려준다.
// handler 가 undefined 를 돌려주면 크롬의 "받는 쪽 없음"(확장 꺼짐)처럼 lastError 를 세우고 답 없이 콜백한다.
// 테스트 끝에 removeFakeExtension() 으로 지운다 (지우지 않으면 다음 테스트에 확장이 남는다).
import { vi } from "vitest";

export interface SentMessage {
  extensionId: string;
  message: { type: string; [key: string]: unknown };
}

type Handler = (message: SentMessage["message"]) => unknown;

export function installFakeExtension(handler: Handler): SentMessage[] {
  const sent: SentMessage[] = [];
  const runtime = {
    lastError: undefined as { message: string } | undefined,
    sendMessage: vi.fn((extensionId: string, message: SentMessage["message"], callback: (reply: unknown) => void) => {
      sent.push({ extensionId, message });
      const reply = handler(message);
      setTimeout(() => {
        if (reply === undefined) {
          runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." };
          callback(undefined);
          runtime.lastError = undefined;
          return;
        }
        callback(reply);
      }, 0);
    }),
  };
  (window as unknown as { chrome?: unknown }).chrome = { runtime };
  return sent;
}

export function removeFakeExtension(): void {
  delete (window as unknown as { chrome?: unknown }).chrome;
}

/** 로그인 안 된 확장: JIN_STATUS → 로그아웃 상태, JIN_CONNECT → 성공(회원 id), JIN_LOGOUT → ok */
export function loggedOutExtension(memberId = 7): Handler {
  return (m) => {
    if (m.type === "JIN_STATUS") return { loggedIn: false, memberId: null, version: "0.1.0" };
    if (m.type === "JIN_CONNECT") return { ok: true, memberId };
    if (m.type === "JIN_LOGOUT") return { ok: true };
    return { ok: false, why: `모르는 메시지: ${m.type}` };
  };
}

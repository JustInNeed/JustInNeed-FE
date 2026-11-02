// 크롬 확장(JustInNeed 실사용 버전)과 말하는 단일 지점.
// - 메시지 규약은 확장 레포 service/bg-auth.js 와 같다: JIN_STATUS · JIN_CONNECT · JIN_LOGOUT
// - 확장은 웹 토큰을 같이 쓰지 않는다 (refresh 토큰이 1회용이라 나눠 쓰면 서로를 로그아웃시킴).
//   웹이 연결 코드(POST /auth/extension-code)를 받아 넘기면 확장이 자기 전용 토큰으로 바꾼다
// - 확장이 없거나(설치 안 함 · 꺼짐 · 크롬이 아님) 응답이 없으면 "없음"으로 본다. 웹은 확장 없이도 그대로 동작해야 한다
import { issueExtensionCode } from "@/lib/api";

/** 확장 manifest 의 key 로 고정한 ID. 웹스토어에 올려 ID 가 바뀌면 환경 변수로 바꾼다 */
export const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID ?? "pgmclbgdbaiigahdhpnieemifhgoikpa";

// 확장 답을 기다리는 한도. 확장이 멈추면(서버 응답 대기 등) 웹 로그아웃 · 화면이 같이 멈추지 않게 넘기면 "답 없음"으로 본다.
// 연결은 확장이 서버를 두 번 부르므로(코드 교환 · 회원 확인, 각 10초 한도) 길게 둔다
export const REPLY_TIMEOUT_MS = 3_000;
export const CONNECT_TIMEOUT_MS = 25_000;

// 로그인 화면을 거쳐 돌아올 때 연결 페이지로 다시 오라는 표시 (탭마다 · OAuth 이동 동안 유지되는 sessionStorage)
const CONNECT_AFTER_LOGIN_KEY = "jin_extension_connect";

export interface ExtensionStatus {
  loggedIn: boolean;
  memberId: number | null;
  version: string;
}

/** 확장이 설치돼 있지 않음 (또는 꺼짐 · 크롬이 아님) */
export class ExtensionMissingError extends Error {
  constructor() {
    super("확장 프로그램이 설치돼 있지 않아요.");
    this.name = "ExtensionMissingError";
  }
}

interface Reply {
  ok?: boolean;
  why?: string;
  loggedIn?: boolean;
  memberId?: number | null;
  version?: string;
}

interface ChromeRuntime {
  sendMessage(extensionId: string, message: unknown, callback: (reply: unknown) => void): void;
  lastError?: { message?: string };
}

// 크롬은 이 사이트와 말할 수 있는 확장이 하나라도 깔려 있어야 웹에 chrome.runtime 을 연다
function runtime(): ChromeRuntime | null {
  if (typeof window === "undefined") return null;
  const rt = (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  return rt && typeof rt.sendMessage === "function" ? rt : null;
}

/** 확장에 메시지를 보낸다. 확장이 없거나 timeoutMs 안에 답이 없으면 null */
function send(message: Record<string, unknown>, timeoutMs = REPLY_TIMEOUT_MS): Promise<Reply | null> {
  const rt = runtime();
  if (!rt) return Promise.resolve(null);
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), timeoutMs); // 이미 답했으면 아무 일 없음
    try {
      rt.sendMessage(EXTENSION_ID, message, (reply) => {
        // 받는 쪽 없음 = 설치 안 됨 · 꺼짐. lastError 를 읽어야 크롬이 콘솔에 "Unchecked runtime.lastError" 를 안 띄운다
        if (rt.lastError || reply == null || typeof reply !== "object") {
          resolve(null);
          return;
        }
        resolve(reply as Reply);
      });
    } catch {
      resolve(null); // ID 형식이 틀렸을 때 등 — 없음과 같다
    }
  });
}

/** 확장 상태. 확장이 없으면 null */
export async function getExtensionStatus(): Promise<ExtensionStatus | null> {
  const r = await send({ type: "JIN_STATUS" });
  if (!r || typeof r.loggedIn !== "boolean") return null;
  return { loggedIn: r.loggedIn, memberId: r.memberId ?? null, version: r.version ?? "" };
}

/**
 * 연결 코드를 받아 확장에 넘긴다. 성공하면 확장이 저장한 회원 id.
 * 확장이 없으면 코드를 받기 전에 ExtensionMissingError (1회용 코드를 헛되이 쓰지 않게).
 * 확장이 거절하면 확장이 준 문구(why) 그대로 Error, 답이 없으면 "응답하지 않아요" Error. 코드 발급 실패는 ApiError 그대로.
 */
export async function connectExtension(): Promise<number | null> {
  if (!(await getExtensionStatus())) throw new ExtensionMissingError();
  const { code } = await issueExtensionCode();
  const r = await send({ type: "JIN_CONNECT", code }, CONNECT_TIMEOUT_MS);
  // 방금 상태에는 답했으니 없는 게 아니라 멈춘 것
  if (!r) throw new Error("확장 프로그램이 응답하지 않아요. 잠시 뒤 다시 시도해 주세요.");
  if (!r.ok) throw new Error(r.why || "확장 프로그램이 연결을 거절했어요.");
  return r.memberId ?? null;
}

/**
 * 웹 로그인 회원과 확장을 맞춘다 (개인 화면이 열릴 때). 확장이 로그아웃이거나 다른 회원이면 다시 연결한다.
 * 확장 설치가 늦었거나 확장 토큰이 만료 · 분실된 경우도 이걸로 복구된다.
 * 확장이 없으면 아무것도 안 한다. 실패해도 던지지 않고 콘솔 경고만 — 확장 때문에 웹 화면이 막히면 안 된다.
 */
export async function syncExtension(memberId: number): Promise<void> {
  try {
    const status = await getExtensionStatus();
    if (!status) return;
    if (status.loggedIn && status.memberId === memberId) return;
    await connectExtension();
  } catch (e) {
    if (e instanceof ExtensionMissingError) return;
    console.warn("[JustInNeed] 확장 프로그램 연결 실패:", e instanceof Error ? e.message : e);
  }
}

/** 확장도 로그아웃시킨다. 확장이 없거나 실패해도 웹 로그아웃은 막지 않는다 (답이 없으면 REPLY_TIMEOUT_MS 뒤 넘어간다) */
export async function logoutExtension(): Promise<void> {
  await send({ type: "JIN_LOGOUT" });
}

/** 로그인을 마치면 연결 페이지로 돌아오도록 표시 */
export function markConnectAfterLogin(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CONNECT_AFTER_LOGIN_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** 표시가 있었으면 true 를 돌려주고 지운다 */
export function consumeConnectAfterLogin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const marked = sessionStorage.getItem(CONNECT_AFTER_LOGIN_KEY) === "1";
    sessionStorage.removeItem(CONNECT_AFTER_LOGIN_KEY);
    return marked;
  } catch {
    return false;
  }
}

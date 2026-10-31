// API 응답을 흉내 내는 MSW 서버. 테스트마다 server.use(...) 로 필요한 응답만 등록한다.
// 등록하지 않은 요청이 나가면 테스트가 실패한다 (setup.ts: onUnhandledRequest "error").
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer();

/** lib/api/client.ts 의 기본 BASE_URL 과 같다 */
export const API = "http://localhost:8080";

/** 백엔드 GlobalExceptionHandler 의 500 응답 문구 */
export const SERVER_ERROR = "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

/** 백엔드 공통 응답 { success, data, message } — 성공 */
export function ok<T>(data: T, init?: ResponseInit) {
  return HttpResponse.json({ success: true, data, message: null }, init);
}

/** 백엔드 공통 응답 — 실패 (status · message 는 백엔드 ErrorCode 기준) */
export function fail(status: number, message: string) {
  return HttpResponse.json({ success: false, data: null, message }, { status });
}

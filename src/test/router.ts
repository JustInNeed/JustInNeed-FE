// next/navigation 대신 쓰는 테스트용 라우터. setup.ts 에서 모든 테스트에 주입된다.
// 테스트에서는 mockRouter.push 등이 어떤 경로로 불렸는지 확인한다.
import { vi } from "vitest";

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

/** usePathname() 이 돌려줄 현재 경로 */
export let mockPathname = "/";

export function setMockPathname(path: string) {
  mockPathname = path;
}

/** useSearchParams() 가 돌려줄 쿼리 문자열 */
export let mockSearchParams = "";

export function setMockSearchParams(search: string) {
  mockSearchParams = search;
}

export function resetMockRouter() {
  Object.values(mockRouter).forEach((fn) => fn.mockReset());
  mockPathname = "/";
  mockSearchParams = "";
}

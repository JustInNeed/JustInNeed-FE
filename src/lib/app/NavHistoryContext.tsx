"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * 앱 안 이동 기록 — "← 이전 페이지" 버튼(QA-025)이 어디로 돌아갈지 정한다.
 *
 * - 사이드바 메뉴로 이동하면 기록을 비우고 그 화면부터 다시 쌓는다 (메뉴로 바로 간 화면엔 뒤로 버튼 없음).
 * - 그 밖의 이동(카드 · 프로필 · 버튼)은 기록에 쌓는다 → 이전 화면 이름이 버튼 문구가 된다.
 * - 브라우저 뒤로 가기 · 뒤로 버튼으로 바로 앞 화면에 돌아오면 기록에서 뺀다.
 * - 새로고침해도 이어지도록 sessionStorage 에 둔다 (탭마다 따로).
 * - 돌아갈 때는 router.back() 이라 검색어 같은 쿼리도 브라우저 기록 그대로 복원된다.
 */

const STORAGE_KEY = "nav-history";
const MAX = 30;

/** 사이드바 메뉴 링크에 붙이는 속성 — 이 링크로 이동하면 기록을 비운다 */
export const NAV_ROOT_ATTR = "data-nav-root";

const PAGE_LABELS: [RegExp, string][] = [
  [/^\/home$/, "홈"],
  [/^\/analytics$/, "분석 및 추천"],
  [/^\/sessions$/, "세션 목록"],
  [/^\/sessions\/[^/]+$/, "세션 상세"],
  [/^\/settings$/, "설정"],
  [/^\/community$/, "커뮤니티"],
  [/^\/search$/, "검색"],
  [/^\/bookmarks$/, "북마크"],
  [/^\/profile$/, "내 프로필"],
  [/^\/profile\/[^/]+$/, "프로필"],
];

/** 경로 → 뒤로 버튼에 보일 화면 이름 (각 화면 제목과 같게) */
export function pageLabel(pathname: string): string {
  return PAGE_LABELS.find(([re]) => re.test(pathname))?.[1] ?? "이전 페이지";
}

export interface NavEntry {
  pathname: string;
}

/** 새 주소로 바뀌었을 때 기록을 어떻게 바꿀지 */
export function nextHistory(stack: NavEntry[], entry: NavEntry, root: boolean): NavEntry[] {
  if (root || stack.length === 0) return [entry];
  const top = stack[stack.length - 1];
  // 같은 화면 (새로고침 등)
  if (top.pathname === entry.pathname) return stack;
  // 바로 앞 화면으로 돌아옴 (뒤로 가기)
  if (stack.length >= 2 && stack[stack.length - 2].pathname === entry.pathname) {
    return [...stack.slice(0, -2), entry];
  }
  return [...stack, entry].slice(-MAX);
}

function loadStack(): NavEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStack(stack: NavEntry[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    /* 저장 못 해도 이번 탭 안에서는 동작 */
  }
}

interface NavHistoryValue {
  /** 바로 앞 화면. 없으면 null (메뉴로 바로 왔거나 주소로 직접 들어옴) */
  previous: NavEntry | null;
  /** 바로 앞 화면으로 돌아간다 */
  back: () => void;
  /** 기록을 비우고 이동 (메뉴처럼 처음부터 다시 쌓음) */
  pushRoot: (href: string) => void;
}

const NavHistoryContext = createContext<NavHistoryValue | null>(null);

export function NavHistoryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stack, setStack] = useState<NavEntry[]>([]);
  // 다음 이동이 메뉴 이동인지 — 누른 링크의 경로를 기억했다가 그 경로로 바뀌면 기록을 비운다
  // (나가기 경고에서 취소하면 이동이 안 일어나므로 경로가 같을 때만 쓴다)
  const rootTarget = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.(`a[${NAV_ROOT_ATTR}]`);
      if (a instanceof HTMLAnchorElement) rootTarget.current = new URL(a.href).pathname;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const root = rootTarget.current === pathname;
    rootTarget.current = null;
    const next = nextHistory(loadStack(), { pathname }, root);
    saveStack(next);
    setStack(next);
  }, [pathname]);

  const previous = stack.length >= 2 ? stack[stack.length - 2] : null;

  const back = useCallback(() => {
    if (previous) router.back();
  }, [previous, router]);

  const pushRoot = useCallback(
    (href: string) => {
      rootTarget.current = new URL(href, window.location.origin).pathname;
      router.push(href);
    },
    [router],
  );

  const value = useMemo(() => ({ previous, back, pushRoot }), [previous, back, pushRoot]);
  return <NavHistoryContext.Provider value={value}>{children}</NavHistoryContext.Provider>;
}

/** 이 화면의 뒤로 가기 대상. 기록이 없으면 fallback(예: 세션 상세 → 세션 목록), 그것도 없으면 null */
export function useBackTarget(fallback?: string): { label: string; go: () => void } | null {
  const ctx = useContext(NavHistoryContext);
  const router = useRouter();
  if (ctx?.previous) return { label: pageLabel(ctx.previous.pathname), go: ctx.back };
  if (fallback) {
    return { label: pageLabel(fallback), go: () => (ctx ? ctx.pushRoot(fallback) : router.push(fallback)) };
  }
  return null;
}

/** 기록을 비우고 이동 — 삭제 후 목록으로 가기처럼 돌아올 화면이 없어지는 이동에 쓴다 */
export function useNavRoot(): (href: string) => void {
  const ctx = useContext(NavHistoryContext);
  const router = useRouter();
  return (href) => (ctx ? ctx.pushRoot(href) : router.push(href));
}

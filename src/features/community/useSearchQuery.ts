"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { normalizeSearchQuery, SEARCH_DEBOUNCE_MS } from "./useCommunitySearch";

const searchPath = (q: string) => (q ? `/search?${new URLSearchParams({ q })}` : "/search");

/**
 * /search 검색어 — 주소(?q=)에 남겨서 새로고침 · 뒤로 가기 · 공유 링크로 같은 검색을 다시 연다.
 * 글자마다 기록이 쌓이지 않게 입력이 멈춘 뒤 replace 로 바꾼다.
 */
export function useSearchQuery() {
  const router = useRouter();
  const urlInput = useSearchParams().get("q") ?? "";
  const urlQ = normalizeSearchQuery(urlInput);

  const [input, setInput] = useState(urlInput);
  const q = normalizeSearchQuery(input);
  const requestQ = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);

  // 주소가 곧 가리키게 될 검색어 — replace 는 바로 반영되지 않는다
  const urlTarget = useRef(urlQ);
  const ownWrites = useRef(new Set<string>());

  useEffect(() => {
    if (requestQ === urlTarget.current) return;
    urlTarget.current = requestQ;
    ownWrites.current.add(requestQ);
    router.replace(searchPath(requestQ), { scroll: false });
  }, [requestQ, router]);

  // 사이드바 "검색" 처럼 바깥에서 주소가 바뀌면 입력을 따라간다.
  // 내가 바꾼 주소가 늦게 도착한 것은 무시 — 그 사이 더 친 글자를 지우면 안 된다
  useEffect(() => {
    if (ownWrites.current.delete(urlQ)) return;
    urlTarget.current = urlQ;
    setInput(urlInput);
  }, [urlQ, urlInput]);

  return { input, setInput, q, requestQ };
}

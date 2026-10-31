"use client";

import { useCallback, useRef, useState } from "react";

export interface OptimisticAction<T> {
  /** 값이 바뀌는 대상 (카드 · 사람) */
  id: string;
  /** 대상 안에서 어떤 동작인지 — 같은 동작이 진행 중이면 다시 보내지 않는다 */
  action: string;
  optimistic: Partial<T>;
  /** 실패하면 되돌릴 값 */
  revert: Partial<T>;
  /** 성공하면 서버가 준 값으로 덮어쓴다 */
  request: () => Promise<Partial<T>>;
}

/**
 * 받은 목록 위에 덮어쓸 값을 id 별로 모은다 — 먼저 바꾸고, 실패하면 되돌린다.
 * 같은 id 가 여러 목록에 있어도 patches[id] 하나로 함께 바뀐다.
 * 응답 순서가 뒤바뀌면 화면과 서버가 어긋나므로 같은 동작은 응답을 받은 뒤에야 다시 보낸다.
 */
export function useOptimisticPatches<T extends object>(onError: (e: unknown) => void) {
  const [patches, setPatches] = useState<Record<string, Partial<T>>>({});
  const pending = useRef(new Set<string>());

  const run = useCallback(
    async ({ id, action, optimistic, revert, request }: OptimisticAction<T>) => {
      const key = `${id}:${action}`;
      if (pending.current.has(key)) return;
      pending.current.add(key);
      const apply = (patch: Partial<T>) => setPatches((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));
      apply(optimistic);
      try {
        apply(await request());
      } catch (e) {
        apply(revert);
        onError(e);
      } finally {
        pending.current.delete(key);
      }
    },
    [onError],
  );

  return { patches, run };
}

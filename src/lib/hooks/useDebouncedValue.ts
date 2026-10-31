"use client";

import { useEffect, useState } from "react";

/** 값이 ms 동안 바뀌지 않으면 그 값을 돌려준다. 첫 값은 기다리지 않는다 */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return debounced;
}

"use client";

import { useEffect } from "react";

/** 전체 화면 오버레이 공통 — Esc 로 닫기 + 열려 있는 동안 body 스크롤 잠금 */
export function useOverlayClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);
}

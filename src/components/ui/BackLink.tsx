"use client";

import { useBackTarget } from "@/lib/app/NavHistoryContext";
import styles from "./BackLink.module.css";

export interface BackLinkProps {
  /** 앱 안 이동 기록이 없을 때(주소로 직접 들어옴) 돌아갈 화면. 없으면 버튼을 그리지 않는다 */
  fallback?: string;
  /** 이동 전에 끼어들 때 (예: 저장 안 한 편집 → 나가기 경고). 받은 go 를 부르면 이동한다 */
  onNavigate?: (go: () => void) => void;
  className?: string;
}

/** "← 이전 화면" — 문구는 실제로 직전에 보던 화면 이름 (QA-025). 사이드바 메뉴로 바로 온 화면엔 없다 */
export function BackLink({ fallback, onNavigate, className }: BackLinkProps) {
  const target = useBackTarget(fallback);
  if (!target) return null;
  return (
    <button
      type="button"
      className={[styles.back, className].filter(Boolean).join(" ")}
      onClick={() => (onNavigate ? onNavigate(target.go) : target.go())}
    >
      ← {target.label}
    </button>
  );
}

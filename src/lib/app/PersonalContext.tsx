"use client";

// (personal) 레이아웃 하위 화면이 공유하는 앱 상태.
// - member / logout : 사이드바·설정 계정 섹션에서 사용
// - recording       : 확장 프로그램 수집 상태 (사이드바 버튼)
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { MemberResponse } from "@/lib/api";

export interface PersonalContextValue {
  member: MemberResponse;
  logout: () => void;
  recording: boolean;
  setRecording: (v: boolean) => void;
  /** 수집 시작 이후 경과 초 (recording=false 면 0) */
  recordingSeconds: number;
}

const Ctx = createContext<PersonalContextValue | null>(null);

export function PersonalProvider({
  member,
  logout,
  children,
}: {
  member: MemberResponse;
  logout: () => void;
  children: ReactNode;
}) {
  const [recording, setRecordingState] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    if (!recording) {
      setRecordingSeconds(0);
      return;
    }
    const t = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const setRecording = useCallback((v: boolean) => setRecordingState(v), []);

  return (
    <Ctx.Provider value={{ member, logout, recording, setRecording, recordingSeconds }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePersonal(): PersonalContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePersonal must be used inside PersonalProvider");
  return v;
}

/** 초 → "23분 14초" / "1시간 02분 05초" */
export function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}시간 ${String(m).padStart(2, "0")}분 ${String(s).padStart(2, "0")}초`;
  return `${m}분 ${String(s).padStart(2, "0")}초`;
}

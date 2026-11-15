"use client";

// (personal) 레이아웃 하위 화면이 공유하는 앱 상태.
// - member / logout : 사이드바·설정 계정 섹션에서 사용
// - updateMember    : 닉네임 변경 등 회원 정보가 바뀌었을 때 레이아웃 상태 갱신
// - extension       : 크롬 확장 상태 (사이드바 EXTENSION 카드). 화면이 보이는 동안 STATUS_POLL_MS 마다,
//                     탭으로 돌아올 때마다 확장에 묻는다 — 확장 팝업에서 켜고 끄거나 무동작으로 저절로 멈춘 것도 따라간다
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { MemberResponse } from "@/lib/api";
import { getExtensionStatus, startRecording, stopRecording } from "@/lib/extension";

/** 확장 상태를 다시 묻는 간격 */
export const STATUS_POLL_MS = 3_000;

export type ExtensionView =
  /** 아직 한 번도 못 물어봄 (첫 답 전) */
  | { kind: "checking" }
  /** 설치 안 함 · 꺼짐 · 크롬 아님 · 답 없음 */
  | { kind: "missing" }
  /** 확장이 로그아웃이거나 다른 회원으로 로그인됨 → 연결 페이지에서 다시 연결 */
  | { kind: "needsLogin" }
  /** 이 회원으로 연결됨. recording null = 수집 상태를 알려 주지 않는 옛 확장 */
  | { kind: "connected"; recording: boolean | null; startedAt: number | null };

export interface PersonalContextValue {
  member: MemberResponse;
  updateMember: (member: MemberResponse) => void;
  logout: () => void;
  extension: ExtensionView;
  /** 수집 시작 이후 경과 초 (기록 중이 아니면 0) */
  recordingSeconds: number;
  /** 수집 시작 · 종료를 확장에 보내는 중 */
  recordingBusy: boolean;
  /** 마지막 시작 · 종료 실패 문구 (성공하거나 상태가 바뀌면 지움) */
  recordingError: string | null;
  /** 기록 중이면 종료, 아니면 시작 */
  toggleRecording: () => Promise<void>;
}

const Ctx = createContext<PersonalContextValue | null>(null);

export function PersonalProvider({
  member,
  updateMember,
  logout,
  children,
}: {
  member: MemberResponse;
  updateMember: (member: MemberResponse) => void;
  logout: () => void;
  children: ReactNode;
}) {
  const [extension, setExtension] = useState<ExtensionView>({ kind: "checking" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // 마지막으로 보낸 요청 번호. 늦게 도착한 옛 답(예: 시작 버튼 전에 보낸 상태 묻기)이 새 상태를 덮지 않게 한다
  const gen = useRef(0);
  const memberId = member.id;

  const refresh = useCallback(async () => {
    const my = ++gen.current;
    const s = await getExtensionStatus();
    if (my !== gen.current) return;
    if (!s) setExtension({ kind: "missing" });
    else if (!s.loggedIn || s.memberId !== memberId) setExtension({ kind: "needsLogin" });
    else setExtension({ kind: "connected", recording: s.recording, startedAt: s.startedAt });
  }, [memberId]);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (alive && document.visibilityState === "visible") void refresh();
    };
    tick();
    const t = setInterval(tick, STATUS_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      alive = false;
      gen.current++; // 떠난 뒤 도착하는 답은 버린다
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [refresh]);

  const recording = extension.kind === "connected" && extension.recording === true;
  const startedAt = extension.kind === "connected" ? extension.startedAt : null;

  // 기록 중에만 1초마다 시계를 돌린다. 경과 시간은 확장이 시작한 시각 기준이라 새로 고쳐도 이어진다
  useEffect(() => {
    if (!recording) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // 확장 상태가 바뀌면(팝업에서 켬 · 연결 끊김 등) 지난 실패 문구는 의미가 없다
  useEffect(() => setError(null), [extension.kind, recording]);

  const recordingSeconds = recording && startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;

  const toggleRecording = useCallback(async () => {
    if (extension.kind !== "connected" || extension.recording === null || busy) return;
    const my = ++gen.current;
    setBusy(true);
    setError(null);
    try {
      const r = extension.recording ? await stopRecording() : await startRecording();
      if (my === gen.current) setExtension({ kind: "connected", recording: r.recording, startedAt: r.startedAt });
    } catch (e) {
      if (my === gen.current) setError(e instanceof Error ? e.message : String(e));
      void refresh(); // 실패해도 실제 상태는 다시 맞춘다 (예: 확장에서 로그아웃돼 거절)
    } finally {
      setBusy(false);
    }
  }, [extension, busy, refresh]);

  return (
    <Ctx.Provider
      value={{
        member,
        updateMember,
        logout,
        extension,
        recordingSeconds,
        recordingBusy: busy,
        recordingError: error,
        toggleRecording,
      }}
    >
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

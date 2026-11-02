"use client";

// 크롬 확장 연결 페이지. 확장 팝업의 [로그인하러 가기] 가 이 주소를 새 탭으로 연다.
// 로그인 안 됐으면 로그인 화면 → 소셜 로그인 → 콜백이 다시 이 페이지로 보낸다 (markConnectAfterLogin).
// 연결이 끝나면 확장이 이 탭을 닫고 원래 보던 탭으로 돌아간다 — 이 페이지는 닫기를 직접 하지 않는다.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { SessionExpiredError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";
import {
  ExtensionMissingError,
  connectExtension,
  consumeConnectAfterLogin,
  markConnectAfterLogin,
} from "@/lib/extension";
import styles from "./connect.module.css";

type State =
  | { kind: "working" }
  | { kind: "login" }
  | { kind: "done" }
  | { kind: "missing" }
  | { kind: "error"; message: string };

export default function ExtensionConnectPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "working" });
  // StrictMode 에서 effect 가 두 번 돌아도 한 번만 (연결 코드는 1회용)
  const started = useRef(false);

  const run = useCallback(async () => {
    setState({ kind: "working" });
    // 도중에 로그인이 만료되면 클라이언트가 /login 으로 보낸다 → 다시 로그인한 뒤 이 페이지로 돌아오게 미리 표시
    markConnectAfterLogin();
    try {
      await connectExtension();
      consumeConnectAfterLogin();
      setState({ kind: "done" });
    } catch (e) {
      if (e instanceof SessionExpiredError) return; // 로그인 화면으로 이동 중 — 표시는 남긴다
      consumeConnectAfterLogin();
      if (e instanceof ExtensionMissingError) setState({ kind: "missing" });
      else setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!getAccessToken()) {
      markConnectAfterLogin();
      setState({ kind: "login" });
      router.replace("/login");
      return;
    }
    void run();
  }, [router, run]);

  return (
    <div className={styles.wrap}>
      {state.kind === "working" && (
        <>
          <div className={styles.spinner} aria-hidden />
          <p className={styles.text}>확장 프로그램과 연결하는 중…</p>
        </>
      )}
      {state.kind === "login" && (
        <>
          <div className={styles.spinner} aria-hidden />
          <p className={styles.text}>로그인 화면으로 이동하는 중…</p>
        </>
      )}
      {state.kind === "done" && (
        <>
          <p className={styles.title}>확장 프로그램과 연결됐어요</p>
          <p className={styles.text}>이 창은 곧 저절로 닫혀요. 닫히지 않으면 직접 닫아도 돼요.</p>
        </>
      )}
      {state.kind === "missing" && (
        <>
          <p className={styles.title}>확장 프로그램이 설치돼 있지 않아요</p>
          <p className={styles.text}>크롬에 JustInNeed 확장 프로그램을 설치하거나 켠 뒤 다시 시도해 주세요.</p>
          <Button variant="primary" onClick={() => void run()}>
            다시 시도
          </Button>
        </>
      )}
      {state.kind === "error" && (
        <>
          <p className={styles.title}>확장 프로그램과 연결하지 못했어요</p>
          <p className={styles.error}>{state.message}</p>
          <Button variant="primary" onClick={() => void run()}>
            다시 시도
          </Button>
        </>
      )}
    </div>
  );
}

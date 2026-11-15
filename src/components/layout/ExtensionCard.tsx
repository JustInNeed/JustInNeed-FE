"use client";

// 사이드바 아래 EXTENSION 카드 — 크롬 확장의 실제 상태를 보여 주고, 연결돼 있으면 수집을 켜고 끈다.
// 상태는 PersonalContext 가 몇 초마다 확장에 물어 맞춘다(확장 팝업에서 켜고 끈 것 · 무동작 자동 정지도 따라감).
import Link from "next/link";
import { Icon } from "@/components/ui";
import { formatElapsed, usePersonal } from "@/lib/app/PersonalContext";
import styles from "./Sidebar.module.css";

const DOT_ON = "var(--green-500)";
const DOT_OFF = "var(--ink-300)";

export function ExtensionCard() {
  const { extension, recordingSeconds, recordingBusy, recordingError, toggleRecording } = usePersonal();

  let dot = DOT_OFF;
  let title: string;
  let sub: string;
  let action: React.ReactNode = null;

  switch (extension.kind) {
    case "checking":
      title = "확인 중";
      sub = "확장 프로그램 상태를 확인하고 있어요";
      break;
    case "missing":
      title = "연결 안 됨";
      sub = "크롬 확장 프로그램이 설치돼 있지 않거나 꺼져 있어요";
      break;
    case "needsLogin":
      title = "로그인 필요";
      sub = "확장 프로그램을 이 계정과 연결해 주세요";
      action = (
        <Link href="/extension/connect" className={`${styles.recBtn} ${styles.recBtnPrimary}`}>
          <Icon name="link" size={12} />
          <span>연결하기</span>
        </Link>
      );
      break;
    case "connected": {
      if (extension.recording === null) {
        // 수집 상태를 알려 주지 않는 옛 확장 — 켜고 끄기는 확장 팝업에서
        title = "연결됨";
        sub = "확장 프로그램을 업데이트하면 여기서 수집을 켜고 끌 수 있어요";
        break;
      }
      const on = extension.recording;
      if (on) dot = DOT_ON;
      title = on ? "수집 중" : "대기 중";
      sub = on ? formatElapsed(recordingSeconds) : "버튼을 눌러 시작";
      action = (
        <button
          type="button"
          onClick={() => void toggleRecording()}
          disabled={recordingBusy}
          className={`${styles.recBtn} ${on ? styles.recBtnSecondary : styles.recBtnPrimary}`}
        >
          <Icon name={on ? "stop" : "play"} size={12} />
          <span>{on ? "수집 종료" : "수집 시작"}</span>
        </button>
      );
      break;
    }
  }

  return (
    <div className={styles.recBox}>
      <div className={styles.recHead}>
        <span className={styles.recEyebrow}>EXTENSION</span>
        <span className={styles.statusDot} style={{ background: dot }} />
      </div>
      <div className={styles.recTitle}>{title}</div>
      <div className={styles.recSub}>{sub}</div>
      {recordingError && (
        <div className={styles.recError} role="alert">
          {recordingError}
        </div>
      )}
      {action}
    </div>
  );
}

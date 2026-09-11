"use client";

import { useState } from "react";
import { Icon, Card, Field, inputClass, Button } from "@/components/ui";
import { SOCIAL_PROVIDER_LABEL } from "@/lib/api";
import { usePersonal } from "@/lib/app/PersonalContext";
import { PROVIDERS } from "@/features/auth/providers";
import type { ProviderId } from "@/lib/types";
import styles from "./SettingsView.module.css";

const FORMAT = /^[a-zA-Z][a-zA-Z0-9]{2,7}$/;

/** 계정 섹션 — 닉네임 변경(중복 확인은 백엔드 전용 API 부재로 로컬 시뮬레이션), 연결된 소셜 계정, 로그아웃. */
export function AccountSection() {
  const { member, logout } = usePersonal();
  const current = member.nickname ?? "";
  const [nickname, setNickname] = useState(current);
  const [status, setStatus] = useState<null | "ok" | "taken">(null);

  const isFormatValid = FORMAT.test(nickname);
  const isChanged = nickname !== current;
  const canCheck = isChanged && isFormatValid;
  const showInvalidHint = isChanged && !isFormatValid;

  const onCheck = () => {
    if (!canCheck) return;
    const taken = ["admin", "test"].includes(nickname.toLowerCase());
    setStatus(taken ? "taken" : "ok");
  };

  const providerId = member.socialProvider.toLowerCase() as ProviderId;
  const provider = PROVIDERS.find((p) => p.id === providerId);

  return (
    <Card className={styles.card}>
      <Field label="닉네임" hint="영어 시작, 3-8자 (영문/숫자)">
        <div className={styles.nickRow}>
          <input
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setStatus(null);
            }}
            maxLength={8}
            className={inputClass}
            style={{ flex: 1 }}
          />
          <button onClick={onCheck} disabled={!canCheck} className={`${styles.checkBtn} ${canCheck ? styles.checkBtnOn : ""}`}>
            중복 확인
          </button>
        </div>
        {showInvalidHint && <div className={styles.hintErr}>영문으로 시작하는 3-8자(영문·숫자)로 입력해주세요.</div>}
        {status === "ok" && (
          <div className={styles.hintOk}>
            <Icon name="check" size={11} /> 사용 가능한 닉네임입니다.
          </div>
        )}
        {status === "taken" && <div className={styles.hintErr}>이미 사용 중인 닉네임입니다.</div>}
      </Field>

      <Field label="연결된 계정" hint="회원가입 시 사용">
        <div className={styles.providerBox}>
          <span className={styles.providerIcon} style={{ background: provider?.bg ?? "var(--green-100)", color: provider?.fg, border: provider?.border }}>
            {provider?.icon}
          </span>
          <div className={styles.providerMain}>
            <div className={styles.providerName}>{SOCIAL_PROVIDER_LABEL[member.socialProvider]}로 로그인</div>
            <div className={styles.providerEmail}>{member.email ?? "이메일 정보 없음"}</div>
          </div>
        </div>
      </Field>

      <Button variant="secondary" onClick={logout} style={{ color: "#c44", marginTop: 8 }}>
        로그아웃
      </Button>
    </Card>
  );
}

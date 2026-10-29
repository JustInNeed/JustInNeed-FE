"use client";

import { useRef, useState } from "react";
import { Card, Field, FieldMessage, inputClass, Button } from "@/components/ui";
import { ApiError, SOCIAL_PROVIDER_LABEL, updateNickname } from "@/lib/api";
import { usePersonal } from "@/lib/app/PersonalContext";
import { useToast } from "@/lib/app/ToastContext";
import {
  NICKNAME_AVAILABLE_MESSAGE,
  NICKNAME_CHECK_FAILED_MESSAGE,
  NICKNAME_FORMAT_ERROR,
  NICKNAME_HINT,
  NICKNAME_MAX_LENGTH,
  NICKNAME_TAKEN_MESSAGE,
  checkNicknameAvailable,
  isValidNickname,
  type CheckNickname,
} from "@/lib/nickname";
import { PROVIDERS } from "@/features/auth/providers";
import type { ProviderId } from "@/lib/types";
import styles from "./SettingsView.module.css";

export interface AccountSectionProps {
  onWithdraw: () => void;
  /** 중복 확인 — 기본은 형식만 보고 통과 (lib/nickname) */
  checkNickname?: CheckNickname;
}

type CheckStatus = null | "checking" | "ok" | "taken" | "failed";

/**
 * 계정 섹션 — 닉네임 변경, 연결된 소셜 계정, 로그아웃.
 * 중복 확인은 주입받은 함수로 하고, 저장은 형식만 맞으면 가능하다. 실제 중복은 서버 409 로 확인.
 */
export function AccountSection({ onWithdraw, checkNickname = checkNicknameAvailable }: AccountSectionProps) {
  const { member, updateMember, logout } = usePersonal();
  const toast = useToast();
  const current = member.nickname ?? "";
  const [nickname, setNickname] = useState(current);
  const [status, setStatus] = useState<CheckStatus>(null);
  // 확인 중에 입력이 바뀌면 늦게 온 결과는 버린다
  const latest = useRef(nickname);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isFormatValid = isValidNickname(nickname);
  const isChanged = nickname !== current;
  const canCheck = isChanged && isFormatValid && status !== "checking";
  const canSave = isChanged && isFormatValid && !saving;
  const showInvalidHint = isChanged && !isFormatValid;
  const errorText = showInvalidHint
    ? NICKNAME_FORMAT_ERROR
    : saveError ?? (status === "taken" ? NICKNAME_TAKEN_MESSAGE : status === "failed" ? NICKNAME_CHECK_FAILED_MESSAGE : null);

  const onCheck = async () => {
    if (!canCheck) return;
    const value = nickname;
    setStatus("checking");
    let next: CheckStatus;
    try {
      next = (await checkNickname(value)) ? "ok" : "taken";
    } catch {
      next = "failed";
    }
    if (latest.current === value) setStatus(next);
  };

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const updated = await updateNickname(nickname);
      updateMember(updated);
      setStatus(null);
      toast.success("닉네임을 변경했어요.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setSaveError(e.message);
      else toast.error(e instanceof ApiError ? e.message : "저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const providerId = member.socialProvider.toLowerCase() as ProviderId;
  const provider = PROVIDERS.find((p) => p.id === providerId);

  return (
    <Card className={styles.card}>
      <Field label="닉네임" hint={NICKNAME_HINT}>
        <div className={styles.nickRow}>
          <input
            value={nickname}
            onChange={(e) => {
              latest.current = e.target.value;
              setNickname(e.target.value);
              setStatus(null);
              setSaveError(null);
            }}
            maxLength={NICKNAME_MAX_LENGTH}
            aria-invalid={errorText ? true : undefined}
            aria-describedby={errorText || status === "ok" ? "account-nickname-message" : undefined}
            className={inputClass}
            style={{ flex: 1 }}
          />
          <button onClick={onCheck} disabled={!canCheck} className={`${styles.checkBtn} ${canCheck ? styles.checkBtnOn : ""}`}>
            {status === "checking" ? "확인 중…" : "중복 확인"}
          </button>
        </div>
        {errorText ? (
          <FieldMessage tone="error" id="account-nickname-message">
            {errorText}
          </FieldMessage>
        ) : (
          status === "ok" && (
            <FieldMessage tone="success" id="account-nickname-message">
              {NICKNAME_AVAILABLE_MESSAGE}
            </FieldMessage>
          )
        )}
        <div className={styles.nickActions}>
          <Button variant="primary" onClick={onSave} disabled={!canSave}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
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

      <div className={styles.divider} />
      <div className={styles.withdrawRow}>
        <div>
          <div className={styles.withdrawTitle}>회원 탈퇴</div>
          <div className={styles.withdrawDesc}>더 이상 JustInNeed를 사용하지 않으시나요?</div>
        </div>
        <Button variant="secondary" onClick={onWithdraw} className={styles.withdrawBtn}>
          회원 탈퇴
        </Button>
      </div>
    </Card>
  );
}

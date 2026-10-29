"use client";

import { useState } from "react";
import { Icon, Card, PageHeader, Button, Field, FieldMessage, inputClass } from "@/components/ui";
import type { SessionListItem } from "@/lib/api";
import { MOCK_SESSIONS, type MockProfile, type NodeVisibility } from "@/lib/mock/designData";
import { formatDuration, withHash } from "@/lib/format";
import { MAX_HASHTAGS, validateHashtag } from "@/lib/hashtag";
import { ApiError, updateNickname } from "@/lib/api";
import { usePersonal } from "@/lib/app/PersonalContext";
import { useToast } from "@/lib/app/ToastContext";
import { NICKNAME_FORMAT_ERROR, NICKNAME_HINT, NICKNAME_MAX_LENGTH, isValidNickname } from "@/lib/nickname";
import styles from "./Profile.module.css";

/** 저장 시 프로필 화면에 반영할 값 (닉네임은 회원 정보로 따로 저장) */
export type ProfileDraft = Pick<MockProfile, "bio" | "interests" | "visibility" | "pinnedSessionIds">;

export interface ProfileEditProps {
  profile: MockProfile;
  onCancel: () => void;
  onSave: (draft: ProfileDraft) => void;
}

const VISIBILITY_OPTIONS: { v: NodeVisibility; l: string; d: string }[] = [
  { v: "url", l: "원문 URL만 공개", d: "리프 노드 클릭 시 출처 URL로 이동만 허용 (기본값)" },
  { v: "full", l: "내용까지 공개", d: "내용이 리프 노드로 노출됩니다" },
];

export function ProfileEdit({ profile, onCancel, onSave }: ProfileEditProps) {
  const { member, updateMember } = usePersonal();
  const toast = useToast();
  // 닉네임은 목 프로필이 아니라 로그인한 회원 닉네임으로 시작 — 바뀌었으면 저장 때 회원 API 로 변경
  const [name, setName] = useState(member.nickname ?? profile.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState(profile.bio);
  const [interests, setInterests] = useState(profile.interests);
  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<NodeVisibility>(profile.visibility);
  const [pinned, setPinned] = useState<number[]>(profile.pinnedSessionIds);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const nameInvalid = !isValidNickname(name);
  const nameErrorText = nameInvalid ? NICKNAME_FORMAT_ERROR : nameError;

  const togglePin = (id: number) =>
    setPinned((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));

  const endDrag = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const onPinDrop = (i: number) => {
    if (dragIdx !== null && dragIdx !== i) {
      const next = [...pinned];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(i, 0, moved);
      setPinned(next);
    }
    endDrag();
  };

  const unpinned = MOCK_SESSIONS.filter((s) => !pinned.includes(s.id));

  const pinRow = (s: SessionListItem, isPinned: boolean) => (
    <>
      {isPinned ? <span className={styles.pinGrip} aria-hidden /> : <span className={styles.pinGripSpace} />}
      <input
        type="checkbox"
        checked={isPinned}
        onChange={() => togglePin(s.id)}
        style={{ accentColor: "var(--green-500)" }}
      />
      <div className={styles.pinMain}>
        <div className={styles.pinTitle}>{s.title}</div>
        <div className={styles.pinMeta}>{formatDuration(s.startedAt, s.endedAt)} · {s.pageCount}개 URL</div>
      </div>
      {isPinned && <Icon name="pin" size={14} />}
    </>
  );

  const save = async () => {
    if (nameInvalid || saving) return;
    if (name !== (member.nickname ?? "")) {
      setSaving(true);
      try {
        updateMember(await updateNickname(name));
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) setNameError(e.message);
        else toast.error(e instanceof ApiError ? e.message : "저장에 실패했습니다. 다시 시도해 주세요.");
        return;
      } finally {
        setSaving(false);
      }
    }
    onSave({ bio, interests, visibility, pinnedSessionIds: pinned });
  };

  const tagsFull = interests.length >= MAX_HASHTAGS;

  const addTag = () => {
    // interests 는 '#' 포함 표시값, 검증은 raw 기준
    const r = validateHashtag(newTag, interests.map((t) => t.replace(/^#/, "")));
    if (!r.ok) {
      setTagError(r.msg);
      return;
    }
    setInterests([...interests, withHash(r.value)]);
    setNewTag("");
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="프로필 수정"
        right={
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>취소</Button>
            <Button variant="primary" onClick={save} disabled={nameInvalid || saving}>
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        }
      />
      <div className={styles.editBody}>
        <Card className={styles.editCard}>
          <h3 className={styles.editTitle}>기본 정보</h3>
          <Field label="닉네임" hint={NICKNAME_HINT}>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              maxLength={NICKNAME_MAX_LENGTH}
              aria-invalid={nameErrorText ? true : undefined}
              aria-describedby={nameErrorText ? "profile-nickname-error" : undefined}
              className={inputClass}
            />
            {nameErrorText && (
              <FieldMessage tone="error" id="profile-nickname-error">
                {nameErrorText}
              </FieldMessage>
            )}
          </Field>
          <Field label="소개" hint="120자 이내">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} rows={2} className={inputClass} style={{ resize: "vertical" }} />
          </Field>
        </Card>

        <Card className={styles.editCard}>
          <h3 className={styles.editTitle} style={{ marginBottom: 6 }}>관심 해시태그</h3>
          <p className={styles.editDesc}>
            최대 {MAX_HASHTAGS}개까지 등록할 수 있어요. ({interests.length}/{MAX_HASHTAGS})
          </p>
          <div className={styles.interestList}>
            {interests.map((h, i) => (
              <button
                key={h}
                onClick={() => {
                  setInterests(interests.filter((_, j) => j !== i));
                  setTagError(null);
                }}
                className={styles.interestChip}
              >
                {h} <span className={styles.interestX}>×</span>
              </button>
            ))}
          </div>
          <div className={styles.addRow}>
            <input
              value={newTag}
              onChange={(e) => {
                setNewTag(e.target.value);
                setTagError(null);
              }}
              // 한글 조합 중 Enter 는 무시 (마지막 글자 중복 입력 방지)
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && addTag()}
              placeholder="새 해시태그 추가"
              aria-invalid={tagError ? true : undefined}
              aria-describedby={tagError ? "profile-tag-error" : undefined}
              className={inputClass}
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={addTag} disabled={tagsFull} className={styles.addBtn}>
              <Icon name="plus" size={12} /> 추가
            </Button>
          </div>
          {tagError && (
            <FieldMessage tone="error" id="profile-tag-error">
              {tagError}
            </FieldMessage>
          )}
        </Card>

        <Card className={styles.editCard}>
          <h3 className={styles.editTitle}>노드 공개 범위</h3>
          {VISIBILITY_OPTIONS.map((o) => (
            <label key={o.v} className={`${styles.radioRow} ${visibility === o.v ? styles.radioRowOn : ""}`}>
              <input type="radio" checked={visibility === o.v} onChange={() => setVisibility(o.v)} style={{ marginTop: 2, accentColor: "var(--green-500)" }} />
              <div>
                <div className={styles.radioTitle}>{o.l}</div>
                <div className={styles.radioDesc}>{o.d}</div>
              </div>
            </label>
          ))}
        </Card>

        <Card className={styles.editCard}>
          <h3 className={styles.editTitle} style={{ marginBottom: 6 }}>
            핀고정 세션
            {pinned.length > 1 && <span className={styles.dragHint}>드래그로 순서 변경</span>}
          </h3>
          <p className={styles.editDesc}>핀고정한 세션이 이 순서대로 프로필에 공유돼요.</p>
          {pinned.map((id, i) => {
            const s = MOCK_SESSIONS.find((x) => x.id === id);
            if (!s) return null;
            return (
              <label
                key={id}
                draggable
                onDragStart={(e) => {
                  setDragIdx(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragIdx !== null && dragIdx !== i) setDragOverIdx(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onPinDrop(i);
                }}
                onDragEnd={endDrag}
                className={[
                  styles.pinRow,
                  dragIdx === i ? styles.pinRowDragging : "",
                  dragOverIdx === i && dragIdx !== i ? styles.pinRowOver : "",
                ].filter(Boolean).join(" ")}
                title="드래그로 순서 변경"
              >
                {pinRow(s, true)}
              </label>
            );
          })}
          {unpinned.map((s) => (
            <label key={s.id} className={styles.pinRow}>
              {pinRow(s, false)}
            </label>
          ))}
        </Card>
      </div>
    </div>
  );
}

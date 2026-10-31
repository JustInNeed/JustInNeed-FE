"use client";

import { useState } from "react";
import { Icon, Card, PageHeader, Button, Field, FieldMessage, Toggle, InlineState, inputClass } from "@/components/ui";
import type { SessionListItem } from "@/lib/api";
import { formatDuration, withHash } from "@/lib/format";
import { MAX_HASHTAGS, validateHashtag } from "@/lib/hashtag";
import { ApiError, SessionExpiredError, updateMyProfile, updateNickname } from "@/lib/api";
import { usePersonal } from "@/lib/app/PersonalContext";
import { useToast } from "@/lib/app/ToastContext";
import { NICKNAME_FORMAT_ERROR, NICKNAME_HINT, NICKNAME_MAX_LENGTH, isValidNickname } from "@/lib/nickname";
import type { NodeVisibility, ProfileData, ProfileHashtagSetting } from "@/lib/viewTypes";
import { ProfileList } from "./ProfileList";
import { toMyProfileUpdate } from "./toProfilePage";
import { useMySessions } from "./useProfileRemote";
import styles from "./Profile.module.css";

export interface ProfileEditProps {
  profile: ProfileData;
  /** 내 해시태그 전체 */
  hashtags: ProfileHashtagSetting[];
  /** 지금 핀고정한 세션 (profile.pinnedSessionIds). 후보는 여기서 공개 세션만 따로 받는다 */
  pinnedSessions: SessionListItem[];
  onCancel: () => void;
  onSaved: () => void;
}

const VISIBILITY_OPTIONS: { v: NodeVisibility; l: string; d: string }[] = [
  { v: "url", l: "원문 URL만 공개", d: "리프 노드 클릭 시 출처 URL로 이동만 허용 (기본값)" },
  { v: "full", l: "내용까지 공개", d: "내용이 리프 노드로 노출됩니다" },
];

export function ProfileEdit({ profile, hashtags: initialHashtags, pinnedSessions, onCancel, onSaved }: ProfileEditProps) {
  const { member, updateMember } = usePersonal();
  const toast = useToast();
  // 닉네임은 프로필 데이터가 아니라 로그인한 회원 닉네임으로 시작 — 바뀌었으면 저장 때 회원 API 로 변경
  const [name, setName] = useState(member.nickname ?? profile.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState(profile.bio);
  const [interests, setInterests] = useState(profile.interests);
  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<NodeVisibility>(profile.visibility);
  const [hashtags, setHashtags] = useState(initialHashtags);
  const [pinned, setPinned] = useState<number[]>(profile.pinnedSessionIds);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [unpinTarget, setUnpinTarget] = useState<number | null>(null);
  const { items: candidates, section: candidatesSection } = useMySessions(true);
  // 규칙이 생기기 전 닉네임도 안 바꾸면 그대로 둘 수 있다
  const nameInvalid = name !== (member.nickname ?? "") && !isValidNickname(name);
  const nameErrorText = nameInvalid ? NICKNAME_FORMAT_ERROR : nameError;

  // 해제는 확인 후 반영 — 맨 앞 고정만 풀리고 세션은 공개 상태로 남는다
  const togglePin = (id: number) => {
    if (pinned.includes(id)) setUnpinTarget(id);
    else setPinned((ps) => [...ps, id]);
  };
  const confirmUnpin = () => {
    setPinned((ps) => ps.filter((x) => x !== unpinTarget));
    setUnpinTarget(null);
  };

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

  // 고정을 푼 세션이 아직 안 받은 후보 페이지에 있어도 목록에서 사라지지 않게 함께 찾는다
  const sessions = [...pinnedSessions, ...candidates.filter((c) => !pinnedSessions.some((s) => s.id === c.id))];
  const unpinned = sessions.filter((s) => !pinned.includes(s.id));

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
    setSaving(true);
    try {
      // 닉네임이 먼저 — 프로필 저장이 실패해도 저장된 닉네임은 회원 정보에 남아 다시 저장할 때 또 보내지 않는다
      if (name !== (member.nickname ?? "")) updateMember(await updateNickname(name));
      await updateMyProfile(toMyProfileUpdate({ bio, interests, hashtags, visibility, pinnedSessionIds: pinned }));
    } catch (e) {
      if (e instanceof SessionExpiredError) return; // 이미 로그인 화면으로 이동
      if (e instanceof ApiError && e.status === 409) setNameError(e.message);
      else toast.error(e instanceof ApiError ? e.message : "저장에 실패했습니다. 다시 시도해 주세요.");
      return;
    } finally {
      setSaving(false);
    }
    toast.success("프로필을 저장했어요.");
    onSaved();
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
          <h3 className={styles.editTitle} style={{ marginBottom: 6 }}>해시태그 공개 설정</h3>
          <p className={styles.editDesc}>비공개 해시태그와 그 노드는 다른 사용자에게 보이지 않아요.</p>
          {hashtags.map((t) => (
            <div key={t.id} className={styles.tagPublicRow}>
              <Toggle
                label={t.tag}
                desc={`노드 ${t.count}개 · ${t.isPublic ? "공개" : "비공개"}`}
                on={t.isPublic}
                onChange={(v) => setHashtags((ts) => ts.map((x) => (x.id === t.id ? { ...x, isPublic: v } : x)))}
              />
            </div>
          ))}
        </Card>

        <Card className={styles.editCard}>
          <h3 className={styles.editTitle} style={{ marginBottom: 6 }}>
            핀고정 세션
            {pinned.length > 1 && <span className={styles.dragHint}>드래그로 순서 변경</span>}
          </h3>
          <p className={styles.editDesc}>공개 세션 중 고정한 세션이 맨 앞에 보여요.</p>
          <ProfileList
            section={candidatesSection}
            label="세션"
            isEmpty={sessions.length === 0}
            empty={<InlineState kind="empty" title="공개한 세션이 없어요." description="세션 상세에서 공개하면 여기서 고정할 수 있어요." />}
          >
            {pinned.map((id, i) => {
              const s = sessions.find((x) => x.id === id);
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
          </ProfileList>
        </Card>
      </div>

      {unpinTarget !== null && <UnpinConfirmModal onCancel={() => setUnpinTarget(null)} onConfirm={confirmUnpin} />}
    </div>
  );
}

function UnpinConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      className={styles.confirmOverlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="unpin-confirm-title" className={styles.confirmModal}>
        <h2 id="unpin-confirm-title" className={styles.confirmTitle}>
          고정을 해제할까요?
        </h2>
        <p className={styles.confirmBody}>맨 앞 고정만 풀려요. 세션은 공개 상태로 남아요.</p>
        <div className={styles.confirmActions}>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            취소
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            해제
          </Button>
        </div>
      </div>
    </div>
  );
}

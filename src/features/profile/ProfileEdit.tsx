"use client";

import { useState } from "react";
import { Icon, Card, PageHeader, Button, Field, inputClass } from "@/components/ui";
import { MOCK_SESSIONS, type MockProfile } from "@/lib/mock/designData";
import { formatDuration } from "@/lib/format";
import styles from "./Profile.module.css";

export interface ProfileEditProps {
  profile: MockProfile;
  onClose: () => void;
}

type Visibility = "url" | "full";

const VISIBILITY_OPTIONS: { v: Visibility; l: string; d: string }[] = [
  { v: "url", l: "원문 URL만 공개", d: "리프 노드 클릭 시 출처 URL로 이동만 허용 (기본값)" },
  { v: "full", l: "내용까지 공개", d: "내용이 리프 노드로 노출됩니다" },
];

export function ProfileEdit({ profile, onClose }: ProfileEditProps) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [interests, setInterests] = useState(profile.interests);
  const [newTag, setNewTag] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("url");
  const [pinned, setPinned] = useState<number[]>([MOCK_SESSIONS[0].id, MOCK_SESSIONS[2].id]);

  const addTag = () => {
    const raw = newTag.trim();
    if (!raw || interests.length >= 10) return;
    const tag = raw.startsWith("#") ? raw : `#${raw}`;
    if (interests.includes(tag)) return;
    setInterests([...interests, tag]);
    setNewTag("");
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="프로필 수정"
        right={
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>취소</Button>
            <Button variant="primary" onClick={onClose}>저장</Button>
          </div>
        }
      />
      <div className={styles.editBody}>
        <Card className={styles.editCard}>
          <h3 className={styles.editTitle}>기본 정보</h3>
          <Field label="닉네임" hint="영어, 최대 8자">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={8} className={inputClass} />
          </Field>
          <Field label="소개" hint="120자 이내">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} rows={2} className={inputClass} style={{ resize: "vertical" }} />
          </Field>
        </Card>

        <Card className={styles.editCard}>
          <h3 className={styles.editTitle} style={{ marginBottom: 6 }}>관심 해시태그</h3>
          <p className={styles.editDesc}>최대 10개까지 등록할 수 있어요. ({interests.length}/10)</p>
          <div className={styles.interestList}>
            {interests.map((h, i) => (
              <button key={h} onClick={() => setInterests(interests.filter((_, j) => j !== i))} className={styles.interestChip}>
                {h} <span className={styles.interestX}>×</span>
              </button>
            ))}
          </div>
          <div className={styles.addRow}>
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="새 해시태그 추가"
              className={inputClass}
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={addTag}>
              <Icon name="plus" size={12} /> 추가
            </Button>
          </div>
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
          <h3 className={styles.editTitle} style={{ marginBottom: 6 }}>핀고정 세션</h3>
          <p className={styles.editDesc}>순서를 변경하고 프로필에 핀고정합니다.</p>
          {MOCK_SESSIONS.slice(0, 5).map((s) => (
            <label key={s.id} className={styles.pinRow}>
              <input
                type="checkbox"
                checked={pinned.includes(s.id)}
                onChange={() => setPinned((ps) => (ps.includes(s.id) ? ps.filter((x) => x !== s.id) : [...ps, s.id]))}
                style={{ accentColor: "var(--green-500)" }}
              />
              <div className={styles.pinMain}>
                <div className={styles.pinTitle}>{s.title}</div>
                <div className={styles.pinMeta}>{formatDuration(s.startedAt, s.endedAt)} · {s.pageCount}개 URL</div>
              </div>
              {pinned.includes(s.id) && <Icon name="pin" size={14} />}
            </label>
          ))}
        </Card>
      </div>
    </div>
  );
}

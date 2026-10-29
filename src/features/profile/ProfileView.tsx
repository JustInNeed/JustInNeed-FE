"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, InlineState } from "@/components/ui";
import { MindmapCard } from "@/components/mindmap/MindmapCard";
import { SessionCard } from "@/features/sessions";
import type { SessionListItem } from "@/lib/api";
import { usePersonal } from "@/lib/app/PersonalContext";
import { useToast } from "@/lib/app/ToastContext";
import { COMMUNITY_FEED, MOCK_SESSIONS, MY_PROFILE, otherProfile, type MockProfile } from "@/lib/mock/designData";
import { ProfileEdit, type ProfileDraft } from "./ProfileEdit";
import styles from "./Profile.module.css";

export interface ProfileViewProps {
  /** 없으면 내 프로필 */
  handle?: string;
}

export function ProfileView({ handle }: ProfileViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { member } = usePersonal();
  const isMine = !handle;
  // 내 프로필은 수정 화면에서 저장한 값을 들고 있음 (목: 프로필 API 생기면 교체). 닉네임은 회원 정보 기준
  const [myProfile, setMyProfile] = useState<MockProfile>(MY_PROFILE);
  const myName = member.nickname ?? MY_PROFILE.name;
  const profile = isMine ? { ...myProfile, name: myName, handle: `@${myName}` } : otherProfile(handle);

  const [tab, setTab] = useState<"mindmap" | "sessions">("mindmap");
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [exploring, setExploring] = useState<Set<string>>(new Set());

  const saveProfile = (draft: ProfileDraft) => {
    setMyProfile((p) => ({ ...p, ...draft }));
    setEditing(false);
    toast.success("프로필을 저장했어요.");
  };

  if (editing) return <ProfileEdit profile={profile} onCancel={() => setEditing(false)} onSave={saveProfile} />;

  const pinnedSessions = profile.pinnedSessionIds
    .map((id) => MOCK_SESSIONS.find((s) => s.id === id))
    .filter((s): s is SessionListItem => !!s);

  const toggleExplore = (id: string) =>
    setExploring((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.avatar}>{profile.avatar}</div>
          <div className={styles.headMain}>
            <h1 className={styles.name}>{profile.name}</h1>
            <div className={styles.handle}>{profile.handle}</div>
          </div>
          <div className={styles.actions}>
            {isMine ? (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Icon name="edit" size={14} /> 프로필 수정
                </Button>
                <Button variant="secondary" onClick={() => router.push("/settings")} aria-label="설정">
                  <Icon name="settings" size={14} />
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" active={liked} onClick={() => setLiked((v) => !v)}>
                  <Icon name="heart" size={14} stroke={liked ? 0 : 1.7} fill={liked ? "currentColor" : undefined} /> 좋아요
                </Button>
                <Button variant={following ? "secondary" : "primary"} onClick={() => setFollowing((v) => !v)}>
                  {following ? "팔로잉" : "팔로우"}
                </Button>
              </>
            )}
          </div>
        </div>

        <p className={styles.bio}>{profile.bio}</p>

        <div className={styles.stats}>
          <Stat n={profile.nodes} l="노드" />
          <Stat n={pinnedSessions.length} l="공유 세션" />
          <Stat n={profile.likes} l="좋아요" />
          {!isMine && <Stat n={12} l="나도 탐색중" accent />}
        </div>

        <div className={styles.tagRow}>
          {profile.topTags.map((t) =>
            t.isPublic ? (
              <span key={t.tag} className={styles.topTag}>
                {t.tag}
                <span className={styles.countBadge}>{t.count}</span>
              </span>
            ) : (
              // 비공개 태그는 내 프로필에서만 흐리게 보임
              <span key={t.tag} className={`${styles.topTag} ${styles.topTagPrivate}`} title="비공개 · 나만 보여요">
                <Icon name="lock" size={11} stroke={2} />
                {t.tag}
                <span className={styles.countBadge}>{t.count}</span>
              </span>
            ),
          )}
          {profile.interests.map((h) => (
            <span key={h} className={styles.interest}>{h}</span>
          ))}
        </div>

        <div className={styles.tabs}>
          <button onClick={() => setTab("mindmap")} className={`${styles.tab} ${tab === "mindmap" ? styles.tabOn : ""}`}>마인드맵</button>
          <button onClick={() => setTab("sessions")} className={`${styles.tab} ${tab === "sessions" ? styles.tabOn : ""}`}>세션 ({pinnedSessions.length})</button>
        </div>

        {tab === "mindmap" && (
          <div className={styles.mapGrid}>
            {COMMUNITY_FEED.slice(0, isMine ? 4 : 6).map((p) => (
              <MindmapCard
                key={p.id}
                seed={p.id}
                nodes={p.nodes}
                height={220}
                title={p.title}
                tags={p.hashtags.slice(0, 2)}
                topLeft={isMine ? <span title="핀고정됨"><Icon name="pin" size={11} stroke={2} /></span> : undefined}
                topRight={`노드 ${p.nodes}`}
                footer={
                  <>
                    <span>♡ {p.likes}</span>
                    <span>◇ {p.bookmarks}</span>
                    {!isMine && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExplore(p.id);
                        }}
                        className={`${styles.exploreBtn} ${exploring.has(p.id) ? styles.exploreBtnOn : ""}`}
                      >
                        {exploring.has(p.id) ? "✓ 탐색중" : "+ 나도 탐색"}
                      </button>
                    )}
                  </>
                }
              />
            ))}
          </div>
        )}

        {tab === "sessions" &&
          (pinnedSessions.length === 0 ? (
            <div className={styles.sessionEmpty}>
              <InlineState
                kind="empty"
                title="공유한 세션이 없어요."
                description={isMine ? "프로필 수정에서 세션을 핀고정하면 여기에 보여요." : undefined}
              />
            </div>
          ) : (
            <div className={styles.sessionGrid}>
              {pinnedSessions.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function Stat({ n, l, accent }: { n: number; l: string; accent?: boolean }) {
  return (
    <div>
      <div className={styles.statN} style={{ color: accent ? "var(--green-700)" : "inherit" }}>{n}</div>
      <div className={styles.statL}>{l}</div>
    </div>
  );
}

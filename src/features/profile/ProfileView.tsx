"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button } from "@/components/ui";
import { MindmapCard } from "@/components/mindmap/MindmapCard";
import { SessionCard } from "@/features/sessions";
import { COMMUNITY_FEED, MOCK_SESSIONS, MY_PROFILE, otherProfile } from "@/lib/mock/designData";
import { ProfileEdit } from "./ProfileEdit";
import styles from "./Profile.module.css";

export interface ProfileViewProps {
  /** 없으면 내 프로필 */
  handle?: string;
}

export function ProfileView({ handle }: ProfileViewProps) {
  const router = useRouter();
  const isMine = !handle;
  const profile = isMine ? MY_PROFILE : otherProfile(handle);

  const [tab, setTab] = useState<"mindmap" | "sessions">("mindmap");
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [exploring, setExploring] = useState<Set<string>>(new Set());

  if (editing) return <ProfileEdit profile={profile} onClose={() => setEditing(false)} />;

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
          <Stat n={profile.sessions} l="공유 세션" />
          <Stat n={profile.likes} l="좋아요" />
          {!isMine && <Stat n={12} l="나도 탐색중" accent />}
        </div>

        <div className={styles.tagRow}>
          {profile.topTags.map((t) => (
            <span key={t.tag} className={styles.topTag}>
              {t.tag}
              <span className={styles.countBadge}>{t.count}</span>
            </span>
          ))}
          {profile.interests.map((h) => (
            <span key={h} className={styles.interest}>{h}</span>
          ))}
        </div>

        <div className={styles.tabs}>
          <button onClick={() => setTab("mindmap")} className={`${styles.tab} ${tab === "mindmap" ? styles.tabOn : ""}`}>마인드맵</button>
          <button onClick={() => setTab("sessions")} className={`${styles.tab} ${tab === "sessions" ? styles.tabOn : ""}`}>세션 ({profile.sessions})</button>
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

        {tab === "sessions" && (
          <div className={styles.sessionGrid}>
            {MOCK_SESSIONS.slice(0, isMine ? 6 : 4).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
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

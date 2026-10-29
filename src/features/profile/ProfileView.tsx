"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, InlineState } from "@/components/ui";
import { MindmapCard } from "@/components/mindmap/MindmapCard";
import { MindmapDetailModal } from "@/components/mindmap/MindmapDetailModal";
import { MindmapFullView } from "@/components/mindmap/MindmapFullView";
import { SessionCard } from "@/features/sessions";
import type { SessionListItem } from "@/lib/api";
import { usePersonal } from "@/lib/app/PersonalContext";
import { useToast } from "@/lib/app/ToastContext";
import { withHash } from "@/lib/format";
import {
  COMMUNITY_FEED,
  MINDMAP_EDGES,
  MINDMAP_NODES,
  MINDMAP_NODE_URLS,
  MOCK_SESSIONS,
  MY_PROFILE,
  otherProfile,
  relatedSessionsFor,
  type CommunityPost,
  type MockProfile,
} from "@/lib/mock/designData";
import { ProfileEdit, type ProfileDraft } from "./ProfileEdit";
import styles from "./Profile.module.css";

// 다른 사용자 해시태그 북마크 저장 방식
const BOOKMARK_OPTIONS = [
  { l: "해시태그 묶음으로 저장", d: "선택한 태그를 한 묶음으로 모아요" },
  { l: "미니 마인드맵으로 저장", d: "노드 간 관계까지 함께 담아요" },
];

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
  const [selected, setSelected] = useState<string[]>([]);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const bookmarkRef = useRef<HTMLDivElement>(null);
  // 마인드맵 카드 → 상세 팝업 → 크게 보기 (리프 노드는 원문 URL로). 크게 보기를 닫으면 팝업으로 돌아간다
  const [detail, setDetail] = useState<CommunityPost | null>(null);
  const [fullView, setFullView] = useState(false);
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeFullView = useCallback(() => setFullView(false), []);

  useEffect(() => {
    if (!bookmarkOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (bookmarkRef.current && !bookmarkRef.current.contains(e.target as Node)) setBookmarkOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBookmarkOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [bookmarkOpen]);

  const saveProfile = (draft: ProfileDraft) => {
    setMyProfile((p) => ({ ...p, ...draft }));
    setEditing(false);
    toast.success("프로필을 저장했어요.");
  };

  if (editing) return <ProfileEdit profile={profile} onCancel={() => setEditing(false)} onSave={saveProfile} />;

  // 다른 사용자 프로필에선 비공개 해시태그와 그 노드를 빼고 보여줌
  const hiddenTags = isMine ? [] : profile.topTags.filter((t) => !t.isPublic);
  const hidden = new Set(hiddenTags.map((t) => t.tag));
  const visibleTags = (tags: string[]) => tags.filter((t) => !hidden.has(withHash(t)));
  const shownTopTags = profile.topTags.filter((t) => !hidden.has(t.tag));
  const nodeCount = profile.nodes - hiddenTags.reduce((n, t) => n + t.count, 0);

  const pinnedSessions = profile.pinnedSessionIds
    .map((id) => MOCK_SESSIONS.find((s) => s.id === id))
    .filter((s): s is SessionListItem => !!s)
    .map((s) => ({ ...s, tags: visibleTags(s.tags) }));

  const toggleSelect = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter((x) => x !== tag) : [...selected, tag];
    setSelected(next);
    if (next.length === 0) setBookmarkOpen(false);
  };
  const clearSelection = () => {
    setSelected([]);
    setBookmarkOpen(false);
  };
  const saveBookmark = () => {
    toast.success("북마크에 저장했어요.");
    clearSelection();
  };

  // 다른 사용자 프로필의 태그는 골라서 북마크할 수 있음
  const tagChip = (key: string, tag: string, className: string, body: ReactNode, title?: string) => {
    if (isMine) {
      return (
        <span key={key} className={className} title={title}>
          {body}
        </span>
      );
    }
    const on = selected.includes(tag);
    return (
      <button
        key={key}
        type="button"
        aria-pressed={on}
        onClick={() => toggleSelect(tag)}
        className={`${className} ${styles.tagSelectable} ${on ? styles.tagOn : ""}`}
        title="선택해서 북마크"
      >
        {on && <Icon name="check" size={11} stroke={2.4} />}
        {body}
      </button>
    );
  };

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
          <Stat n={nodeCount} l="노드" />
          <Stat n={pinnedSessions.length} l="공유 세션" />
          <Stat n={profile.likes + (liked ? 1 : 0)} l="좋아요" />
          {!isMine && <Stat n={12} l="나도 탐색중" accent />}
        </div>

        <div className={styles.tagRow}>
          {shownTopTags.map((t) =>
            // 비공개 태그는 내 프로필에서만 흐리게 보임
            tagChip(
              `top-${t.tag}`,
              t.tag,
              t.isPublic ? styles.topTag : `${styles.topTag} ${styles.topTagPrivate}`,
              <>
                {!t.isPublic && <Icon name="lock" size={11} stroke={2} />}
                {t.tag}
                <span className={styles.countBadge}>{t.count}</span>
              </>,
              t.isPublic ? undefined : "비공개 · 나만 보여요",
            ),
          )}
          {profile.interests.map((h) => tagChip(`interest-${h}`, h, styles.interest, h))}
        </div>

        {selected.length > 0 && (
          <div className={styles.selectBar}>
            <span className={styles.selectCount}>{selected.length}개 선택</span>
            <div ref={bookmarkRef} className={styles.bookmarkWrap}>
              <Button variant="primary" onClick={() => setBookmarkOpen((v) => !v)} aria-haspopup="menu" aria-expanded={bookmarkOpen}>
                <Icon name="bookmark" size={13} /> 북마크
              </Button>
              {bookmarkOpen && (
                <div role="menu" className={styles.bookmarkPop}>
                  {BOOKMARK_OPTIONS.map((o) => (
                    <button key={o.l} type="button" role="menuitem" onClick={saveBookmark} className={styles.bookmarkOpt}>
                      <span className={styles.bookmarkOptTitle}>{o.l}</span>
                      <span className={styles.bookmarkOptDesc}>{o.d}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" onClick={clearSelection} aria-label="선택 해제">
              <Icon name="x" size={14} />
            </Button>
          </div>
        )}

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
                tags={visibleTags(p.hashtags).slice(0, 2)}
                topLeft={isMine ? <span title="핀고정됨"><Icon name="pin" size={11} stroke={2} /></span> : undefined}
                topRight={`노드 ${p.nodes}`}
                onClick={() =>
                  // 목: 피드 게시물을 빌려 쓰므로 작성자 · 해시태그는 이 프로필 기준으로 바꿔 보여줌
                  setDetail({
                    ...p,
                    user: { name: profile.name, avatar: profile.avatar, handle: profile.handle },
                    hashtags: visibleTags(p.hashtags),
                  })
                }
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
                <SessionCard key={s.id} session={s} onClick={() => router.push(`/sessions/${s.id}`)} />
              ))}
            </div>
          ))}
      </div>

      {detail && !fullView && (
        <MindmapDetailModal
          post={detail}
          sessions={relatedSessionsFor(detail)}
          onClose={closeDetail}
          // 이미 이 사람 프로필이라 작성자 이름을 누르면 팝업만 닫힌다
          onOpenProfile={() => {}}
          actions={
            <Button variant="primary" onClick={() => setFullView(true)}>
              <Icon name="network" size={13} />
              마인드맵 크게 보기
            </Button>
          }
        />
      )}
      {detail && fullView && (
        <MindmapFullView
          title={`${profile.name}님의 전체 마인드맵`}
          mindmap={{ nodes: MINDMAP_NODES, edges: MINDMAP_EDGES, nodeUrls: MINDMAP_NODE_URLS }}
          onClose={closeFullView}
        />
      )}
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

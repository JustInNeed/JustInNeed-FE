"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, InlineState } from "@/components/ui";
import { MindmapCard } from "@/components/mindmap/MindmapCard";
import { MindmapDetailModal } from "@/components/mindmap/MindmapDetailModal";
import { MindmapFullView } from "@/components/mindmap/MindmapFullView";
import { SessionCard } from "@/features/sessions";
import {
  ApiError,
  SessionExpiredError,
  getProfileMindmap,
  setCardBookmark,
  setCardExploring,
  setCardLike,
  setProfileFollow,
  updateProfileLike,
  type SaveBookmarkRequest,
  type SessionListItem,
} from "@/lib/api";
import { saveBookmark } from "@/lib/api/bookmarks";
import { usePersonal } from "@/lib/app/PersonalContext";
import { useToast } from "@/lib/app/ToastContext";
import { withHash } from "@/lib/format";
import type { ProfileMindmap, ProfilePageData } from "@/lib/viewTypes";
import { ProfileEdit, type ProfileDraft } from "./ProfileEdit";
import { titleFromTags, toHashtagIds } from "./toProfilePage";
import { useCardSessions, useOwnerMindmap } from "./useProfileRemote";
import styles from "./Profile.module.css";

// 다른 사용자 해시태그 북마크 저장 방식
const BOOKMARK_OPTIONS = [
  { l: "해시태그 묶음으로 저장", d: "선택한 태그를 한 묶음으로 모아요", saveType: "HASHTAG_BUNDLE" },
  { l: "미니 마인드맵으로 저장", d: "노드 간 관계까지 함께 담아요", saveType: "MINI_MINDMAP" },
] as const;
const BUNDLE_NAME_MAX_LENGTH = 30;
const BUNDLE_FORM_BUTTON = { padding: "6px 12px" };

// 내 프로필 데이터가 없을 때 — 이름 · 핸들은 로그인 회원 닉네임으로 채우고 나머지는 빈 상태로 보여준다
const EMPTY_PAGE: ProfilePageData = {
  profile: {
    name: "",
    handle: "",
    avatar: "🌱",
    bio: "",
    nodes: 0,
    likes: 0,
    interests: [],
    topTags: [],
    visibility: "url",
    pinnedSessionIds: [],
  },
  mindmaps: [],
  fullMindmap: { nodes: [], edges: [], nodeUrls: {} },
  sessions: [],
};

/** 다른 사용자 마인드맵 탭 — 프로필과 따로 받아 실패해도 프로필은 보인다 */
export interface ProfileMindmapsSection {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  hasNext: boolean;
  onLoadMore: () => void;
}

export interface ProfileViewProps {
  /** 다른 사용자 id. 없으면 내 프로필 */
  userId?: number;
  /** 내 프로필 API 가 생기기 전까지는 null — 닉네임만 채운 빈 프로필 */
  data: ProfilePageData | null;
  loading?: boolean;
  /** 불러오기 실패 메시지 */
  error?: string | null;
  onRetry?: () => void;
  /** 없거나 탈퇴한 사용자 · 잘못된 주소 */
  notFound?: boolean;
  mindmapsSection?: ProfileMindmapsSection;
}

export function ProfileView({ userId, data, loading = false, error = null, onRetry, notFound = false, mindmapsSection }: ProfileViewProps) {
  const router = useRouter();
  if (notFound) {
    return (
      <ProfileState>
        <div className={styles.notFound}>
          <InlineState kind="empty" title="프로필을 찾을 수 없어요" description="탈퇴했거나 주소가 잘못됐어요." />
          <Button variant="secondary" onClick={() => router.push("/community")}>
            커뮤니티로
          </Button>
        </div>
      </ProfileState>
    );
  }
  if (loading) return <ProfileState><div className={styles.state}>불러오는 중…</div></ProfileState>;
  if (error) {
    return (
      <ProfileState>
        <InlineState kind="error" title="프로필을 불러오지 못했어요." description={error} onRetry={onRetry} />
      </ProfileState>
    );
  }
  if (userId === undefined) return <ProfileScreen data={data ?? EMPTY_PAGE} />;
  if (!data) return null;
  return <ProfileScreen userId={userId} data={data} mindmapsSection={mindmapsSection} />;
}

function ProfileState({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}

function ProfileScreen({
  userId,
  data,
  mindmapsSection,
}: {
  userId?: number;
  data: ProfilePageData;
  mindmapsSection?: ProfileMindmapsSection;
}) {
  const router = useRouter();
  const toast = useToast();
  const { member } = usePersonal();
  const isMine = userId === undefined;
  // 내 프로필은 수정 화면에서 저장한 값을 덮어 보여줌 (프로필 저장 API 생기면 교체). 닉네임은 회원 정보 기준
  const [saved, setSaved] = useState<ProfileDraft | null>(null);
  const myName = member.nickname ?? data.profile.name;
  const profile = isMine ? { ...data.profile, ...saved, name: myName, handle: `@${myName}` } : data.profile;

  const [tab, setTab] = useState<"mindmap" | "sessions">("mindmap");
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(data.following ?? false);
  const [like, setLike] = useState({ liked: data.likedByMe ?? false, count: profile.likes });
  // 카드별 내 반응 · 숫자 — 받은 카드 위에 덮어 보여준다
  const [cardPatches, setCardPatches] = useState<Record<string, Partial<ProfileMindmap>>>({});
  const pending = useRef(new Set<string>());
  const [selected, setSelected] = useState<string[]>([]);
  // 북마크 팝오버 — 저장 방식 메뉴, 또는 묶음 이름 입력
  const [bookmarkPop, setBookmarkPop] = useState<"menu" | "name" | null>(null);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const bookmarkRef = useRef<HTMLDivElement>(null);
  // 마인드맵 카드 → 상세 팝업 → 크게 보기 (URL 이 있는 노드는 원문으로). 크게 보기를 닫으면 팝업으로 돌아간다
  const [detailId, setDetailId] = useState<string | null>(null);
  const [fullView, setFullView] = useState(false);
  const closeDetail = useCallback(() => {
    setDetailId(null);
    setFullView(false);
  }, []);
  const closeFullView = useCallback(() => setFullView(false), []);
  // 다른 사용자의 관련 세션 · 전체 마인드맵은 처음 열 때 받는다
  const cardSessions = useCardSessions(detailId, !isMine);
  const ownerMindmap = useOwnerMindmap(userId);
  const fullMindmap = isMine ? data.fullMindmap : ownerMindmap.mindmap;
  const openFullView = () => {
    setFullView(true);
    ownerMindmap.open();
  };

  const bookmarkOpen = bookmarkPop !== null;
  useEffect(() => {
    // 저장 중에는 닫지 않는다 — 닫아도 요청은 취소되지 않는다
    if (!bookmarkOpen || savingBookmark) return;
    const onDoc = (e: MouseEvent) => {
      if (bookmarkRef.current && !bookmarkRef.current.contains(e.target as Node)) setBookmarkPop(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBookmarkPop(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [bookmarkOpen, savingBookmark]);

  const saveProfile = (draft: ProfileDraft) => {
    setSaved(draft);
    setEditing(false);
    toast.success("프로필을 저장했어요.");
  };

  if (editing) {
    return <ProfileEdit profile={profile} sessions={data.sessions} onCancel={() => setEditing(false)} onSave={saveProfile} />;
  }

  // 다른 사용자 프로필에선 비공개 해시태그와 그 노드를 빼고 보여줌
  const hiddenTags = isMine ? [] : profile.topTags.filter((t) => !t.isPublic);
  const hidden = new Set(hiddenTags.map((t) => t.tag));
  const visibleTags = (tags: string[]) => tags.filter((t) => !hidden.has(withHash(t)));
  const withVisibleTags = (s: SessionListItem) => ({ ...s, tags: visibleTags(s.tags) });
  const shownTopTags = profile.topTags.filter((t) => !hidden.has(t.tag));
  const nodeCount = profile.nodes - hiddenTags.reduce((n, t) => n + t.count, 0);
  const owner = { name: profile.name, avatar: profile.avatar, handle: profile.handle };
  const mindmaps = data.mindmaps.map((p) => ({ ...p, ...cardPatches[p.id] }));
  const detail = mindmaps.find((p) => p.id === detailId);
  // 프로필의 나도 탐색중은 카드 숫자의 합이라 카드에서 바뀐 만큼 함께 움직인다
  const exploringShift = mindmaps.reduce((sum, p, i) => sum + p.exploring - data.mindmaps[i].exploring, 0);

  // URL 만 공개한 카드 · 세션은 제목이 없어 제목 자리에 해시태그를 보여주고, 태그 줄엔 같은 태그를 또 찍지 않는다
  const withTitle = (s: SessionListItem) => (s.title ? s : { ...s, title: titleFromTags(s.tags), tags: [] });

  const pinnedSessions = profile.pinnedSessionIds
    .map((id) => data.sessions.find((s) => s.id === id))
    .filter((s): s is SessionListItem => !!s)
    .map(withVisibleTags)
    .map(withTitle);

  const toggleSelect = (tag: string) => {
    if (savingBookmark) return; // 보내는 중인 선택이 저장 뒤 풀리므로 바꾸지 않는다
    const next = selected.includes(tag) ? selected.filter((x) => x !== tag) : [...selected, tag];
    setSelected(next);
    if (next.length === 0) setBookmarkPop(null);
  };
  const clearSelection = () => {
    setSelected([]);
    setBookmarkPop(null);
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

  /** 같은 대상의 요청이 가는 중이면 무시한다 — 응답이 뒤바뀌면 되돌릴 값이 꼬인다 */
  const once = async (key: string, run: () => Promise<void>) => {
    if (pending.current.has(key)) return;
    pending.current.add(key);
    try {
      await run();
    } finally {
      pending.current.delete(key);
    }
  };
  const notifyFailure = (e: unknown, fallback: string) => {
    if (e instanceof SessionExpiredError) return; // 이미 로그인 화면으로 이동
    toast.error(e instanceof ApiError ? e.message : fallback);
  };

  // 프로필 응답엔 관심 해시태그의 id 가 없어, 저장할 때 전체 마인드맵의 해시태그에서 찾는다
  const submitBookmark = (saveType: SaveBookmarkRequest["saveType"], name = "") =>
    once("save-bookmark", async () => {
      setSavingBookmark(true);
      try {
        const { hashtags } = await getProfileMindmap(userId!);
        const { ids, missing } = toHashtagIds(selected, hashtags);
        if (missing.length > 0) {
          toast.error(`${missing.join(" ")} 태그는 저장할 수 없어요. 선택을 빼고 다시 저장해 주세요.`);
          return;
        }
        await saveBookmark({
          targetType: "HASHTAG",
          targetIds: ids,
          saveType,
          sourceMindmapId: userId!,
          name: name.trim() || undefined,
        });
        toast.success("북마크에 저장했어요.");
        clearSelection();
      } catch (e) {
        notifyFailure(e, "북마크에 저장하지 못했어요. 다시 시도해 주세요.");
      } finally {
        setSavingBookmark(false);
      }
    });

  // 누르면 바로 바꾸고, 응답 값으로 맞추고, 실패하면 되돌린다
  const toggleLike = () =>
    once("like", async () => {
      const liked = !like.liked;
      setLike({ liked, count: like.count + (liked ? 1 : -1) });
      try {
        const res = await updateProfileLike(userId!, liked);
        setLike({ liked: res.liked, count: res.likeCount });
      } catch (e) {
        setLike(like);
        notifyFailure(e, "좋아요를 바꾸지 못했어요. 다시 시도해 주세요.");
      }
    });
  const toggleFollow = () =>
    once("follow", async () => {
      setFollowing(!following);
      try {
        setFollowing((await setProfileFollow(userId!, !following)).following);
      } catch (e) {
        setFollowing(following);
        notifyFailure(e, "팔로우를 바꾸지 못했어요. 다시 시도해 주세요.");
      }
    });

  const patchCard = (id: string, patch: Partial<ProfileMindmap>) =>
    setCardPatches((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));
  const reactToCard = (
    p: ProfileMindmap,
    kind: string,
    next: Partial<ProfileMindmap>,
    before: Partial<ProfileMindmap>,
    send: () => Promise<Partial<ProfileMindmap>>,
    failure: string,
  ) =>
    once(`${kind}-${p.id}`, async () => {
      patchCard(p.id, next);
      try {
        patchCard(p.id, await send());
      } catch (e) {
        patchCard(p.id, before);
        notifyFailure(e, failure);
      }
    });

  const toggleCardLike = (p: ProfileMindmap) => {
    const liked = !p.likedByMe;
    return reactToCard(
      p,
      "like",
      { likedByMe: liked, likes: p.likes + (liked ? 1 : -1) },
      { likedByMe: p.likedByMe, likes: p.likes },
      async () => {
        const res = await setCardLike(Number(p.id), liked);
        return { likedByMe: res.likedByMe, likes: res.likeCount };
      },
      "좋아요를 바꾸지 못했어요. 다시 시도해 주세요.",
    );
  };
  const toggleCardBookmark = (p: ProfileMindmap) => {
    const bookmarked = p.bookmarkId == null;
    return reactToCard(
      p,
      "bookmark",
      // 진짜 id 는 응답으로 받는다. 그전까지는 저장됨 표시용 값
      { bookmarkId: bookmarked ? 0 : null, bookmarks: p.bookmarks + (bookmarked ? 1 : -1) },
      { bookmarkId: p.bookmarkId, bookmarks: p.bookmarks },
      async () => {
        const res = await setCardBookmark(Number(p.id), bookmarked);
        return { bookmarkId: res.bookmarkId, bookmarks: res.bookmarkCount };
      },
      "북마크를 바꾸지 못했어요. 다시 시도해 주세요.",
    );
  };
  const toggleCardExploring = (p: ProfileMindmap) => {
    const exploring = !p.exploringByMe;
    return reactToCard(
      p,
      "exploring",
      { exploringByMe: exploring, exploring: p.exploring + (exploring ? 1 : -1) },
      { exploringByMe: p.exploringByMe, exploring: p.exploring },
      async () => {
        const res = await setCardExploring(Number(p.id), exploring);
        return { exploringByMe: res.exploringByMe, exploring: res.exploringCount };
      },
      "나도 탐색을 바꾸지 못했어요. 다시 시도해 주세요.",
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.avatar}>{profile.avatar}</div>
          <div className={styles.headMain}>
            <h1 className={styles.name}>{profile.name}</h1>
            {profile.handle && <div className={styles.handle}>{profile.handle}</div>}
          </div>
          <div className={styles.actions}>
            {isMine ? (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Icon name="edit" size={14} /> 프로필 수정
              </Button>
            ) : (
              <>
                <Button variant="secondary" active={like.liked} onClick={toggleLike}>
                  <Icon name="heart" size={14} stroke={like.liked ? 0 : 1.7} fill={like.liked ? "currentColor" : undefined} /> 좋아요
                </Button>
                <Button variant={following ? "secondary" : "primary"} onClick={toggleFollow}>
                  {following ? "팔로잉" : "팔로우"}
                </Button>
              </>
            )}
          </div>
        </div>

        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        <div className={styles.stats}>
          <Stat n={nodeCount} l="노드" />
          <Stat n={pinnedSessions.length} l="공유 세션" />
          <Stat n={like.count} l="좋아요" />
          {!isMine && <Stat n={(data.exploringCount ?? 0) + exploringShift} l="나도 탐색중" accent />}
        </div>

        {(shownTopTags.length > 0 || profile.interests.length > 0) && (
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
        )}

        {selected.length > 0 && (
          <div className={styles.selectBar}>
            <span className={styles.selectCount}>{selected.length}개 선택</span>
            <div ref={bookmarkRef} className={styles.bookmarkWrap}>
              <Button
                variant="primary"
                onClick={() => setBookmarkPop((v) => (v ? null : "menu"))}
                disabled={savingBookmark}
                aria-haspopup="menu"
                aria-expanded={bookmarkOpen}
              >
                <Icon name="bookmark" size={13} /> 북마크
              </Button>
              {bookmarkPop === "menu" && (
                <div role="menu" className={styles.bookmarkPop}>
                  {BOOKMARK_OPTIONS.map((o) => (
                    <button
                      key={o.l}
                      type="button"
                      role="menuitem"
                      disabled={savingBookmark}
                      onClick={() => (o.saveType === "HASHTAG_BUNDLE" ? setBookmarkPop("name") : submitBookmark(o.saveType))}
                      className={styles.bookmarkOpt}
                    >
                      <span className={styles.bookmarkOptTitle}>{o.l}</span>
                      <span className={styles.bookmarkOptDesc}>{o.d}</span>
                    </button>
                  ))}
                </div>
              )}
              {bookmarkPop === "name" && (
                <BundleNameForm
                  saving={savingBookmark}
                  onSave={(name) => submitBookmark("HASHTAG_BUNDLE", name)}
                  onCancel={() => setBookmarkPop(null)}
                />
              )}
            </div>
            <Button variant="ghost" onClick={clearSelection} disabled={savingBookmark} aria-label="선택 해제">
              <Icon name="x" size={14} />
            </Button>
          </div>
        )}

        <div className={styles.tabs}>
          <button onClick={() => setTab("mindmap")} className={`${styles.tab} ${tab === "mindmap" ? styles.tabOn : ""}`}>마인드맵</button>
          <button onClick={() => setTab("sessions")} className={`${styles.tab} ${tab === "sessions" ? styles.tabOn : ""}`}>세션 ({pinnedSessions.length})</button>
        </div>

        {tab === "mindmap" &&
          (mindmaps.length === 0 ? (
            <div className={styles.sessionEmpty}>
              {mindmapsSection?.error ? (
                <InlineState kind="error" title="마인드맵을 불러오지 못했어요." description={mindmapsSection.error} onRetry={mindmapsSection.onRetry} />
              ) : mindmapsSection?.loading ? (
                <div className={styles.state}>불러오는 중…</div>
              ) : (
                <InlineState kind="empty" title="공유한 마인드맵이 없어요." />
              )}
            </div>
          ) : (
            <>
              <div className={styles.mapGrid}>
                {mindmaps.map((p) => (
                  <MindmapCard
                    key={p.id}
                    seed={p.id}
                    nodes={p.nodes}
                    height={220}
                    title={p.title || titleFromTags(visibleTags(p.hashtags))}
                    tags={p.title ? visibleTags(p.hashtags).slice(0, 2) : undefined}
                    topLeft={isMine ? <span title="핀고정됨"><Icon name="pin" size={11} stroke={2} /></span> : undefined}
                    topRight={`노드 ${p.nodes}`}
                    onClick={() => setDetailId(p.id)}
                    footer={
                      <>
                        {/* 내 카드엔 좋아요를 누를 수 없다 (서버가 400) */}
                        {isMine || p.ownerId === member.id ? (
                          <span>♡ {p.likes}</span>
                        ) : (
                          <CardAction label="마인드맵 좋아요" on={!!p.likedByMe} onClick={() => toggleCardLike(p)}>
                            {p.likedByMe ? "♥" : "♡"} {p.likes}
                          </CardAction>
                        )}
                        {isMine ? (
                          <span>◇ {p.bookmarks}</span>
                        ) : (
                          <CardAction label="마인드맵 북마크" on={p.bookmarkId != null} onClick={() => toggleCardBookmark(p)}>
                            {p.bookmarkId != null ? "◆" : "◇"} {p.bookmarks}
                          </CardAction>
                        )}
                        {!isMine && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleCardExploring(p);
                            }}
                            className={`${styles.exploreBtn} ${p.exploringByMe ? styles.exploreBtnOn : ""}`}
                          >
                            {p.exploringByMe ? "✓ 탐색중" : "+ 나도 탐색"}
                          </button>
                        )}
                      </>
                    }
                  />
                ))}
              </div>
              {mindmapsSection && (
                <div className={styles.mapMore}>
                  {mindmapsSection.error ? (
                    <InlineState kind="error" title="마인드맵을 더 불러오지 못했어요." description={mindmapsSection.error} onRetry={mindmapsSection.onRetry} />
                  ) : mindmapsSection.loading ? (
                    <span className={styles.mapMoreLoading}>불러오는 중…</span>
                  ) : (
                    mindmapsSection.hasNext && (
                      <Button variant="secondary" onClick={mindmapsSection.onLoadMore}>더 보기</Button>
                    )
                  )}
                </div>
              )}
            </>
          ))}

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

      {detail && !(fullView && fullMindmap) && (
        <MindmapDetailModal
          onSessionClick={(id) => router.push(`/sessions/${id}`)}
          // 작성자는 이 프로필 주인, 해시태그 · 관련 세션 태그는 비공개를 뺀 값
          post={{
            ...detail,
            user: owner,
            title: detail.title || titleFromTags(visibleTags(detail.hashtags)),
            hashtags: detail.title ? visibleTags(detail.hashtags) : [],
          }}
          sessions={(isMine ? detail.sessions : (cardSessions.sessions ?? [])).map(withVisibleTags)}
          sessionsStatus={
            isMine || cardSessions.sessions ? undefined : cardSessions.error ? (
              <InlineState kind="error" title="관련 세션을 불러오지 못했어요." description={cardSessions.error} onRetry={cardSessions.retry} />
            ) : (
              <div className={styles.stateInline}>불러오는 중…</div>
            )
          }
          onClose={closeDetail}
          // 이미 이 사람 프로필이라 작성자 이름을 누르면 팝업만 닫힌다
          onOpenProfile={() => {}}
          actions={
            !isMine && fullView && ownerMindmap.error ? (
              <InlineState kind="error" title="전체 마인드맵을 불러오지 못했어요." description={ownerMindmap.error} onRetry={ownerMindmap.retry} />
            ) : (
              <Button variant="primary" disabled={fullView} onClick={openFullView}>
                <Icon name="network" size={13} />
                {fullView ? "불러오는 중…" : "마인드맵 크게 보기"}
              </Button>
            )
          }
        />
      )}
      {detail && fullView && fullMindmap && (
        <MindmapFullView title={`${profile.name}님의 전체 마인드맵`} mindmap={fullMindmap} onClose={closeFullView} />
      )}
    </div>
  );
}

/** 해시태그 묶음 이름 입력. 비워 두면 이름 없이 저장한다. Esc · 바깥 누르기는 팝오버 쪽에서 닫는다 */
function BundleNameForm({ saving, onSave, onCancel }: { saving: boolean; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  return (
    <div role="group" aria-label="묶음 이름 입력" className={`${styles.bookmarkPop} ${styles.bookmarkForm}`}>
      <input
        autoFocus
        aria-label="묶음 이름"
        placeholder="묶음 이름 (선택)"
        value={name}
        maxLength={BUNDLE_NAME_MAX_LENGTH}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) onSave(name);
        }}
        className={styles.bookmarkInput}
      />
      <span className={styles.bookmarkOptDesc}>비워 두면 태그로 표시돼요</span>
      <div className={styles.bookmarkFormActions}>
        <Button variant="secondary" onClick={onCancel} disabled={saving} style={BUNDLE_FORM_BUTTON}>
          취소
        </Button>
        <Button variant="primary" onClick={() => onSave(name)} disabled={saving} style={BUNDLE_FORM_BUTTON}>
          저장
        </Button>
      </div>
    </div>
  );
}

/** 카드 아래 반응 버튼 — 눌러도 카드 상세는 열리지 않는다 */
function CardAction({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      className={`${styles.cardAction} ${on ? styles.cardActionOn : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
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

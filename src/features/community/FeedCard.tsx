"use client";

import { Icon, HashChip } from "@/components/ui";
import { hostFromUrl } from "@/lib/format";
import type { FeedPost } from "./toCommunityData";
import styles from "./Community.module.css";

export interface FeedCardProps {
  /** 내 반응을 반영한 카드 */
  post: FeedPost;
  /** 내 카드에는 좋아요를 누를 수 없어 버튼을 숨긴다 */
  canLike: boolean;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  onToggleExploring: () => void;
  /** 카드 클릭 — 마인드맵 상세 팝업 열기 */
  onOpen: () => void;
}

export function FeedCard({ post, canLike, onToggleLike, onToggleBookmark, onToggleExploring, onOpen }: FeedCardProps) {
  return (
    <div className={styles.feedCard} onClick={onOpen} role="button">
      <div className={styles.feedHead}>
        <div className={styles.avatar}>{post.user.avatar}</div>
        <div className={styles.feedUser}>
          <div className={styles.feedName}>{post.user.name}</div>
          <div className={styles.feedHandle}>{post.when}</div>
        </div>
        <span className={styles.nodeBadge}>노드 {post.nodes}</span>
      </div>
      <h4 className={styles.feedTitle}>{post.title}</h4>
      {post.snippet && <p className={styles.feedSnippet}>{post.snippet}</p>}
      {/* URL 만 공개한 카드는 해시태그가 제목 자리에 있다 */}
      {!post.urlOnly && (
        <div className={styles.feedTags}>
          {post.hashtags.map((h) => (
            <HashChip key={h} label={h} size="sm" />
          ))}
        </div>
      )}
      {post.relatedUrls.length > 0 && (
        <div className={styles.feedLinks}>
          <div className={styles.feedLinksHead}>연관 URL</div>
          <div className={styles.feedLinksGrid}>
            {post.relatedUrls.slice(0, 2).map((u) => {
              const host = hostFromUrl(u.url);
              return (
                <a
                  key={u.url}
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.feedLink}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={styles.relIcon}><Icon name="link" size={11} stroke={2} /></span>
                  <span className={styles.relMain}>
                    <span className={styles.relTitle}>{u.title}</span>
                    {u.title !== host && <span className={styles.relMeta}>{host}</span>}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
      <div className={styles.feedFooter}>
        {canLike && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            className={styles.feedAction}
            style={{ color: post.likedByMe ? "var(--green-600)" : "inherit" }}
            aria-label="좋아요"
            aria-pressed={post.likedByMe}
          >
            <Icon name="heart" size={13} stroke={post.likedByMe ? 0 : 1.7} fill={post.likedByMe ? "currentColor" : undefined} />
            <span>{post.likes}</span>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
          className={styles.feedAction}
          style={{ color: post.bookmarked ? "var(--green-600)" : "inherit" }}
          aria-label="북마크"
          aria-pressed={post.bookmarked}
        >
          <Icon name="bookmark" size={13} stroke={post.bookmarked ? 0 : 1.7} fill={post.bookmarked ? "currentColor" : undefined} />
          <span>{post.bookmarks}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExploring();
          }}
          className={styles.feedAction}
          style={{ color: post.exploringByMe ? "var(--green-600)" : "inherit" }}
          aria-label="나도 탐색중"
          aria-pressed={post.exploringByMe}
        >
          <Icon name="users" size={13} />
          <span>나도 탐색중 {post.exploring}</span>
        </button>
      </div>
    </div>
  );
}

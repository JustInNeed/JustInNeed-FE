"use client";

import { Icon, HashChip } from "@/components/ui";
import { hostFromUrl } from "@/lib/format";
import type { CommunityPost, RelatedUrl } from "@/lib/mock/designData";
import styles from "./Community.module.css";

export interface FeedCardProps {
  post: CommunityPost;
  liked: boolean;
  bookmarked: boolean;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  /** 카드 클릭 — 마인드맵 상세 팝업 열기 */
  onOpen: () => void;
  /** 추천과 함께 보여줄 연관 URL (최대 2개) */
  relatedUrls?: RelatedUrl[];
}

export function FeedCard({ post, liked, bookmarked, onToggleLike, onToggleBookmark, onOpen, relatedUrls }: FeedCardProps) {
  return (
    <div className={styles.feedCard} onClick={onOpen} role="button">
      <div className={styles.feedHead}>
        <div className={styles.avatar}>{post.user.avatar}</div>
        <div className={styles.feedUser}>
          <div className={styles.feedName}>{post.user.name}</div>
          <div className={styles.feedHandle}>{post.user.handle} · {post.when}</div>
        </div>
        <span className={styles.nodeBadge}>노드 {post.nodes}</span>
      </div>
      <h4 className={styles.feedTitle}>{post.title}</h4>
      <p className={styles.feedSnippet}>{post.snippet}</p>
      <div className={styles.feedTags}>
        {post.hashtags.map((h) => (
          <HashChip key={h} label={h} size="sm" />
        ))}
      </div>
      {relatedUrls && relatedUrls.length > 0 && (
        <div className={styles.feedLinks}>
          <div className={styles.feedLinksHead}>연관 URL</div>
          <div className={styles.feedLinksGrid}>
            {relatedUrls.slice(0, 2).map((u) => (
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
                  <span className={styles.relMeta}>{hostFromUrl(u.url)}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div className={styles.feedFooter}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          className={styles.feedAction}
          style={{ color: liked ? "var(--green-600)" : "inherit" }}
        >
          <Icon name="heart" size={13} stroke={liked ? 0 : 1.7} fill={liked ? "currentColor" : undefined} />
          <span>{post.likes + (liked ? 1 : 0)}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
          className={styles.feedAction}
          style={{ color: bookmarked ? "var(--green-600)" : "inherit" }}
        >
          <Icon name="bookmark" size={13} stroke={bookmarked ? 0 : 1.7} fill={bookmarked ? "currentColor" : undefined} />
          <span>{post.bookmarks + (bookmarked ? 1 : 0)}</span>
        </button>
        <span className={styles.feedAction}>
          <Icon name="users" size={13} />
          <span>나도 탐색중 {post.exploring}</span>
        </span>
      </div>
    </div>
  );
}

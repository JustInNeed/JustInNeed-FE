"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui";
import type { SessionListItem } from "@/lib/api";
import { formatDateTime, formatDuration, STATUS_LABEL, withHash } from "@/lib/format";
import type { CommunityPost } from "@/lib/mock/designData";
import { MindmapPreview } from "./MindmapPreview";
import { useOverlayClose } from "./useOverlayClose";
import styles from "./MindmapDetailModal.module.css";

export interface MindmapDetailModalProps {
  post: CommunityPost;
  /** 이 마인드맵의 출처가 된 세션 (목: relatedSessionsFor) */
  sessions: SessionListItem[];
  onClose: () => void;
  /** 작성자 이름 클릭 — 팝업을 닫고 프로필로 이동 */
  onOpenProfile: (handle: string) => void;
  /** 넘기면 세션 행을 눌러 이동할 수 있다 */
  onSessionClick?: (id: number) => void;
  /** 하단 버튼 영역 (예: 원래 마인드맵에서 보기) */
  actions?: ReactNode;
}

/** 커뮤니티·북마크·프로필 공통 마인드맵 상세 팝업 (갤럭시 미리보기 + 관련 세션). */
export function MindmapDetailModal({ post, sessions, onClose, onOpenProfile, onSessionClick, actions }: MindmapDetailModalProps) {
  useOverlayClose(onClose);

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div role="dialog" aria-modal="true" aria-label={post.title} className={styles.modal}>
        <div className={styles.header}>
          <MindmapPreview seed={post.id} nodes={post.nodes} height={260}>
            <div className={styles.shade} />
            <div className={styles.caption}>
              <div className={styles.title}>{post.title}</div>
              <div className={styles.meta}>
                <button
                  className={styles.author}
                  onClick={() => {
                    onOpenProfile(post.user.handle);
                    onClose();
                  }}
                >
                  {post.user.avatar} {post.user.name}
                </button>
                <span className={styles.sep}>·</span>
                <span>노드 {post.nodes}</span>
                <span className={styles.sep}>·</span>
                <span>좋아요 {post.likes}</span>
              </div>
              <div className={styles.tags}>
                {post.hashtags.map((h) => (
                  <span key={h} className={styles.tag}>{h}</span>
                ))}
              </div>
            </div>
          </MindmapPreview>
          <button onClick={onClose} aria-label="닫기" className={styles.close}>
            <Icon name="x" size={14} />
          </button>
        </div>

        {post.snippet && <p className={styles.snippet}>{post.snippet}</p>}

        <div className={styles.sessions}>
          <div className={styles.sessionsHead}>
            <div className={styles.sessionsTitle}>
              관련 세션 <span className={styles.sessionsCount}>· {sessions.length}개</span>
            </div>
            <span className={styles.sessionsHint}>이 마인드맵의 출처가 된 검색 세션</span>
          </div>
          <div className={styles.sessionList}>
            {sessions.map((s) => {
              const body = (
                <>
                  <div className={styles.rowTop}>
                    <div className={styles.rowTitle}>{s.title}</div>
                    <span className={styles.rowDuration}>
                      <Icon name="clock" size={11} />
                      {formatDuration(s.startedAt, s.endedAt) ?? STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <div className={styles.rowMeta}>
                    {formatDateTime(s.startedAt)} · 출처 {s.pageCount}개
                  </div>
                  <div className={styles.rowTags}>
                    {s.tags.slice(0, 4).map((t) => (
                      <span key={t} className={styles.rowTag}>{withHash(t)}</span>
                    ))}
                  </div>
                </>
              );
              return onSessionClick ? (
                <button key={s.id} className={`${styles.row} ${styles.rowClickable}`} onClick={() => onSessionClick(s.id)}>
                  {body}
                </button>
              ) : (
                <div key={s.id} className={styles.row}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

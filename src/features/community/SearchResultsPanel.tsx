"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui";
import type { CommunityPost, CommunityUser, TrendingHashtag } from "@/lib/viewTypes";
import styles from "./Community.module.css";

export interface ProfileResult extends CommunityUser {
  tags: string[];
  mapCount: number;
}
export interface SearchResults {
  profiles: ProfileResult[];
  maps: CommunityPost[];
  tags: TrendingHashtag[];
}

export interface SearchResultsPanelProps {
  results: SearchResults;
  onOpenProfile: (handle: string) => void;
  onPickTag: (tag: string) => void;
}

/** 커뮤니티 검색바 아래 드롭다운 — 연관 해시태그 / 프로필 추천 / 마인드맵 탐색 */
export function SearchResultsPanel({ results, onOpenProfile, onPickTag }: SearchResultsPanelProps) {
  const { profiles, maps, tags } = results;
  const empty = profiles.length === 0 && maps.length === 0 && tags.length === 0;

  return (
    <div className={styles.dropdown}>
      {empty ? (
        <div className={styles.dropdownEmpty}>일치하는 결과가 없어요. 다른 해시태그로 검색해보세요.</div>
      ) : (
        <>
          {tags.length > 0 && (
            <ResultGroup title="연관 해시태그" count={tags.length}>
              <div className={styles.tagResults}>
                {tags.map((t) => (
                  <button key={t.tag} onClick={() => onPickTag(t.tag)} className={styles.tagResult}>
                    {t.tag}
                    <span className={styles.tagResultCount}>{t.count}</span>
                  </button>
                ))}
              </div>
            </ResultGroup>
          )}
          {profiles.length > 0 && (
            <ResultGroup title="프로필 추천" count={profiles.length} hint="해당 태그를 보유한 사용자">
              {profiles.map((p) => (
                <button key={p.handle} onClick={() => onOpenProfile(p.handle)} className={styles.resultRow}>
                  <div className={styles.avatarSm}>{p.avatar}</div>
                  <div className={styles.resultMain}>
                    <div className={styles.resultTitle}>{p.name}</div>
                    <div className={styles.resultMeta}>{p.handle} · {p.tags.slice(0, 3).join(" ")}</div>
                  </div>
                  <span className={styles.chev}><Icon name="chevronRight" size={14} /></span>
                </button>
              ))}
            </ResultGroup>
          )}
          {maps.length > 0 && (
            <ResultGroup title="마인드맵 탐색" count={maps.length} hint="해당 태그가 포함된 마인드맵">
              {maps.map((m) => (
                <button key={m.id} onClick={() => onOpenProfile(m.user.handle)} className={styles.resultRow} style={{ alignItems: "flex-start" }}>
                  <div className={styles.mapIcon}><Icon name="network" size={14} /></div>
                  <div className={styles.resultMain}>
                    <div className={styles.resultTitle}>{m.title}</div>
                    <div className={styles.resultMeta}>
                      {m.user.handle} · 노드 {m.nodes} · {m.hashtags.slice(0, 2).join(" ")}
                    </div>
                  </div>
                  <span className={styles.chev} style={{ marginTop: 8 }}><Icon name="chevronRight" size={14} /></span>
                </button>
              ))}
            </ResultGroup>
          )}
        </>
      )}
    </div>
  );
}

function ResultGroup({ title, count, hint, children }: { title: string; count: number; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className={styles.groupHead}>
        <div className={styles.groupTitleWrap}>
          <span className={styles.groupTitle}>{title}</span>
          <span className={styles.groupCount}>{count}</span>
        </div>
        {hint && <span className={styles.groupHint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

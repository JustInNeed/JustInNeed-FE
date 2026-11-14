"use client";

import { Icon, Button } from "@/components/ui";
import type { ExcludedUrl } from "@/lib/viewTypes";
import styles from "./SettingsView.module.css";

export interface ExclusionListProps {
  excluded: ExcludedUrl[];
  onToggle: (item: ExcludedUrl) => void;
  onRemove: (item: ExcludedUrl) => void;
}

const domainOf = (u: string) => {
  const clean = u.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const slash = clean.indexOf("/");
  return slash === -1 ? clean : clean.slice(0, slash);
};
const isRootDomain = (u: string) => {
  const clean = u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  return clean.indexOf("/") === -1;
};

const byAlpha = (a: string, b: string) => a.localeCompare(b, "en");

/**
 * 도메인별로 묶어 보여주는 수집 제외 목록. 묶음은 도메인 알파벳 순, 묶음 안에서는 상위 도메인 → 나머지 알파벳 순.
 * 켜짐 · 꺼짐과 추가한 순서는 순서에 영향을 주지 않는다 (QA-029).
 */
export function ExclusionList({ excluded, onToggle, onRemove }: ExclusionListProps) {
  const groups: { domain: string; items: ExcludedUrl[] }[] = [];
  const byDomain = new Map<string, { domain: string; items: ExcludedUrl[] }>();
  excluded.forEach((it) => {
    const d = domainOf(it.url);
    let g = byDomain.get(d);
    if (!g) {
      g = { domain: d, items: [] };
      byDomain.set(d, g);
      groups.push(g);
    }
    g.items.push(it);
  });
  groups.sort((a, b) => byAlpha(a.domain, b.domain));
  groups.forEach((g) =>
    g.items.sort((a, b) => {
      const ra = isRootDomain(a.url) ? 0 : 1;
      const rb = isRootDomain(b.url) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return byAlpha(a.url, b.url);
    }),
  );

  return (
    <div>
      {groups.map((g, gi) => {
        const grouped = g.items.length > 1;
        return (
          <div key={g.domain} className={`${styles.exGroup} ${grouped ? styles.exGroupMulti : ""}`} style={{ borderTop: gi === 0 ? "1px solid var(--line)" : "none" }}>
            {grouped && (
              <div className={styles.exGroupHead}>
                <Icon name="folder" size={11} />
                {g.domain}
                <span className={styles.exGroupCount}>{g.items.length}</span>
              </div>
            )}
            {g.items.map((item, i) => (
              <label
                key={item.id}
                className={styles.exRow}
                style={{ opacity: item.on ? 1 : 0.55, borderTop: grouped ? "1px solid var(--line)" : i === 0 ? "none" : "1px solid var(--line)" }}
              >
                <input type="checkbox" checked={item.on} onChange={() => onToggle(item)} style={{ accentColor: "var(--green-500)" }} />
                <div className={styles.exUrl} style={{ color: item.on ? "var(--ink-900)" : "var(--ink-400)" }}>{item.url}</div>
                {item.isDefault ? (
                  <span className={styles.exDefault}>기본</span>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      onRemove(item);
                    }}
                    aria-label="삭제"
                    style={{ color: "var(--ink-400)" }}
                  >
                    <Icon name="trash" size={12} />
                  </Button>
                )}
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}

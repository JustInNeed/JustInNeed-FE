"use client";

import { Icon, Button } from "@/components/ui";
import type { ExcludedUrl } from "@/lib/viewTypes";
import styles from "./SettingsView.module.css";

export interface ExclusionListProps {
  excluded: ExcludedUrl[];
  setExcluded: (updater: (list: ExcludedUrl[]) => ExcludedUrl[]) => void;
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

/** 도메인별로 묶어 보여주는 수집 제외 목록. on 항목이 있는 그룹이 위, 그룹 안에서는 상위 도메인 → on → off 순. */
export function ExclusionList({ excluded, setExcluded }: ExclusionListProps) {
  const toggle = (url: string) => setExcluded((list) => list.map((it) => (it.url === url ? { ...it, on: !it.on } : it)));
  const remove = (url: string) => setExcluded((list) => list.filter((it) => it.url !== url));

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
  groups.sort((a, b) => (a.items.some((it) => it.on) ? 0 : 1) - (b.items.some((it) => it.on) ? 0 : 1));
  groups.forEach((g) =>
    g.items.sort((a, b) => {
      const ra = isRootDomain(a.url) ? 0 : 1;
      const rb = isRootDomain(b.url) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return (b.on ? 1 : 0) - (a.on ? 1 : 0);
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
            {g.items.map(({ url, on, isDefault }, i) => (
              <label
                key={url}
                className={styles.exRow}
                style={{ opacity: on ? 1 : 0.55, borderTop: grouped ? "1px solid var(--line)" : i === 0 ? "none" : "1px solid var(--line)" }}
              >
                <input type="checkbox" checked={on} onChange={() => toggle(url)} style={{ accentColor: "var(--green-500)" }} />
                <div className={styles.exUrl} style={{ color: on ? "var(--ink-900)" : "var(--ink-400)" }}>{url}</div>
                {isDefault ? (
                  <span className={styles.exDefault}>기본</span>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      remove(url);
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

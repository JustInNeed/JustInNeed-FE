"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui";
import type { Auth } from "@/lib/types";
import styles from "./Sidebar.module.css";

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  /** Only items with an href are navigable; others are placeholders for not-yet-built pages. */
  href?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "개인 영역",
    items: [
      { id: "home", label: "홈", icon: "home" },
      { id: "analytics", label: "분석/추천", icon: "chart" },
      { id: "sessions", label: "세션 목록", icon: "list", href: "/sessions" },
      { id: "settings", label: "설정", icon: "settings" },
    ],
  },
  {
    title: "커뮤니티",
    items: [
      { id: "community", label: "둘러보기", icon: "users" },
      { id: "search", label: "검색", icon: "search" },
      { id: "bookmarks", label: "북마크", icon: "bookmark" },
      { id: "profile", label: "마이프로필", icon: "user" },
    ],
  },
];

export interface SidebarProps {
  auth: Auth | null;
  onLogout: () => void;
}

export function Sidebar({ auth, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [recording, setRecording] = useState(true);

  return (
    <aside className={styles.aside}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <Icon name="sprout" size={20} stroke={2} />
        </div>
        <div>
          <div className={styles.brandName}>JustInNeed</div>
          <div className={styles.brandSub}>웹서핑 정리 도우미</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className={styles.sectionLabel}>{section.title}</div>
            {section.items.map((item) => {
              const active = item.href ? pathname.startsWith(item.href) : false;
              const cls = [styles.navItem, active ? styles.navItemActive : ""]
                .filter(Boolean)
                .join(" ");
              const inner = (
                <>
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                  {active && <span className={styles.activeBar} />}
                </>
              );
              return item.href ? (
                <Link key={item.id} href={item.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button
                  key={item.id}
                  className={cls}
                  disabled
                  title="준비 중인 페이지입니다"
                >
                  {inner}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.recBox}>
        <div className={styles.recHead}>
          <span className={styles.recEyebrow}>EXTENSION</span>
          <span
            className={styles.statusDot}
            style={{ background: recording ? "var(--green-500)" : "var(--ink-300)" }}
          />
        </div>
        <div className={styles.recTitle}>{recording ? "수집 중" : "대기 중"}</div>
        <div className={styles.recSub}>{recording ? "23분 14초" : "버튼을 눌러 시작"}</div>
        <button
          onClick={() => setRecording((v) => !v)}
          className={styles.recBtn}
          style={{
            background: recording ? "var(--surface)" : "var(--green-500)",
            color: recording ? "var(--ink-900)" : "#fff",
            border: recording ? "1px solid var(--line)" : "none",
          }}
        >
          <Icon name={recording ? "stop" : "play"} size={12} />
          <span>{recording ? "수집 종료" : "수집 시작"}</span>
        </button>
      </div>

      {auth && (
        <div className={styles.userBox}>
          <div className={styles.avatar}>{(auth.nickname || "?").slice(0, 1).toUpperCase()}</div>
          <div className={styles.userName}>{auth.nickname}</div>
          <button onClick={onLogout} title="로그아웃" className={styles.logoutBtn} aria-label="로그아웃">
            <Icon name="logout" size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}

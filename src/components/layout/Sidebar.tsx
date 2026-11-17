"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui";
import { usePersonal } from "@/lib/app/PersonalContext";
import { NAV_ROOT_ATTR } from "@/lib/app/NavHistoryContext";
import { ExtensionCard } from "./ExtensionCard";
import styles from "./Sidebar.module.css";

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  /** 활성 판정에 쓸 경로 prefix (기본 href) */
  match?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "개인 영역",
    items: [
      { id: "home", label: "홈", icon: "home", href: "/home" },
      {
        id: "analytics",
        label: "분석/추천",
        icon: "chart",
        href: "/analytics",
      },
      { id: "sessions", label: "세션 목록", icon: "list", href: "/sessions" },
      { id: "settings", label: "설정", icon: "settings", href: "/settings" },
    ],
  },
  {
    title: "커뮤니티",
    items: [
      { id: "community", label: "둘러보기", icon: "users", href: "/community" },
      { id: "search", label: "검색", icon: "search", href: "/search" },
      {
        id: "bookmarks",
        label: "북마크",
        icon: "bookmark",
        href: "/bookmarks",
      },
      {
        id: "profile",
        label: "마이프로필",
        icon: "user",
        href: "/profile",
        match: ["/profile"],
      },
    ],
  },
];

/**
 * 1024px 이상: 왼쪽 고정 사이드바.
 * 1024px 미만: 사이드바를 숨기고 상단 바(메뉴 버튼 + 로고)를 띄운다. 메뉴 버튼을 누르면 사이드바가 왼쪽에서 서랍처럼 덮어서 열린다 (QA-003 A안).
 * 서랍은 ✕, 바깥 영역, Esc, 메뉴 이동으로 닫힌다. 너비에 따른 표시 전환은 CSS(@media)만으로 한다.
 * 사이드바 · 상단 바의 로고 영역은 홈으로 가는 링크다 (QA-031). 메뉴의 "홈" 과 같이 이동 기록을 비운다.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { member, logout } = usePersonal();
  const [open, setOpen] = useState(false);

  // 다른 화면으로 이동하면 서랍을 닫는다
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          aria-controls="app-sidebar"
        >
          <Icon name="menu" size={18} />
        </button>
        <Link href="/home" className={styles.topbarBrand} aria-label="JustInNeed 홈으로 이동" {...{ [NAV_ROOT_ATTR]: "" }}>
          <span className={styles.topbarLogo}>
            <Icon name="sprout" size={16} stroke={2} />
          </span>
          <span className={styles.topbarName}>JustInNeed</span>
        </Link>
      </header>

      {open && (
        <div
          className={styles.scrim}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        id="app-sidebar"
        className={[styles.aside, open ? styles.asideOpen : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.brand}>
          {/* 이미 홈이면 주소가 안 바뀌어 서랍이 그대로 남으므로 누를 때 직접 닫는다 */}
          <Link
            href="/home"
            className={styles.brandLink}
            aria-label="JustInNeed 홈으로 이동"
            onClick={() => setOpen(false)}
            {...{ [NAV_ROOT_ATTR]: "" }}
          >
            <span className={styles.logo}>
              <Icon name="sprout" size={20} stroke={2} />
            </span>
            <span>
              <span className={styles.brandName}>JustInNeed</span>
              <span className={styles.brandSub}>웹서핑 정리 도우미</span>
            </span>
          </Link>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
          >
            <Icon name="x" size={14} />
          </button>
        </div>

        <nav className={styles.nav}>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className={styles.sectionLabel}>{section.title}</div>
              {section.items.map((item) => {
                const bases = item.match ?? [item.href];
                const active = bases.some(
                  (b) => pathname === b || pathname.startsWith(b + "/"),
                );
                const cls = [styles.navItem, active ? styles.navItemActive : ""]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <Link key={item.id} href={item.href} className={cls} {...{ [NAV_ROOT_ATTR]: "" }}>
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                    {active && <span className={styles.activeBar} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <ExtensionCard />

        <div className={styles.userBox}>
          <div className={styles.avatar}>
            {(member.nickname || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className={styles.userName}>{member.nickname ?? "사용자"}</div>
          <button
            onClick={logout}
            title="로그아웃"
            className={styles.logoutBtn}
            aria-label="로그아웃"
          >
            <Icon name="logout" size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}

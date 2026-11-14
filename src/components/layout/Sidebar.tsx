"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui";
import { usePersonal } from "@/lib/app/PersonalContext";
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
      { id: "analytics", label: "분석/추천", icon: "chart", href: "/analytics" },
      { id: "sessions", label: "세션 목록", icon: "list", href: "/sessions" },
      { id: "settings", label: "설정", icon: "settings", href: "/settings" },
    ],
  },
  {
    title: "커뮤니티",
    items: [
      { id: "community", label: "둘러보기", icon: "users", href: "/community" },
      { id: "search", label: "검색", icon: "search", href: "/search" },
      { id: "bookmarks", label: "북마크", icon: "bookmark", href: "/bookmarks" },
      { id: "profile", label: "마이프로필", icon: "user", href: "/profile", match: ["/profile"] },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { member, logout } = usePersonal();

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
              const bases = item.match ?? [item.href];
              const active = bases.some((b) => pathname === b || pathname.startsWith(b + "/"));
              const cls = [styles.navItem, active ? styles.navItemActive : ""].filter(Boolean).join(" ");
              return (
                <Link key={item.id} href={item.href} className={cls}>
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
        <div className={styles.avatar}>{(member.nickname || "?").slice(0, 1).toUpperCase()}</div>
        <div className={styles.userName}>{member.nickname ?? "사용자"}</div>
        <button onClick={logout} title="로그아웃" className={styles.logoutBtn} aria-label="로그아웃">
          <Icon name="logout" size={14} />
        </button>
      </div>
    </aside>
  );
}

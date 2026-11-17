import { useRef, type ReactNode } from "react";
import { Button, InlineState } from "@/components/ui";
import styles from "./Profile.module.css";

interface ListState {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** 프로필과 따로 받는 목록 — 실패해도 프로필은 보인다.
 * pages: 페이지 번호로 한 페이지씩 보여준다 (프로필 탭).
 * more: 더 보기로 이어 붙인다 (프로필 수정의 핀고정 후보 — 받은 세션 안에서 고정 순서를 찾는다). */
export type ProfileListSection = ListState &
  (
    | { kind: "pages"; page: number; totalPages: number; onPageChange: (page: number) => void }
    | { kind: "more"; hasNext: boolean; onLoadMore: () => void }
  );

/** 한 번에 보여줄 번호 수 */
const PAGE_WINDOW = 5;

/** 현재 페이지를 가운데 두고 최대 5개. 0부터 센다 */
export function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(0, Math.min(page - Math.floor(PAGE_WINDOW / 2), totalPages - PAGE_WINDOW));
  const end = Math.min(totalPages, start + PAGE_WINDOW);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/** 목록 아래 페이지 번호 — 탭과 같은 밑줄 표시. 한 페이지뿐이면 그리지 않는다 */
function ProfileListPages({
  section,
  label,
  onMove,
}: {
  section: Extract<ProfileListSection, { kind: "pages" }>;
  label: string;
  onMove: () => void;
}) {
  const { page, totalPages, loading, error } = section;
  if (!error && totalPages <= 1) return null;
  const go = (next: number) => {
    if (next === page || next < 0 || next >= totalPages) return;
    section.onPageChange(next);
    onMove();
  };
  return (
    <>
      {error && (
        <div className={styles.mapMore}>
          <InlineState kind="error" title={`${label}을 불러오지 못했어요.`} description={error} onRetry={section.onRetry} />
        </div>
      )}
      {totalPages > 1 && (
        <nav className={styles.pager} aria-label={`${label} 목록 페이지`} aria-busy={loading}>
          <button className={styles.pagerStep} onClick={() => go(page - 1)} disabled={page === 0}>
            이전
          </button>
          {pageWindow(page, totalPages).map((n) => (
            <button
              key={n}
              className={`${styles.pagerNum} ${n === page ? styles.pagerNumOn : ""}`}
              aria-current={n === page ? "page" : undefined}
              aria-label={`${n + 1}페이지`}
              onClick={() => go(n)}
            >
              {n + 1}
            </button>
          ))}
          <button className={styles.pagerStep} onClick={() => go(page + 1)} disabled={page >= totalPages - 1}>
            다음
          </button>
        </nav>
      )}
    </>
  );
}

/** 목록 아래 상태 — 이어 받다 실패 · 불러오는 중 · 더 보기. 더 받을 게 없으면 그리지 않는다 */
function ProfileListMore({ section, label }: { section: Extract<ProfileListSection, { kind: "more" }>; label: string }) {
  if (!section.error && !section.loading && !section.hasNext) return null;
  return (
    <div className={styles.mapMore}>
      {section.error ? (
        <InlineState kind="error" title={`${label}을 더 불러오지 못했어요.`} description={section.error} onRetry={section.onRetry} />
      ) : section.loading ? (
        <span className={styles.mapMoreLoading}>불러오는 중…</span>
      ) : (
        <Button variant="secondary" onClick={section.onLoadMore}>더 보기</Button>
      )}
    </div>
  );
}

/** 프로필 목록 본문 — 항목이 없으면 오류 · 불러오는 중 · 빈 상태, 있으면 목록과 페이지 번호(또는 더 보기) */
export function ProfileList({
  section,
  label,
  isEmpty,
  empty,
  children,
}: {
  section?: ProfileListSection;
  label: string;
  isEmpty: boolean;
  empty: ReactNode;
  children: ReactNode;
}) {
  const top = useRef<HTMLDivElement>(null);
  if (isEmpty) {
    return (
      <div className={styles.sessionEmpty}>
        {section?.error ? (
          <InlineState kind="error" title={`${label}을 불러오지 못했어요.`} description={section.error} onRetry={section.onRetry} />
        ) : section?.loading ? (
          <div className={styles.state}>불러오는 중…</div>
        ) : (
          empty
        )}
      </div>
    );
  }
  return (
    <>
      <div ref={top} className={styles.listTop} />
      {children}
      {section?.kind === "pages" && (
        <ProfileListPages section={section} label={label} onMove={() => top.current?.scrollIntoView?.({ block: "start", behavior: "smooth" })} />
      )}
      {section?.kind === "more" && <ProfileListMore section={section} label={label} />}
    </>
  );
}

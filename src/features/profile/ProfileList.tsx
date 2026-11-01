import type { ReactNode } from "react";
import { Button, InlineState } from "@/components/ui";
import styles from "./Profile.module.css";

/** 프로필과 따로 페이지로 받는 목록 — 실패해도 프로필은 보인다 */
export interface ProfileListSection {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  hasNext: boolean;
  onLoadMore: () => void;
}

/** 목록 아래 상태 — 이어 받다 실패 · 불러오는 중 · 더 보기. 더 받을 게 없으면 그리지 않는다 */
function ProfileListMore({ section, label }: { section: ProfileListSection; label: string }) {
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

/** 프로필 목록 본문 — 항목이 없으면 오류 · 불러오는 중 · 빈 상태, 있으면 목록과 더 보기 */
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
      {children}
      {section && <ProfileListMore section={section} label={label} />}
    </>
  );
}

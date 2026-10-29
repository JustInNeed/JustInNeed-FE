"use client";

import { useEffect, useState } from "react";
import { Icon, Card, PageHeader, Toggle, inputClass, Button, FieldMessage, InlineState } from "@/components/ui";
import type { ExcludedUrl, Integration } from "@/lib/viewTypes";
import { ExclusionList } from "./ExclusionList";
import { normalizeExcludedUrl } from "./excludedUrl";
import { AccountSection } from "./AccountSection";
import { WithdrawSection } from "./WithdrawSection";
import styles from "./SettingsView.module.css";

type Section = "collection" | "extension" | "integration" | "account";

const SECTIONS: { id: Section; l: string }[] = [
  { id: "collection", l: "데이터 수집" },
  { id: "extension", l: "확장 프로그램" },
  // 외부 플랫폼 연동은 준비 전이라 메뉴에서 숨김 (섹션 코드는 유지, 다시 노출할 때 아래 줄만 복구)
  // { id: "integration", l: "외부 플랫폼" },
  { id: "account", l: "계정" },
];

const NO_INTEGRATIONS: Integration[] = [];

/** props 로 받은 목록을 화면에서 고칠 수 있게 복사해 둔다. 새 목록이 오면(다시 불러오기 등) 덮어쓴다. */
function useEditableList<T>(source: T[]) {
  const [list, setList] = useState(source);
  useEffect(() => setList(source), [source]);
  return [list, setList] as const;
}

export interface SettingsViewProps {
  /** 수집 제외 URL 목록 — API 연결 전에는 빈 배열 */
  excludedUrls: ExcludedUrl[];
  /** 수집 제외 목록을 불러오지 못했을 때 메시지 */
  error?: string | null;
  onRetry?: () => void;
  /** 외부 플랫폼 연동 목록 (메뉴 숨김 상태) */
  integrations?: Integration[];
}

export function SettingsView({ excludedUrls, error = null, onRetry, integrations: integrationsProp = NO_INTEGRATIONS }: SettingsViewProps) {
  const [section, setSection] = useState<Section>("collection");
  const [withdrawing, setWithdrawing] = useState(false);
  const [popup, setPopup] = useState(true);
  const [excluded, setExcluded] = useEditableList(excludedUrls);
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [autoStop, setAutoStop] = useState(true);
  const [contextMenu, setContextMenu] = useState(true);
  const [integrations, setIntegrations] = useEditableList(integrationsProp);

  const addUrl = () => {
    if (!newUrl.trim()) return;
    const v = normalizeExcludedUrl(newUrl);
    if (!v) return setUrlError("올바른 URL 형식이 아니에요.");
    if (excluded.length >= 100) return setUrlError("URL은 최대 100개까지 등록할 수 있습니다.");
    if (excluded.some((e) => e.url === v)) return setUrlError("이미 등록된 URL입니다.");
    setExcluded((list) => [...list, { url: v, on: true, isDefault: false }]);
    setNewUrl("");
    setUrlError(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader title="설정" />
      <div className={styles.grid}>
        <nav className={styles.nav}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSection(s.id);
                setWithdrawing(false);
              }}
              className={`${styles.navBtn} ${section === s.id ? styles.navBtnOn : ""}`}
            >
              {s.l}
            </button>
          ))}
        </nav>

        <div>
          {section === "collection" && (
            <Card className={styles.card}>
              <h3 className={styles.cardTitle}>수집 제외 URL</h3>
              <p className={styles.cardDesc}>이 사이트들에서는 행동 데이터를 수집하지 않아요. 최대 100개까지 등록 가능합니다.</p>
              {error ? (
                <InlineState kind="error" title={error} onRetry={onRetry} />
              ) : (
                <>
                  <div className={styles.addRow}>
                    <input
                      value={newUrl}
                      onChange={(e) => {
                        setNewUrl(e.target.value);
                        setUrlError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && addUrl()}
                      placeholder="https://example.com"
                      aria-invalid={urlError ? true : undefined}
                      aria-describedby={urlError ? "excluded-url-error" : undefined}
                      className={inputClass}
                      style={{ flex: 1 }}
                    />
                    <Button variant="primary" onClick={addUrl}>
                      <Icon name="plus" size={12} /> 추가
                    </Button>
                  </div>
                  {urlError && (
                    <FieldMessage tone="error" id="excluded-url-error">
                      {urlError}
                    </FieldMessage>
                  )}
                  {excluded.length === 0 ? (
                    <InlineState kind="empty" title="아직 등록한 URL이 없어요" description="수집하지 않을 사이트 주소를 위에 입력해 추가해 보세요." />
                  ) : (
                    <ExclusionList excluded={excluded} setExcluded={setExcluded} />
                  )}
                </>
              )}
            </Card>
          )}

          {section === "extension" && (
            <Card className={styles.card}>
              <Toggle label="확장 프로그램 팝업 노출" desc="브라우저에 떠있는 수집 상태 팝업을 켭니다" on={popup} onChange={setPopup} />
              <div className={styles.divider} />
              <Toggle label="자동 종료 알림" desc="30분 이상 활동 없으면 5초 알림 후 종료" on={autoStop} onChange={setAutoStop} />
              <div className={styles.divider} />
              <Toggle label="우클릭 컨텍스트 메뉴" desc="텍스트 선택 후 우클릭으로 수동 스크랩" on={contextMenu} onChange={setContextMenu} />
            </Card>
          )}

          {section === "integration" && (
            <Card className={styles.card}>
              <h3 className={styles.cardTitle} style={{ marginBottom: 14 }}>연동된 외부 플랫폼</h3>
              {integrations.map((p, i) => (
                <div key={p.name} className={styles.integRow}>
                  <div>
                    <div className={styles.integName}>{p.name}</div>
                    <div className={styles.integStatus} style={{ color: p.connected ? "var(--green-600)" : "var(--ink-500)" }}>
                      {p.connected ? "연결됨" : "미연결"}
                    </div>
                  </div>
                  <Button
                    variant={p.connected ? "secondary" : "primary"}
                    onClick={() => setIntegrations((list) => list.map((x, j) => (j === i ? { ...x, connected: !x.connected } : x)))}
                  >
                    {p.connected ? "해제" : "연결"}
                  </Button>
                </div>
              ))}
            </Card>
          )}

          {section === "account" &&
            (withdrawing ? (
              <WithdrawSection onBack={() => setWithdrawing(false)} />
            ) : (
              <AccountSection onWithdraw={() => setWithdrawing(true)} />
            ))}
        </div>
      </div>
    </div>
  );
}

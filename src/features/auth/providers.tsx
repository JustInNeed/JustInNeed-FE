import type { ReactNode } from "react";
import type { ProviderId } from "@/lib/types";

export interface Provider {
  id: ProviderId;
  label: string;
  bg: string;
  fg: string;
  border?: string;
  icon: ReactNode;
  /** false면 로그인 화면에 버튼을 노출하지 않음 (로직은 유지). */
  enabled: boolean;
}

export const PROVIDERS: Provider[] = [
  {
    id: "kakao",
    label: "카카오로 시작하기",
    bg: "#FEE500",
    fg: "#000",
    enabled: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.78 1.85 5.22 4.62 6.6l-1.13 4.13c-.1.36.31.65.62.45L11 19.4c.33.03.66.05 1 .05 5.52 0 10-3.48 10-7.65S17.52 3 12 3z" />
      </svg>
    ),
  },
  {
    id: "naver",
    label: "네이버로 시작하기",
    bg: "#03C75A",
    fg: "#fff",
    enabled: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727z" />
      </svg>
    ),
  },
];

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  kakao: "카카오",
  naver: "네이버",
};

import type { ReactNode } from "react";
import type { ProviderId } from "@/lib/types";

export interface Provider {
  id: ProviderId;
  label: string;
  bg: string;
  fg: string;
  border?: string;
  icon: ReactNode;
}

export const PROVIDERS: Provider[] = [
  {
    id: "kakao",
    label: "카카오로 시작하기",
    bg: "#FEE500",
    fg: "#000",
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
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727z" />
      </svg>
    ),
  },
  {
    id: "google",
    label: "Google로 시작하기",
    bg: "#fff",
    fg: "#1A1F17",
    border: "1px solid var(--line-2)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    ),
  },
];

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  kakao: "카카오",
  naver: "네이버",
  google: "Google",
};

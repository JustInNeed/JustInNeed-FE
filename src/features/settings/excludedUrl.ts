// 수집 제외 URL 형식 검사 — 백엔드 ExcludedUrlParser 와 같은 규칙. 테스트 입력 · 기대값도 같은 표를 쓴다.
// http(s)만 허용(프로토콜 생략 가능), 공백 · 계정정보(user@) 불가, 도메인은 점으로 나뉜 라벨 + 영문 2자 이상 TLD.
import type { ExcludedUrlItem } from "@/lib/api";
import type { ExcludedUrl } from "@/lib/viewTypes";

const URL_RE = /^(?:https?:\/\/)?([^/?#]+)(\/[^?#]*)?(\?[^#]*)?(?:#.*)?$/i;
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
// URI 경로 · 쿼리에 쓸 수 없는 문자, 잘못된 % 인코딩
const ILLEGAL_RE = /[<>"{}|\\^`[\]]|%(?![0-9a-f]{2})/i;

/** 저장 · 표시에 쓰는 형태(프로토콜 · www. · 기본 포트 · 끝 슬래시 · 빈 쿼리 제거, 도메인 소문자)로 정규화. 형식이 틀리면 null. */
export function normalizeExcludedUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v || /\s/.test(v)) return null;
  const m = URL_RE.exec(v);
  if (!m) return null;
  const [, authority, path = "", query = ""] = m;
  const hostPort = /^(.+?)(?::(\d{1,5}))?$/.exec(authority);
  if (!hostPort) return null;
  const [, host, port] = hostPort;
  if (!DOMAIN_RE.test(host) || ILLEGAL_RE.test(path + query)) return null;
  // www.com 처럼 떼면 도메인이 안 되는 경우는 그대로 둔다
  const domain = host.toLowerCase().replace(/^www\.(?=[^.]+\.)/, "");
  const shownPort = port && port !== "80" && port !== "443" ? `:${port}` : "";
  const cleanPath = path.replace(/\/+$/, "");
  const cleanQuery = query === "?" ? "" : query;
  return `${domain}${shownPort}${cleanPath}${cleanQuery}`;
}

/** 수집 제외 URL API 응답 → 화면 모델 */
export const toExcludedUrl = (item: ExcludedUrlItem): ExcludedUrl => ({
  id: item.excludedUrlId,
  url: item.url,
  on: item.isExcluded,
  isDefault: item.isDefault,
});

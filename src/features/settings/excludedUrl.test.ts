import { describe, expect, it } from "vitest";
import { normalizeExcludedUrl } from "./excludedUrl";

// 백엔드 ExcludedUrlParserTest 와 같은 입력 · 기대값이다. 한쪽을 바꾸면 다른 쪽도 맞춘다
describe("수집 제외 URL 정규화", () => {
  it.each([
    ["대소문자 도메인 + 끝 슬래시 (BE 테스트와 같은 값)", "HTTPS://Example.COM/private/", "example.com/private"],
    ["프로토콜 생략", "example.com", "example.com"],
    ["http 프로토콜", "http://example.com", "example.com"],
    ["www. 제거", "https://www.example.com/a", "example.com/a"],
    ["www. 만 있는 입력", "www.example.com", "example.com"],
    ["떼면 도메인이 안 되는 www.", "www.com", "www.com"],
    ["도메인만 + 끝 슬래시", "https://example.com/", "example.com"],
    ["끝 슬래시 여러 개", "https://example.com//", "example.com"],
    ["하위 도메인 유지", "https://mail.google.com", "mail.google.com"],
    ["포트 유지", "https://example.com:8080/a", "example.com:8080/a"],
    ["기본 포트 443 제거", "https://example.com:443/a", "example.com/a"],
    ["기본 포트 80 제거", "http://example.com:80", "example.com"],
    ["프로토콜 없는 기본 포트 제거", "example.com:80", "example.com"],
    ["쿼리 유지", "https://example.com/search?q=1", "example.com/search?q=1"],
    ["빈 쿼리 제거", "https://example.com/a?", "example.com/a"],
    ["쿼리 인코딩 유지", "https://example.com/s?q=a%26b", "example.com/s?q=a%26b"],
    ["경로 인코딩 유지", "https://example.com/a%2Fb", "example.com/a%2Fb"],
    ["한글 경로 유지", "https://example.com/가나", "example.com/가나"],
    ["# 이하는 버림", "https://example.com/a#top", "example.com/a"],
    ["경로 대소문자는 그대로", "https://example.com/Path", "example.com/Path"],
    ["올바른 % 인코딩", "https://example.com/%EA%B0%80", "example.com/%EA%B0%80"],
    ["앞뒤 공백은 지우고 본다", "  example.com  ", "example.com"],
  ])("%s: %s → %s", (_, raw, expected) => {
    expect(normalizeExcludedUrl(raw)).toBe(expected);
  });

  it.each([
    ["빈 값", ""],
    ["공백만", "   "],
    ["지원하지 않는 프로토콜 (BE 테스트와 같은 값)", "ftp://example.com/file"],
    ["중간 공백 (BE 테스트와 같은 값)", "https://example .com"],
    ["점 없는 호스트 (BE 테스트와 같은 값)", "https://localhost/path"],
    ["IP 주소", "http://192.168.0.1"],
    ["계정정보 포함", "https://user@example.com"],
    ["TLD 1자", "example.c"],
    ["하이픈으로 시작하는 라벨", "https://-abc.com"],
    ["밑줄이 든 도메인", "https://ex_ample.com"],
    ["한글 도메인", "https://예시.com"],
    ["경로에 쓸 수 없는 문자", "https://example.com/a<b"],
    ["잘못된 % 인코딩", "https://example.com/%zz"],
    ["URL 이 아닌 글자", "not a url"],
    ["점 없는 글자", "not-a-url"],
    ["자바스크립트", "javascript:alert(1)"],
    ["메일 주소 링크", "mailto:a@example.com"],
  ])("%s(%s)는 null", (_, raw) => {
    expect(normalizeExcludedUrl(raw)).toBeNull();
  });
});

// 전환용 임시 파일 — 화면을 props 로 바꾸는 동안만 기존 import 를 살려 둔다. 이슈 #31 마무리 때 삭제.
export * from "@/test/fixtures/design";
export type * from "@/lib/viewTypes";
export type { ProfileData as MockProfile } from "@/lib/viewTypes";

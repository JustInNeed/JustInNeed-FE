import { api } from "./client";
import type { HomeResponse } from "./types";

/** 홈 대시보드 집계 — 마인드맵 · 통계 · 활동 · 타임라인 · 세션을 한 번에 */
export const getHome = () => api.get<HomeResponse>("/home");

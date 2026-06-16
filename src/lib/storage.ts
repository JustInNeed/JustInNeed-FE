// localStorage helpers — typed, SSR-safe. Swappable for an API client later.
import type { Auth, HashtagGroup } from "./types";
import { DEFAULT_GROUPS } from "./data";

const AUTH_KEY = "jin_auth";
const GROUPS_KEY = "jin_groups";

const isBrowser = () => typeof window !== "undefined";

export function readAuth(): Auth | null {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function writeAuth(value: Auth): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function clearAuth(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

export function readGroups(): HashtagGroup[] {
  if (!isBrowser()) return DEFAULT_GROUPS;
  try {
    return JSON.parse(localStorage.getItem(GROUPS_KEY) || "null") || DEFAULT_GROUPS;
  } catch {
    return DEFAULT_GROUPS;
  }
}

export function writeGroups(groups: HashtagGroup[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch {
    /* ignore */
  }
}

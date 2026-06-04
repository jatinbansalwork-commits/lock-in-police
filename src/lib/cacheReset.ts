import { clearActiveSession } from "./storage";

const PREFIX = "lockin_police_";

function clearPrefixedStorage(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

/** True when this navigation was a full reload (F5 / refresh). */
export function isPageReload(): boolean {
  if (typeof window === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return nav?.type === "reload";
}

/**
 * Runs on every app load. Drops any in-progress session so opening the link
 * always starts on the Lock in screen (no restored countdown).
 */
export function prepareAppForNewVisit(): void {
  if (typeof window === "undefined") return;
  clearActiveSession();

  if (isPageReload()) {
    clearPrefixedStorage(localStorage);
    clearPrefixedStorage(sessionStorage);
  }
}

/** @deprecated Use prepareAppForNewVisit */
export function resetAppCacheOnPageReload(): void {
  prepareAppForNewVisit();
}

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
 * Clears persisted app data on refresh so sessions, captures, and stale
 * camera/session state do not carry over across reloads.
 */
export function resetAppCacheOnPageReload(): void {
  if (typeof window === "undefined") return;
  if (!isPageReload()) return;
  clearPrefixedStorage(localStorage);
  clearPrefixedStorage(sessionStorage);
}

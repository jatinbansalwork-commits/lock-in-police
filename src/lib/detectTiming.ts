/** Set true locally to validate time_to_detect; keep false in production. */
export const DETECT_TIMING_DEBUG = false;

let detectOriginMs: number | null = null;

export function markDetectOrigin(): void {
  if (!DETECT_TIMING_DEBUG) return;
  detectOriginMs = performance.now();
}

export function reportDetectSuspected(): void {
  if (!DETECT_TIMING_DEBUG || detectOriginMs === null) return;
  const elapsed = Math.round(performance.now() - detectOriginMs);
  const status = elapsed < 2000 ? "PASS" : elapsed > 2500 ? "FAIL" : "WARN";
  console.log(`DETECT: ${elapsed}ms (${status})`);
}

export function clearDetectOrigin(): void {
  detectOriginMs = null;
}

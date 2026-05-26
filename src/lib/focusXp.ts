import type { FocusRank } from "./types";

export const XP_PER_FOCUS_MINUTE = 1;

/** Session-local rank thresholds (minutes of focus ≈ XP). */
const OFFICER_XP = 30;
const CHIEF_XP = 60;

export function xpFromFocusMinutes(minutes: number): number {
  return Math.max(0, Math.floor(minutes) * XP_PER_FOCUS_MINUTE);
}

export function focusRankFromXp(xp: number): FocusRank {
  if (xp >= CHIEF_XP) return "Chief";
  if (xp >= OFFICER_XP) return "Officer";
  return "Cadet";
}

export function focusRankLabel(rank: FocusRank): string {
  return rank;
}

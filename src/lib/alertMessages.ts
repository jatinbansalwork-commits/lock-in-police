import { OFFICER_LINES_BY_VIOLATION } from "./constants";
import type { SirenIntensity } from "./types";

const ALERT_MESSAGES_TIER1 = [
  "Focus breach detected.",
  "Attention diverted.",
  "Return to active duty.",
  "Work mode interrupted.",
] as const;

const ALERT_MESSAGES_TIER2 = [
  "Mission compromised.",
  "Device detected again.",
  "The squad noticed.",
  "Stay locked in.",
] as const;

const ALERT_MESSAGES_TIER3 = [
  "Tiny glowing rectangle identified.",
  "Third distraction logged.",
  "Officer is not amused.",
  "Lock-in status: critical.",
] as const;

const POOLS: Record<SirenIntensity, readonly string[]> = {
  soft: ALERT_MESSAGES_TIER1,
  strong: ALERT_MESSAGES_TIER2,
  max: ALERT_MESSAGES_TIER3,
};

export function pickAlertMessage(
  previous: string | null,
  intensity: SirenIntensity
): string {
  const pool = POOLS[intensity];
  const choices = pool.filter((m) => m !== previous);
  const list = choices.length > 0 ? choices : [...pool];
  return list[Math.floor(Math.random() * list.length)] ?? pool[0];
}

export function pickOfficerLine(
  violation: 1 | 2 | 3,
  previous: string | null
): string {
  const pool = OFFICER_LINES_BY_VIOLATION[violation];
  const choices = pool.filter((m) => m !== previous);
  const list = choices.length > 0 ? choices : [...pool];
  return list[Math.floor(Math.random() * list.length)] ?? pool[0];
}

import { MAX_MINUTES, MIN_MINUTES } from "./constants";

export function formatTimerDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function clampMinutes(value: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.floor(value) || MIN_MINUTES));
}

export function isValidMinutesInput(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return false;
  return n >= MIN_MINUTES && n <= MAX_MINUTES;
}

export function parseMinutesInput(raw: string): number {
  return clampMinutes(Number(raw.trim()));
}

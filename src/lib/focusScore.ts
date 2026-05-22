import type { FocusScoreLabel } from "./types";

export function computeFocusScore(
  violations: number,
  interruptions: number,
  completed: boolean
): number {
  let score = 100 - violations * 10 - interruptions * 5;
  if (completed) score += 5;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function focusScoreLabel(score: number): FocusScoreLabel {
  if (score >= 90) return "Elite Focus";
  if (score >= 75) return "Strong";
  if (score >= 50) return "Distracted";
  return "Arrested";
}

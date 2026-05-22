export const ALERT_MESSAGES = [
  "Focus breach detected.",
  "Attention diverted.",
  "Return to active duty.",
  "Mission compromised.",
  "Device detected.",
  "The squad noticed.",
  "Stay locked in.",
  "Work mode interrupted.",
  "Tiny glowing rectangle identified.",
  "Back to mission.",
] as const;

export function pickAlertMessage(previous: string | null): string {
  const pool = ALERT_MESSAGES.filter((m) => m !== previous);
  const choices = pool.length > 0 ? pool : [...ALERT_MESSAGES];
  return choices[Math.floor(Math.random() * choices.length)] ?? ALERT_MESSAGES[0];
}

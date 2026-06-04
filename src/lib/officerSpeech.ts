import type { MascotState } from "./types";

/** Stable SSR / first-paint line — must match server and client before mount */
export const DEFAULT_MASCOT_MESSAGE = "Ready when you are.";

const LINES: Record<MascotState, readonly string[]> = {
  IDLE: ["Stay focused.", "Ready when you are.", "Lock in soon."],
  LOCKED_IN: ["Eyes on work.", "Stay focused.", "Good discipline."],
  WATCHING: ["I'm watching.", "Phone detected?", "Stay sharp."],
  ALERT: ["Phone detected.", "Put it away.", "Focus breach."],
  RECOVERY: ["Recovered.", "Back on duty.", "Prove it."],
};

const lastByState = new Map<MascotState, string>();

export function pickOfficerSpeech(state: MascotState): string {
  const pool = LINES[state];
  const prev = lastByState.get(state);
  const choices = pool.filter((l) => l !== prev);
  const line =
    choices[Math.floor(Math.random() * choices.length)] ??
    pool[0] ??
    "Stay focused.";
  lastByState.set(state, line);
  return line;
}

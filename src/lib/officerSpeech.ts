import type { MascotState } from "./types";

const LINES: Record<MascotState, readonly string[]> = {
  IDLE: ["Stay focused.", "Ready when you are.", "Lock in soon."],
  LOCKED_IN: ["Eyes on work.", "Stay focused.", "Good discipline."],
  WATCHING: ["I'm watching.", "Phone detected?", "Stay sharp."],
  ALERT: ["Phone detected.", "Put it away.", "Focus breach."],
  RECOVERY: ["Recovered.", "Back on duty.", "Prove it."],
  STRICT: ["No excuses.", "Strict mode.", "Eyes on work."],
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

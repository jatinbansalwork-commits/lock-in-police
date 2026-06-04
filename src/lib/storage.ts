const PREFIX = "lockin_police_";

export type ActiveSessionSnapshot = {
  state: string;
  secondsLeft: number;
  violations: number;
  interruptions: number;
  initialSeconds: number;
  focusSeconds: number;
  longestStreakSeconds: number;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function loadTotalCaptures(): number {
  return read("total_captures", 0);
}

export function incrementTotalCaptures(): number {
  const next = loadTotalCaptures() + 1;
  write("total_captures", next);
  return next;
}

export function loadActiveSession(): ActiveSessionSnapshot | null {
  return read<ActiveSessionSnapshot | null>("active_session", null);
}

export function saveActiveSession(snapshot: ActiveSessionSnapshot | null): void {
  if (!snapshot) {
    clearActiveSession();
    return;
  }
  write("active_session", snapshot);
}

export function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREFIX + "active_session");
}

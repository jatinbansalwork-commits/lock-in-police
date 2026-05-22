const PREFIX = "lockin_police_";

export type DailyRecord = {
  dateKey: string;
  sessions: number;
  focusedMinutes: number;
  violations: number;
  streak: number;
  lastSessionDate: string | null;
};

export type PersistedSettings = {
  strictMode: boolean;
};

export type ActiveSessionSnapshot = {
  state: string;
  secondsLeft: number;
  violations: number;
  interruptions: number;
  initialSeconds: number;
  focusSeconds: number;
  longestStreakSeconds: number;
};

const DEFAULT_DAILY: DailyRecord = {
  dateKey: "",
  sessions: 0,
  focusedMinutes: 0,
  violations: 0,
  streak: 0,
  lastSessionDate: null,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

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

export function loadSettings(): PersistedSettings {
  return read("settings", { strictMode: false });
}

export function saveSettings(settings: PersistedSettings): void {
  write("settings", settings);
}

export function loadTotalCaptures(): number {
  return read("total_captures", 0);
}

export function incrementTotalCaptures(): number {
  const next = loadTotalCaptures() + 1;
  write("total_captures", next);
  return next;
}

export function loadDailyRecord(): DailyRecord {
  const stored = read<DailyRecord>("daily", DEFAULT_DAILY);
  const key = todayKey();
  if (stored.dateKey === key) return stored;
  return { ...DEFAULT_DAILY, dateKey: key };
}

export function saveDailyRecord(record: DailyRecord): void {
  write("daily", { ...record, dateKey: todayKey() });
}

export function recordCompletedSession(
  focusedMinutes: number,
  violations: number
): DailyRecord {
  const prev = loadDailyRecord();
  const key = todayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  let streak = prev.streak;
  if (prev.lastSessionDate === key) {
    streak = Math.max(streak, 1);
  } else if (prev.lastSessionDate === yesterdayKey) {
    streak = prev.streak + 1;
  } else {
    streak = 1;
  }

  const next: DailyRecord = {
    dateKey: key,
    sessions: prev.sessions + 1,
    focusedMinutes: prev.focusedMinutes + focusedMinutes,
    violations: prev.violations + violations,
    streak,
    lastSessionDate: key,
  };
  saveDailyRecord(next);
  return next;
}

export function loadActiveSession(): ActiveSessionSnapshot | null {
  return read<ActiveSessionSnapshot | null>("active_session", null);
}

export function saveActiveSession(snapshot: ActiveSessionSnapshot | null): void {
  if (!snapshot) {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PREFIX + "active_session");
    }
    return;
  }
  write("active_session", snapshot);
}

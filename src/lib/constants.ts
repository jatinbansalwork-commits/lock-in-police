export const MIN_MINUTES = 5;
export const MAX_MINUTES = 180;
export const PHONE_CONFIDENCE_MIN = 0.75;
export const PHONE_DEBOUNCE_MS = 1200;
export const PHONE_WARNING_DURATION_MS = 1000;
export const PHONE_DETECT_INTERVAL_MS = 200;
export const PHONE_MIN_AREA_RATIO = 0.02;
export const RECOVERY_DURATION_MS = 3000;
export const SURVEILLANCE_FREEZE_MS = 150;
export const SURVEILLANCE_RESUME_MS = 400;

export const VOICE_LINES = [
  "HEY.",
  "Put the phone down.",
  "You said you were locking in.",
  "Back to work.",
] as const;

export const ALERT_VOICE_LINES = VOICE_LINES;

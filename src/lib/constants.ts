export const MIN_MINUTES = 5;
export const MAX_MINUTES = 180;

/** Minimum model score for a frame to count as phone-present. */
export const PHONE_THRESHOLD = 0.6;
export const PHONE_CONFIDENCE_MIN = PHONE_THRESHOLD;

export const PHONE_DETECT_INTERVAL_MS = 150;
export const PHONE_HISTORY_WINDOW = 8;
export const PHONE_HISTORY_POSITIVE_MIN = 4;
export const PHONE_CONSECUTIVE_REQUIRED = 3;

export const PHONE_SUSPECT_MS = 500;
export const PHONE_CONFIRM_MS = 1400;
export const PHONE_LOST_MS = 1500;

export const PHONE_MIN_AREA_RATIO = 0.008;
export const PHONE_MAX_AREA_RATIO = 0.55;
export const PHONE_BBOX_IOU_MIN = 0.08;
export const PHONE_MODEL_MIN_SCORE = 0.35;

export const RECOVERY_FEEDBACK_MS = 800;
export const SURVEILLANCE_FREEZE_MS = 150;
export const SURVEILLANCE_RESUME_MS = 400;

export const SIREN_PEAK_SOFT = 0.55;
export const SIREN_PEAK_STRONG = 0.8;
export const SIREN_FADE_IN_MS = 250;
export const SIREN_FADE_OUT_MS = 250;

export const VOICE_LINES = [
  "HEY.",
  "Put the phone down.",
  "You said you were locking in.",
  "Back to work.",
] as const;

export const ALERT_VOICE_LINES = VOICE_LINES;

export const OFFICER_LINES_BY_VIOLATION: Record<1 | 2 | 3, readonly string[]> = {
  1: ["Back on duty.", "Focus restored.", "Eyes forward."],
  2: ["Phone again?", "Second warning.", "Still watching."],
  3: ["Eyes on the mission.", "Third strike.", "No more slabs."],
};

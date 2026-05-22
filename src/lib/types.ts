export type AlertState = "IDLE" | "DETECTING" | "ALERT" | "RECOVERING";

export type SessionState =
  | "IDLE"
  | "LOCKED_IN"
  | "PHONE_SUSPECTED"
  | "PHONE_CONFIRMED"
  | "ALERT"
  | "RECOVERY"
  | "SESSION_COMPLETE"
  | "SESSION_TERMINATED";

export type MascotState =
  | "IDLE"
  | "LOCKED_IN"
  | "WATCHING"
  | "ALERT"
  | "RECOVERY"
  | "STRICT";

export type FocusScoreLabel =
  | "Elite Focus"
  | "Strong"
  | "Distracted"
  | "Arrested";

export type CameraSessionStatus = "ready" | "locked-in" | "phone-found";

export type OfficerMood = "calm" | "watch" | "alert";

export type SessionSummary = {
  focusScore: number;
  focusLabel: FocusScoreLabel;
  pickups: number;
  longestStreakMinutes: number;
  interruptions: number;
};

export type OfficerVariant = "idle" | "watching" | "alert" | "recovered";

export type CameraState =
  | "ready"
  | "active"
  | "phone-suspected"
  | "alert"
  | "recovered";

export type ConfidenceLevel = "none" | "low" | "medium" | "high";

export type SurveillancePhase = "live" | "snapshot" | "darken";

export type DetectionSignal = {
  smoothedPositive: boolean;
  confidence: number;
  progress: number;
};

export type SirenIntensity = "soft" | "strong" | "max";

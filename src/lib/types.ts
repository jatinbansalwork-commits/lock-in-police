export type SessionState =
  | "IDLE"
  | "LOCKED_IN"
  | "PHONE_WARNING"
  | "ALERT"
  | "RECOVERY";

export type OfficerVariant = "idle" | "watching" | "alert" | "recovered";

export type CameraState =
  | "ready"
  | "active"
  | "phone-found"
  | "alert"
  | "recovered";

export type SurveillancePhase = "live" | "snapshot" | "darken";

export type DetectionDebug = {
  phone: boolean;
  confidence: number;
};

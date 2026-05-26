export type OffenseSeverity =
  | "clean"
  | "warning"
  | "distracted"
  | "criminal";

export function offenseSeverity(count: number): OffenseSeverity {
  if (count <= 0) return "clean";
  if (count <= 2) return "warning";
  if (count <= 4) return "distracted";
  return "criminal";
}

export function offenseSeverityLabel(severity: OffenseSeverity): string {
  switch (severity) {
    case "clean":
      return "Clean";
    case "warning":
      return "Warning";
    case "distracted":
      return "Distracted";
    case "criminal":
      return "Criminal";
  }
}

/** Progressive enforcement: 1 soft → 2 strong siren → 3 full red ambient */
export function sirenIntensityForViolation(
  count: number
): "soft" | "strong" | "max" {
  if (count >= 3) return "max";
  if (count >= 2) return "strong";
  return "soft";
}

export function sirenVolumeScale(count: number): number {
  if (count >= 3) return 1.1;
  if (count >= 2) return 1;
  return 0.52;
}

export function alertPulseClass(count: number): string {
  if (count >= 3) return "siren-ambient-active siren-ambient--max";
  if (count >= 2) return "siren-ambient-active siren-ambient--strong";
  return "";
}

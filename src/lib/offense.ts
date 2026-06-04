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

export function sirenIntensityForViolation(
  count: number
): "soft" | "strong" | "max" {
  if (count >= 5) return "max";
  if (count >= 2) return "strong";
  return "soft";
}

/** Volume multiplier: violation 3+ → ~10% louder peak */
export function sirenVolumeScale(count: number): number {
  if (count >= 3) return 1.1;
  return 1;
}

export function alertPulseClass(count: number): string {
  if (count >= 5) return "siren-ambient-active siren-ambient--max";
  if (count >= 3) return "siren-ambient-active siren-ambient--strong";
  return "siren-ambient-active";
}

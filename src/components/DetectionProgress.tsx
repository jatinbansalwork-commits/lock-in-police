"use client";

const BARS = 5;

export function DetectionProgress({ progress }: { progress: number }) {
  const filled = Math.min(BARS, Math.max(0, progress));

  return (
    <div
      className="detection-progress"
      role="status"
      aria-live="polite"
      aria-label={`Detecting phone, ${filled} of ${BARS} signals`}
    >
      <span className="detection-progress__label">Detecting…</span>
      <div className="detection-progress__bars" aria-hidden>
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            className={`detection-progress__bar ${
              i < filled ? "detection-progress__bar--on" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}

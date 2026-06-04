"use client";

import { memo } from "react";
import { RECOVERY_SECONDS } from "@/lib/constants";

function RecoveryPanelInner({
  secondsElapsed,
}: {
  secondsElapsed: number;
}) {
  const filled = Math.min(RECOVERY_SECONDS, Math.max(0, secondsElapsed));
  const blocks = 10;

  return (
    <div className="recovery-panel" role="status" aria-live="polite">
      <p className="recovery-panel__title">Focus Recovery</p>
      <div className="recovery-panel__bar" aria-hidden>
        {Array.from({ length: blocks }, (_, i) => (
          <span
            key={i}
            className={`recovery-panel__block ${
              i < filled ? "recovery-panel__block--on" : ""
            }`}
          />
        ))}
      </div>
      <p className="recovery-panel__count tabular-nums">
        {filled} / {RECOVERY_SECONDS}
      </p>
      <p className="recovery-panel__hint">Keep phone out of frame</p>
    </div>
  );
}

export const RecoveryPanel = memo(RecoveryPanelInner);

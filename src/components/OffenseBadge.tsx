"use client";

import { memo } from "react";
import {
  offenseSeverity,
  offenseSeverityLabel,
} from "@/lib/offense";

function OffenseBadgeInner({ violations }: { violations: number }) {
  const severity = offenseSeverity(violations);
  const label = offenseSeverityLabel(severity);

  return (
    <div
      className={`offense-badge offense-badge--${severity}`}
      role="status"
      aria-live="polite"
    >
      <span className="offense-badge__icon" aria-hidden>
        🚨
      </span>
      <span className="offense-badge__text">
        Violations: <strong className="tabular-nums">{violations}</strong>
      </span>
      <span className="offense-badge__severity">{label}</span>
    </div>
  );
}

export const OffenseBadge = memo(OffenseBadgeInner);

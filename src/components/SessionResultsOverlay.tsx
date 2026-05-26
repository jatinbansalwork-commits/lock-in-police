"use client";

import { memo } from "react";
import type { SessionSummary } from "@/lib/types";
import { focusRankLabel } from "@/lib/focusXp";

function SessionResultsOverlayInner({
  summary,
  variant = "complete",
  onPatrolAgain,
}: {
  summary: SessionSummary;
  variant?: "complete" | "terminated";
  onPatrolAgain: () => void;
}) {
  const title = variant === "terminated" ? "SESSION ENDED" : "LOCKED IN";

  return (
    <div
      className={`session-results-overlay session-results-overlay--${variant}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-results-title"
    >
      <div className="session-results-overlay__panel glass-card--elev-medium">
        <p className="session-results-overlay__eyebrow">
          {variant === "terminated" ? "Strict mode" : "Session complete"}
        </p>
        <h2 id="session-results-title" className="session-results-overlay__title">
          {title}
        </h2>

        <dl className="session-results-overlay__stats">
          <div className="session-results-overlay__row">
            <dt>Focus Time</dt>
            <dd className="tabular-nums">{summary.focusMinutes} min</dd>
          </div>
          <div className="session-results-overlay__row">
            <dt>Violations</dt>
            <dd className="tabular-nums">{summary.pickups}</dd>
          </div>
          <div className="session-results-overlay__row session-results-overlay__row--score">
            <dt>Score</dt>
            <dd className="tabular-nums">{summary.focusScore}</dd>
          </div>
        </dl>

        <p className="session-results-overlay__xp tabular-nums" aria-label="Focus experience">
          +{summary.xp} XP · {focusRankLabel(summary.rank)}
        </p>

        <button
          type="button"
          onClick={onPatrolAgain}
          className="session-results-overlay__cta btn-lift"
        >
          PATROL AGAIN
        </button>
      </div>
    </div>
  );
}

export const SessionResultsOverlay = memo(SessionResultsOverlayInner);

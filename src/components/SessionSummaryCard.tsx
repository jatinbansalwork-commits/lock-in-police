"use client";

import { memo } from "react";
import type { SessionSummary } from "@/lib/types";
import { BentoCard } from "./BentoCard";

function SessionSummaryCardInner({
  summary,
  onDone,
}: {
  summary: SessionSummary;
  onDone: () => void;
}) {
  return (
    <BentoCard className="dash-slot-card session-summary-card glass-card--elev-medium">
      <header className="dash-slot-card__header">
        <h2 className="dash-slot-card__title">Session Complete</h2>
      </header>

      <div className="dash-slot-card__body">
        <section
          className="session-summary-card__score"
          aria-labelledby="session-summary-focus-label"
        >
          <p id="session-summary-focus-label" className="session-summary-card__score-label">
            Focus score
          </p>
          <p className="session-summary-card__score-value tabular-nums">
            {summary.focusScore}
            <span className="session-summary-card__score-max">/100</span>
          </p>
          <p className="session-summary-card__score-tier">{summary.focusLabel}</p>
        </section>

        <dl className="session-summary-card__metrics">
          <div className="session-summary-card__row">
            <dt>Phone pickups</dt>
            <dd className="tabular-nums">{summary.pickups}</dd>
          </div>
          <div className="session-summary-card__row">
            <dt>Longest streak</dt>
            <dd className="tabular-nums">{summary.longestStreakMinutes} min</dd>
          </div>
        </dl>
      </div>

      <div className="dash-slot-card__actions">
        <button type="button" onClick={onDone} className="app-btn app-btn--primary">
          Done
        </button>
      </div>
    </BentoCard>
  );
}

export const SessionSummaryCard = memo(SessionSummaryCardInner);

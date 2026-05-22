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
    <BentoCard className="session-summary-card glass-card--elev-medium">
      <p className="session-summary-card__label">Session</p>

      <div className="session-summary-card__hero">
        <h2 className="session-summary-card__title">Session Complete</h2>

        <div className="session-summary-card__score-block">
          <p className="session-summary-card__score-label">Focus Score</p>
          <p className="session-summary-card__score tabular-nums">
            {summary.focusScore}
            <span className="session-summary-card__score-max"> / 100</span>
          </p>
          <p className="session-summary-card__score-tier">{summary.focusLabel}</p>
        </div>

        <dl className="session-summary-card__stats">
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

      <div className="session-summary-card__actions">
        <button
          type="button"
          onClick={onDone}
          className="session-summary-card__done btn-lift"
        >
          Done
        </button>
      </div>
    </BentoCard>
  );
}

export const SessionSummaryCard = memo(SessionSummaryCardInner);

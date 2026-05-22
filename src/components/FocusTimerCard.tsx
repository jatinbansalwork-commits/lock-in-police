"use client";

import { memo } from "react";
import { BentoCard } from "./BentoCard";
import { CountdownDisplay } from "./CountdownDisplay";
import { MAX_MINUTES, MIN_MINUTES } from "@/lib/constants";

type FocusTimerCardProps = {
  isLanding: boolean;
  isActive: boolean;
  justLocked: boolean;
  minutesInput: string;
  secondsLeft: number;
  lockInEnabled: boolean;
  onMinutesInputChange: (value: string) => void;
  onLockIn: () => void;
  onStopSession: () => void;
};

function FocusTimerCardInner({
  isLanding,
  isActive,
  justLocked,
  minutesInput,
  secondsLeft,
  lockInEnabled,
  onMinutesInputChange,
  onLockIn,
  onStopSession,
}: FocusTimerCardProps) {
  return (
    <BentoCard
      className={`timer-card ${isActive ? "timer-card--locked" : ""} ${
        justLocked ? "timer-card--lock-pulse" : ""
      }`}
    >
      <p className="timer-card__label">Don&apos;t touch it</p>

      <div className="timer-card__hero">
        <h2 className="timer-card__title">Focus Timer</h2>

        {isLanding ? (
          <label className="timer-card__minutes" htmlFor="minutes">
            <input
              id="minutes"
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={minutesInput}
              placeholder="Enter minutes"
              onChange={(e) => onMinutesInputChange(e.target.value)}
              className="timer-card__minutes-input tabular-nums"
            />
          </label>
        ) : (
          <div className="timer-card__display">
            <CountdownDisplay seconds={secondsLeft} />
          </div>
        )}
      </div>

      <div className="timer-card__actions">
        {isLanding ? (
          <button
            type="button"
            onClick={onLockIn}
            disabled={!lockInEnabled}
            className="timer-card__lock-btn btn-lift"
          >
            LOCK IN
          </button>
        ) : (
          <button
            type="button"
            onClick={onStopSession}
            className="timer-card__stop-session btn-lift"
          >
            Stop Session
          </button>
        )}
      </div>
    </BentoCard>
  );
}

export const FocusTimerCard = memo(FocusTimerCardInner);

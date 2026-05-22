"use client";

import { memo } from "react";
import { BentoCard } from "./BentoCard";
import { CountdownDisplay } from "./CountdownDisplay";
import { RecoveryPanel } from "./RecoveryPanel";
import { MAX_MINUTES, MIN_MINUTES } from "@/lib/constants";

type FocusTimerCardProps = {
  isLanding: boolean;
  isActive: boolean;
  isRecovering?: boolean;
  recoveryElapsed?: number;
  timerPaused?: boolean;
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
  isRecovering = false,
  recoveryElapsed = 0,
  timerPaused = false,
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
      className={`timer-card glass-card--elev-medium timer-card--priority ${isActive ? "timer-card--locked" : ""} ${
        timerPaused ? "timer-card--paused" : ""
      } ${justLocked ? "timer-card--lock-pulse" : ""}`}
    >
      <p className="timer-card__label">Don&apos;t touch it</p>

      <div className="timer-card__hero">
        <h2 className="timer-card__title">Focus Timer</h2>

        {isRecovering ? (
          <RecoveryPanel secondsElapsed={recoveryElapsed} />
        ) : isLanding ? (
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

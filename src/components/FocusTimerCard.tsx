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
      className={`dash-slot-card timer-card glass-card--elev-medium timer-card--priority ${isActive ? "timer-card--locked" : ""} ${
        timerPaused ? "timer-card--paused" : ""
      } ${justLocked ? "timer-card--lock-pulse" : ""}`}
    >
      <header className="dash-slot-card__header">
        <h2 className="dash-slot-card__title">Focus Timer</h2>
      </header>

      <div className="dash-slot-card__body">
        {isRecovering ? (
          <RecoveryPanel secondsElapsed={recoveryElapsed} />
        ) : isLanding ? (
          <div className="timer-card__minutes">
            <label className="timer-card__minutes-label" htmlFor="minutes">
              Minutes
            </label>
            <div className="timer-card__minutes-field">
              <input
                id="minutes"
                type="number"
                inputMode="numeric"
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                value={minutesInput}
                placeholder={String(MIN_MINUTES)}
                onChange={(e) => onMinutesInputChange(e.target.value)}
                className="timer-card__minutes-input tabular-nums"
                aria-describedby="minutes-hint"
              />
              <span className="timer-card__minutes-unit" aria-hidden>
                min
              </span>
            </div>
            <p id="minutes-hint" className="timer-card__minutes-hint">
              {MIN_MINUTES}–{MAX_MINUTES} minutes
            </p>
          </div>
        ) : (
          <div className="timer-card__display">
            <CountdownDisplay seconds={secondsLeft} />
          </div>
        )}
      </div>

      <div className="dash-slot-card__actions">
        {isLanding ? (
          <button
            type="button"
            onClick={onLockIn}
            disabled={!lockInEnabled}
            className="app-btn app-btn--brand"
          >
            Lock in
          </button>
        ) : (
          <button
            type="button"
            onClick={onStopSession}
            className="app-btn app-btn--destructive"
          >
            End session
          </button>
        )}
      </div>
    </BentoCard>
  );
}

export const FocusTimerCard = memo(FocusTimerCardInner);

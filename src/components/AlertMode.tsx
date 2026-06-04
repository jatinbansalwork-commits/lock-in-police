"use client";

import { SirenLight } from "./SirenLight";
import type { AlertState } from "@/lib/types";

export function AlertMode({
  alertState,
  alertMessage,
  recoveryCountdown = 0,
  violationLevel = 1,
  onBackToWork,
  onStopSession,
}: {
  alertState: AlertState;
  alertMessage: string;
  recoveryCountdown?: number;
  violationLevel?: number;
  onBackToWork: () => void;
  onStopSession: () => void;
}) {
  const open = alertState === "ALERT" || alertState === "RECOVERING";
  if (!open) return null;

  const isRecovering = alertState === "RECOVERING";
  const violation = Math.min(3, Math.max(1, violationLevel));

  return (
    <div
      className={`alert-overlay alert-overlay--open ${isRecovering ? "alert-overlay--recovering" : ""}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-card-title"
    >
      <div
        className={`alert-card alert-card--figma alert-card--siren-beat alert-card--violation-${violation} ${isRecovering ? "alert-card--recovering" : ""}`}
      >
        <div className="alert-card__siren-wrap">
          <SirenLight className="h-20 w-20" />
        </div>

        {isRecovering ? (
          <>
            <p className="alert-card__mode alert-card__mode--recovering">Recovery</p>
            <h2
              id="alert-card-title"
              className="alert-card__title alert-card__title--recovering"
            >
              Confirming focus
            </h2>
            <p
              className="alert-card__countdown tabular-nums"
              aria-live="assertive"
            >
              {recoveryCountdown > 0 ? recoveryCountdown : ""}
            </p>
            <p className="alert-card__subtitle">
              Keep your phone out of frame until the countdown finishes.
            </p>
          </>
        ) : (
          <>
            <p className="alert-card__mode">Phone spotted</p>
            <h2 id="alert-card-title" className="alert-card__title">
              Phone detected
            </h2>
            <p className="alert-card__subtitle">
              Put the phone away and return to your task.
            </p>
            <p key={alertMessage} className="alert-card__message">
              {alertMessage}
            </p>
          </>
        )}

        <div className="alert-card__actions">
          {!isRecovering ? (
            <button
              type="button"
              onClick={onBackToWork}
              className="app-btn app-btn--primary"
            >
              Back to work
            </button>
          ) : null}
          <button
            type="button"
            onClick={onStopSession}
            className="app-btn app-btn--destructive"
          >
            End session
          </button>
        </div>
      </div>
    </div>
  );
}

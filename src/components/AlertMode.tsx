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
    >
      <div
        className={`alert-card alert-card--figma alert-card--violation-${violation} ${violation >= 2 && !isRecovering ? "alert-card--siren-beat" : ""} ${isRecovering ? "alert-card--recovering" : ""}`}
      >
        <div className="alert-card__siren-wrap">
          <SirenLight className="h-20 w-20" />
        </div>

        {isRecovering ? (
          <>
            <p className="alert-card__mode alert-card__mode--recovering">
              Recovery
            </p>
            <h2 className="alert-card__title alert-card__title--recovering">
              🟡 Confirming focus...
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
            <p className="alert-card__mode">Alert mode</p>
            <h2 className="alert-card__title">🚨 PHONE DETECTED</h2>
            <p className="alert-card__subtitle">
              Put the slab away and return to your duties.
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
              className="alert-card__btn alert-card__btn--primary btn-lift"
            >
              I&apos;m back to work
            </button>
          ) : null}
          <button
            type="button"
            onClick={onStopSession}
            className="alert-card__btn alert-card__btn--secondary btn-lift"
          >
            Stop Session
          </button>
        </div>
      </div>
    </div>
  );
}

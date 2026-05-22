"use client";

import { SirenLight } from "./SirenLight";

export function AlertMode({
  open,
  alertMessage,
  violationLevel = 1,
  onBackToWork,
  onStopSession,
}: {
  open: boolean;
  alertMessage: string;
  violationLevel?: number;
  onBackToWork: () => void;
  onStopSession: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="alert-overlay alert-overlay--open"
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className={`alert-card alert-card--figma alert-card--siren-beat alert-card--violation-${Math.min(3, Math.max(1, violationLevel))}`}
      >
        <div className="alert-card__siren-wrap">
          <SirenLight className="h-20 w-20" />
        </div>

        <p className="alert-card__mode">Alert mode</p>

        <h2 className="alert-card__title">Phone detected</h2>
        <p className="alert-card__subtitle">
          Put the slab away and return to your duties.
        </p>

        <p key={alertMessage} className="alert-card__message">
          {alertMessage}
        </p>

        <div className="alert-card__actions">
          <button
            type="button"
            onClick={onBackToWork}
            className="alert-card__btn alert-card__btn--primary btn-lift"
          >
            I&apos;m back to work
          </button>
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

"use client";

import { memo } from "react";
import { BentoCard } from "./BentoCard";

function SessionTerminatedCardInner({ onDone }: { onDone: () => void }) {
  return (
    <BentoCard className="session-terminated-card glass-card--elev-medium">
      <p className="session-terminated-card__label">Strict Mode</p>
      <div className="session-terminated-card__hero">
        <h2 className="session-terminated-card__title">Session Terminated</h2>
        <p className="session-terminated-card__message">Too many violations.</p>
      </div>
      <div className="session-terminated-card__actions">
        <button
          type="button"
          onClick={onDone}
          className="session-terminated-card__done btn-lift"
        >
          Done
        </button>
      </div>
    </BentoCard>
  );
}

export const SessionTerminatedCard = memo(SessionTerminatedCardInner);

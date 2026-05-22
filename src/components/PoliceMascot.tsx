"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import { POLICE_MAN_ALERT, POLICE_MAN_IDLE } from "@/lib/assets";
import { pickOfficerSpeech } from "@/lib/officerSpeech";
import type { MascotState } from "@/lib/types";

function PoliceMascotInner({
  state,
  strictMode = false,
  violationCount = 0,
}: {
  state: MascotState;
  strictMode?: boolean;
  violationCount?: number;
}) {
  const resolvedState: MascotState =
    strictMode && violationCount >= 2 && state !== "IDLE"
      ? "STRICT"
      : state;

  const src =
    resolvedState === "ALERT" || resolvedState === "STRICT"
      ? POLICE_MAN_ALERT
      : POLICE_MAN_IDLE;

  const speech = useMemo(
    () => pickOfficerSpeech(resolvedState),
    [resolvedState]
  );

  return (
    <div className="police-mascot-wrap">
      <div
        className={`officer-companion officer-companion--state-${resolvedState.toLowerCase()}`}
      >
        <Image
          src={src}
          alt=""
          width={180}
          height={180}
          className="officer-asset pointer-events-none object-contain"
          priority
        />
        {resolvedState === "WATCHING" && (
          <>
            <span className="officer-eye-shift officer-eye-shift--left" />
            <span className="officer-eye-shift officer-eye-shift--right" />
          </>
        )}
        {resolvedState === "ALERT" && (
          <span className="officer-siren-reflection" aria-hidden />
        )}
      </div>
      <p className="police-card__speech" key={speech}>
        {speech}
      </p>
    </div>
  );
}

export const PoliceMascot = memo(PoliceMascotInner);

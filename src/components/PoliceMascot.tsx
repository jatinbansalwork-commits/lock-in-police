"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { POLICE_MAN_ALERT, POLICE_MAN_IDLE } from "@/lib/assets";
import {
  DEFAULT_MASCOT_MESSAGE,
  pickOfficerSpeech,
} from "@/lib/officerSpeech";
import type { MascotState } from "@/lib/types";

function PoliceMascotInner({
  state,
}: {
  state: MascotState;
}) {
  const src =
    state === "ALERT" ? POLICE_MAN_ALERT : POLICE_MAN_IDLE;

  const [mounted, setMounted] = useState(false);
  const [speech, setSpeech] = useState(DEFAULT_MASCOT_MESSAGE);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setSpeech(pickOfficerSpeech(state));
  }, [mounted, state]);

  return (
    <div className="police-mascot-wrap">
      <div
        className={`officer-companion officer-companion--state-${state.toLowerCase()}`}
      >
        <Image
          src={src}
          alt=""
          width={180}
          height={180}
          className="officer-asset pointer-events-none object-contain"
          priority
        />
        {state === "WATCHING" && (
          <>
            <span className="officer-eye-shift officer-eye-shift--left" />
            <span className="officer-eye-shift officer-eye-shift--right" />
          </>
        )}
        {state === "ALERT" && (
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

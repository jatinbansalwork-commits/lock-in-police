"use client";

import Image from "next/image";
import { POLICE_MAN_ALERT, POLICE_MAN_IDLE } from "@/lib/assets";
import type { OfficerVariant } from "@/lib/types";

export function PoliceMascot({
  variant = "idle",
}: {
  variant?: OfficerVariant;
}) {
  const src = variant === "alert" ? POLICE_MAN_ALERT : POLICE_MAN_IDLE;

  return (
    <div className={`officer-companion officer-companion--${variant}`}>
      <Image
        src={src}
        alt=""
        width={180}
        height={180}
        className="officer-asset pointer-events-none object-contain"
        priority
      />
      {variant === "watching" && (
        <>
          <span className="officer-blink officer-blink--left" />
          <span className="officer-blink officer-blink--right" />
        </>
      )}
    </div>
  );
}

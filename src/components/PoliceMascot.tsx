"use client";

import Image from "next/image";
import { POLICE_MAN_ALERT, POLICE_MAN_IDLE } from "@/lib/assets";
import type { OfficerMood, OfficerVariant } from "@/lib/types";

function moodFromPickups(pickups: number): OfficerMood {
  if (pickups >= 3) return "alert";
  if (pickups >= 1) return "watch";
  return "calm";
}

export function PoliceMascot({
  variant = "idle",
  pickupCount = 0,
}: {
  variant?: OfficerVariant;
  pickupCount?: number;
}) {
  const src = variant === "alert" ? POLICE_MAN_ALERT : POLICE_MAN_IDLE;
  const mood =
    variant === "alert" || variant === "watching"
      ? variant === "alert"
        ? "alert"
        : "watch"
      : moodFromPickups(pickupCount);

  const moodEmoji =
    mood === "alert" ? "🚨" : mood === "watch" ? "👀" : "🙂";

  return (
    <div
      className={`officer-companion officer-companion--${variant} officer-companion--mood-${mood}`}
    >
      <span className="officer-mood-emoji" aria-hidden>
        {moodEmoji}
      </span>
      <Image
        src={src}
        alt=""
        width={180}
        height={180}
        className="officer-asset pointer-events-none object-contain"
        priority
      />
    </div>
  );
}

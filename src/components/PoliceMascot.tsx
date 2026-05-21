"use client";

import { motion } from "framer-motion";
import type { MascotState } from "@/lib/types";

const STATE_EMOJI: Record<MascotState, string> = {
  idle: "👮",
  looking: "👮‍♂️",
  angry: "🚔",
  siren: "🚨",
};

const STATE_SCALE: Record<MascotState, number> = {
  idle: 1,
  looking: 1.05,
  angry: 1.12,
  siren: 1.35,
};

type Props = {
  state?: MascotState;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASS = {
  sm: "text-4xl",
  md: "text-6xl",
  lg: "text-8xl",
  xl: "text-[10rem] leading-none",
};

export function PoliceMascot({
  state = "idle",
  size = "md",
  className = "",
}: Props) {
  const isSiren = state === "siren";
  const isAngry = state === "angry" || isSiren;

  return (
    <motion.div
      className={`relative inline-flex select-none ${className}`}
      animate={{
        y: isSiren ? [0, -6, 0] : [0, -8, 0],
        scale: STATE_SCALE[state],
        rotate: isAngry ? [-2, 2, -2] : 0,
      }}
      transition={{
        y: { duration: isSiren ? 0.35 : 3.5, repeat: Infinity, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 200, damping: 18 },
        rotate: isAngry
          ? { duration: 0.25, repeat: Infinity }
          : { duration: 0 },
      }}
    >
      {isSiren && (
        <motion.span
          className="absolute -inset-4 rounded-full bg-warning/20 blur-xl"
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
      <span
        className={`${SIZE_CLASS[size]} drop-shadow-[0_0_24px_rgba(255,107,107,0.35)]`}
        role="img"
        aria-label="Lock-In Police officer"
      >
        {STATE_EMOJI[state]}
      </span>
      {state === "idle" && (
        <motion.span
          className="absolute -right-1 -top-1 text-lg"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨
        </motion.span>
      )}
      {(state === "looking" || state === "angry") && (
        <motion.span
          className="absolute -right-6 top-0 text-2xl"
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          👀
        </motion.span>
      )}
    </motion.div>
  );
}

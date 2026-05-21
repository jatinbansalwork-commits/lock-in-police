"use client";

import { motion } from "framer-motion";
import { PoliceMascot } from "./PoliceMascot";

type Props = {
  minutes: number;
  violations: number;
  focusScore: number;
  onLockInAgain: () => void;
};

export function SessionComplete({
  minutes,
  violations,
  focusScore,
  onLockInAgain,
}: Props) {
  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 18, delay: 0.2 }}
        className="text-center"
      >
        <p className="text-xs font-bold uppercase tracking-[0.5em] text-accent">
          ✓ Mission Complete
        </p>
        <h1 className="mt-4 text-6xl font-black uppercase tracking-tight text-warm-white sm:text-8xl">
          Case Closed
        </h1>
      </motion.div>

      <motion.div
        className="glass mt-12 w-full max-w-xl rounded-card p-10"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 120, damping: 20 }}
      >
        <div className="grid grid-cols-3 gap-6 border-b border-white/10 pb-8 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-warm-white/40">
              Time Served
            </p>
            <p className="mt-2 text-3xl font-bold text-warm-white">{minutes} min</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-warm-white/40">
              Violations
            </p>
            <p className="mt-2 text-3xl font-bold text-warning">{violations}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-warm-white/40">
              Focus Score
            </p>
            <p className="mt-2 text-3xl font-bold text-accent">{focusScore}</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-warm-white/40">
            Police Report
          </p>
          <p className="mt-3 text-lg italic text-warm-white/70">
            &ldquo;Subject showed resistance but completed the mission.&rdquo;
          </p>
        </div>
      </motion.div>

      <motion.div
        className="mt-10"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <PoliceMascot state="idle" size="lg" />
      </motion.div>

      <motion.button
        type="button"
        onClick={onLockInAgain}
        className="mt-12 rounded-card bg-cream px-12 py-5 text-sm font-bold uppercase tracking-[0.25em] text-surface"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Lock In Again
      </motion.button>
    </motion.div>
  );
}

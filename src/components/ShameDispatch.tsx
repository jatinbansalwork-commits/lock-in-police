"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  message: string;
  onBackToWork: () => void;
  onStopSession: () => void;
};

export function ShameDispatch({
  open,
  message,
  onBackToWork,
  onStopSession,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-[80] flex justify-center p-4 pb-8 sm:p-8"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        >
          <div className="glass w-full max-w-lg rounded-card p-8 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-accent">
              Shame Dispatch
            </p>
            <p className="mt-5 text-2xl font-medium leading-snug text-warm-white sm:text-3xl">
              {message}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.button
                type="button"
                onClick={onBackToWork}
                className="flex-1 rounded-card bg-cream px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-surface transition hover:bg-white"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                I&apos;m back to work
              </motion.button>
              <motion.button
                type="button"
                onClick={onStopSession}
                className="flex-1 rounded-card border border-white/10 px-6 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-warm-white/50 transition hover:border-white/20 hover:text-warm-white/80"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Stop Session
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

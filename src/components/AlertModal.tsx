"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PoliceMascot } from "./PoliceMascot";
import { SirenOverlay } from "./SirenOverlay";

type Props = {
  open: boolean;
};

export function AlertModal({ open }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/95 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <SirenOverlay />

          <motion.div
            className="relative z-[70] flex max-w-2xl flex-col items-center text-center"
            initial={{ scale: 0.85, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            <motion.p
              className="text-sm font-bold uppercase tracking-[0.5em] text-warning"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              Alert Mode
            </motion.p>

            <motion.h2
              className="mt-4 text-5xl font-black uppercase leading-[0.95] tracking-tight text-warm-white sm:text-7xl md:text-8xl"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              Phone
              <br />
              Detected
            </motion.h2>

            <p className="mt-6 max-w-md text-lg text-warm-white/60 sm:text-xl">
              Put the slab away and return to your duties.
            </p>

            <div className="mt-10">
              <PoliceMascot state="siren" size="xl" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

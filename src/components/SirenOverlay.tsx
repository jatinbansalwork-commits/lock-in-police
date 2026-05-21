"use client";

import { motion } from "framer-motion";

export function SirenOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-warning"
        animate={{ opacity: [0.12, 0.45, 0.12] }}
        transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 bg-blue-600"
        animate={{ opacity: [0.08, 0.38, 0.08] }}
        transition={{
          duration: 0.35,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.175,
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.03) 48px, rgba(255,255,255,0.03) 96px)",
        }}
        animate={{ x: [0, 48] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

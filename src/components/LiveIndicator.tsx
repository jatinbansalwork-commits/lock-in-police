"use client";

import { motion } from "framer-motion";

export function LiveIndicator({ size = "sm" }: { size?: "sm" | "md" }) {
  const dot = size === "md" ? "h-2.5 w-2.5" : "h-1.5 w-1.5";
  const text = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <span className={`live-dot rounded-full bg-warning ${dot}`} />
      <span
        className={`font-semibold uppercase tracking-[0.35em] text-warning ${text}`}
      >
        Live
      </span>
    </motion.div>
  );
}

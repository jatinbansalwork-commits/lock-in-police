"use client";

import { useCallback, useRef } from "react";

/** Short UI click — one shot, no loop */
export function useUIClick() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playClick = useCallback(() => {
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext;
    if (!Ctx) return;

    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.04);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }, []);

  return { playClick };
}

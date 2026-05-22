"use client";

import { useCallback } from "react";

let ctx: AudioContext | null = null;

export function useRecoverySound() {
  const playRecoveryChime = useCallback(() => {
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext;
    if (!Ctx) return;

    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") void ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  }, []);

  return { playRecoveryChime };
}

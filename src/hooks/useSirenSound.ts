"use client";

import { useCallback } from "react";

const PEAK_VOLUME = 0.6;
const FADE_IN_MS = 300;
const FADE_OUT_MS = 250;
const BEEP_INTERVAL_MS = 400;

type SirenSingleton = {
  ctx: AudioContext | null;
  masterGain: GainNode | null;
  intervalId: ReturnType<typeof setInterval> | null;
  fadeFrameId: number | null;
  playing: boolean;
  high: boolean;
};

const siren: SirenSingleton = {
  ctx: null,
  masterGain: null,
  intervalId: null,
  fadeFrameId: null,
  playing: false,
  high: true,
};

function cancelFade() {
  if (siren.fadeFrameId !== null) {
    cancelAnimationFrame(siren.fadeFrameId);
    siren.fadeFrameId = null;
  }
}

function rampVolume(
  from: number,
  to: number,
  durationMs: number,
  onComplete?: () => void
) {
  const gain = siren.masterGain;
  if (!gain) {
    onComplete?.();
    return;
  }

  cancelFade();
  const start = performance.now();

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = t * (2 - t);
    gain.gain.value = from + (to - from) * eased;

    if (t < 1) {
      siren.fadeFrameId = requestAnimationFrame(step);
    } else {
      siren.fadeFrameId = null;
      gain.gain.value = to;
      onComplete?.();
    }
  };

  siren.fadeFrameId = requestAnimationFrame(step);
}

function beep(ctx: AudioContext, high: boolean) {
  const t = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "square";
  osc2.type = "sawtooth";
  osc1.frequency.value = high ? 920 : 460;
  osc2.frequency.value = high ? 690 : 345;
  gain.gain.value = 0.06;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(siren.masterGain!);
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.18);
  osc2.stop(t + 0.18);
  siren.high = !high;
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const Ctx = window.AudioContext;
  if (!Ctx) return null;

  if (!siren.ctx) {
    siren.ctx = new Ctx();
    siren.masterGain = siren.ctx.createGain();
    siren.masterGain.gain.value = 0;
    siren.masterGain.connect(siren.ctx.destination);
  }

  if (siren.ctx.state === "suspended") void siren.ctx.resume();
  return siren.ctx;
}

function startBeepLoop() {
  const ctx = siren.ctx;
  if (!ctx || siren.intervalId) return;

  const tick = () => {
    if (!siren.playing || !siren.masterGain) return;
    beep(ctx, siren.high);
  };

  tick();
  siren.intervalId = setInterval(tick, BEEP_INTERVAL_MS);
}

function haltBeepLoop() {
  if (siren.intervalId) {
    clearInterval(siren.intervalId);
    siren.intervalId = null;
  }
}

export function useSirenSound() {
  const playLoop = useCallback(() => {
    if (typeof window === "undefined") return;
    if (siren.playing) return;

    const ctx = ensureContext();
    if (!ctx || !siren.masterGain) return;

    siren.playing = true;
    siren.high = true;
    siren.masterGain.gain.value = 0;
    startBeepLoop();
    rampVolume(0, PEAK_VOLUME, FADE_IN_MS);
  }, []);

  const stopLoop = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!siren.playing && !siren.intervalId) return;

    siren.playing = false;
    haltBeepLoop();
    cancelFade();

    const gain = siren.masterGain;
    if (!gain) return;

    const current = gain.gain.value;
    rampVolume(current, 0, FADE_OUT_MS, () => {
      gain.gain.value = 0;
    });
  }, []);

  return { playLoop, stopLoop };
}

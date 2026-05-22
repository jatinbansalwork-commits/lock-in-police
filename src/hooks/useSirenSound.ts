"use client";

import { useCallback } from "react";
import {
  SIREN_FADE_IN_MS,
  SIREN_FADE_OUT_MS,
  SIREN_PEAK_SOFT,
  SIREN_PEAK_STRONG,
} from "@/lib/constants";
import type { SirenIntensity } from "@/lib/types";

const BEEP_INTERVAL_SOFT_MS = 480;
const BEEP_INTERVAL_STRONG_MS = 360;
const BEEP_INTERVAL_MAX_MS = 280;

type SirenSingleton = {
  ctx: AudioContext | null;
  masterGain: GainNode | null;
  intervalId: ReturnType<typeof setInterval> | null;
  fadeFrameId: number | null;
  playing: boolean;
  high: boolean;
  intensity: SirenIntensity;
  peakVolume: number;
  beepGain: number;
};

const siren: SirenSingleton = {
  ctx: null,
  masterGain: null,
  intervalId: null,
  fadeFrameId: null,
  playing: false,
  high: true,
  intensity: "soft",
  peakVolume: SIREN_PEAK_SOFT,
  beepGain: 0.05,
};

function intensityConfig(intensity: SirenIntensity) {
  switch (intensity) {
    case "soft":
      return {
        peak: SIREN_PEAK_SOFT,
        interval: BEEP_INTERVAL_SOFT_MS,
        beepGain: 0.05,
      };
    case "strong":
      return {
        peak: SIREN_PEAK_STRONG,
        interval: BEEP_INTERVAL_STRONG_MS,
        beepGain: 0.065,
      };
    case "max":
      return {
        peak: SIREN_PEAK_STRONG,
        interval: BEEP_INTERVAL_MAX_MS,
        beepGain: 0.08,
      };
  }
}

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

function beep(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "square";
  osc2.type = "sawtooth";
  osc1.frequency.value = siren.high ? 920 : 460;
  osc2.frequency.value = siren.high ? 690 : 345;
  gain.gain.value = siren.beepGain;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(siren.masterGain!);
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.2);
  osc2.stop(t + 0.2);
  siren.high = !siren.high;
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

function startBeepLoop(intervalMs: number) {
  const ctx = siren.ctx;
  if (!ctx) return;

  haltBeepLoop();

  const tick = () => {
    if (!siren.playing || !siren.masterGain) return;
    beep(ctx);
  };

  tick();
  siren.intervalId = setInterval(tick, intervalMs);
}

function haltBeepLoop() {
  if (siren.intervalId) {
    clearInterval(siren.intervalId);
    siren.intervalId = null;
  }
}

export function useSirenSound() {
  const playLoop = useCallback((intensity: SirenIntensity = "strong") => {
    if (typeof window === "undefined") return;

    const cfg = intensityConfig(intensity);
    siren.intensity = intensity;
    siren.peakVolume = cfg.peak;
    siren.beepGain = cfg.beepGain;

    const ctx = ensureContext();
    if (!ctx || !siren.masterGain) return;

    if (siren.playing) {
      startBeepLoop(cfg.interval);
      rampVolume(siren.masterGain.gain.value, cfg.peak, 120);
      return;
    }

    siren.playing = true;
    siren.high = true;
    siren.masterGain.gain.value = 0;
    startBeepLoop(cfg.interval);
    rampVolume(0, cfg.peak, SIREN_FADE_IN_MS);
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
    rampVolume(current, 0, SIREN_FADE_OUT_MS, () => {
      gain.gain.value = 0;
    });
  }, []);

  return { playLoop, stopLoop };
}

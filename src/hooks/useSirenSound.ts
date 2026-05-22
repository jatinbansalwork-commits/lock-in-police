"use client";

import { useCallback } from "react";
import { SIREN_FADE_IN_MS, SIREN_FADE_OUT_MS } from "@/lib/constants";
import { getSirenAudioUrl } from "@/lib/sirenAudio";
import type { SirenIntensity } from "@/lib/types";

const BASE_VOLUME = 0.72;
const ESCALATED_VOLUME = 0.8;

type SirenSingleton = {
  audio: HTMLAudioElement | null;
  fadeFrameId: number | null;
  playing: boolean;
  targetVolume: number;
};

const siren: SirenSingleton = {
  audio: null,
  fadeFrameId: null,
  playing: false,
  targetVolume: BASE_VOLUME,
};

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!siren.audio) {
    const audio = new Audio(getSirenAudioUrl());
    audio.loop = true;
    audio.preload = "auto";
    siren.audio = audio;
  } else {
    siren.audio.loop = true;
  }

  return siren.audio;
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
  const audio = siren.audio;
  if (!audio) {
    onComplete?.();
    return;
  }

  cancelFade();
  const start = performance.now();

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = t * (2 - t);
    audio.volume = from + (to - from) * eased;

    if (t < 1) {
      siren.fadeFrameId = requestAnimationFrame(step);
    } else {
      siren.fadeFrameId = null;
      audio.volume = to;
      onComplete?.();
    }
  };

  siren.fadeFrameId = requestAnimationFrame(step);
}

function resolvePeakVolume(volumeScale: number): number {
  if (volumeScale >= 1.1) return ESCALATED_VOLUME;
  return Math.min(ESCALATED_VOLUME, BASE_VOLUME * volumeScale);
}

export function useSirenSound() {
  const playLoop = useCallback(
    (_intensity: SirenIntensity = "strong", volumeScale = 1) => {
      if (typeof window === "undefined") return;

      const audio = ensureAudio();
      if (!audio) return;

      const peak = resolvePeakVolume(volumeScale);
      siren.targetVolume = peak;

      if (siren.playing && !audio.paused) {
        rampVolume(audio.volume, peak, 120);
        return;
      }

      siren.playing = true;
      audio.loop = true;
      audio.currentTime = 0;
      audio.volume = 0;
      cancelFade();
      void audio.play().catch(() => undefined);
      rampVolume(0, peak, SIREN_FADE_IN_MS);
    },
    []
  );

  const stopLoop = useCallback((fadeMs: number = SIREN_FADE_OUT_MS) => {
    if (typeof window === "undefined") return;

    const audio = siren.audio;
    if (!audio && !siren.playing) return;

    siren.playing = false;
    cancelFade();

    if (!audio) return;

    const current = audio.volume;
    rampVolume(current, 0, fadeMs, () => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
    });
  }, []);

  return { playLoop, stopLoop };
}

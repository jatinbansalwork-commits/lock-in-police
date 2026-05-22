"use client";

import { useCallback, useEffect, useRef } from "react";
import { SIREN_FADE_IN_MS, SIREN_FADE_OUT_MS } from "@/lib/constants";
import { getSirenAudioUrl } from "@/lib/sirenAudio";
import type { SirenIntensity } from "@/lib/types";

const BASE_VOLUME = 0.72;
const ESCALATED_VOLUME = 0.8;

function resolvePeakVolume(volumeScale: number): number {
  if (volumeScale >= 1.1) return ESCALATED_VOLUME;
  return Math.min(ESCALATED_VOLUME, BASE_VOLUME * volumeScale);
}

function safePause(audio: HTMLAudioElement) {
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
  } catch {
    /* ignore teardown errors */
  }
}

export function useSirenSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const playingRef = useRef(false);

  const cancelFade = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }, []);

  const rampVolume = useCallback(
    (
      from: number,
      to: number,
      durationMs: number,
      onComplete?: () => void
    ) => {
      const audio = audioRef.current;
      if (!audio) {
        if (typeof onComplete === "function") onComplete();
        return;
      }

      cancelFade();
      const start = performance.now();

      const step = (now: number) => {
        const current = audioRef.current;
        if (!current) {
          fadeFrameRef.current = null;
          if (typeof onComplete === "function") onComplete();
          return;
        }

        const t = Math.min(1, (now - start) / durationMs);
        const eased = t * (2 - t);
        current.volume = from + (to - from) * eased;

        if (t < 1) {
          fadeFrameRef.current = requestAnimationFrame(step);
        } else {
          fadeFrameRef.current = null;
          current.volume = to;
          if (typeof onComplete === "function") onComplete();
        }
      };

      fadeFrameRef.current = requestAnimationFrame(step);
    },
    [cancelFade]
  );

  const initAudio = useCallback((): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null;
    if (audioRef.current) return audioRef.current;

    const url = getSirenAudioUrl();
    if (!url) return null;

    const audio = new Audio(url);
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;
    return audio;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    initAudio();

    return () => {
      cancelFade();
      const current = audioRef.current;
      if (current) safePause(current);
      audioRef.current = null;
      playingRef.current = false;
    };
  }, [cancelFade, initAudio]);

  const playLoop = useCallback(
    async (_intensity: SirenIntensity = "strong", volumeScale = 1) => {
      if (typeof window === "undefined") return;

      const audio = initAudio();
      if (!audio) return;

      const peak = resolvePeakVolume(volumeScale);

      try {
        audio.loop = true;

        if (playingRef.current && !audio.paused) {
          rampVolume(audio.volume, peak, 120);
          return;
        }

        playingRef.current = true;
        cancelFade();
        audio.currentTime = 0;
        audio.volume = 0;
        await audio.play();
        rampVolume(0, peak, SIREN_FADE_IN_MS);
      } catch (err) {
        console.warn("audio blocked", err);
        playingRef.current = false;
      }
    },
    [cancelFade, rampVolume, initAudio]
  );

  const stopLoop = useCallback(
    (fadeMs: number = SIREN_FADE_OUT_MS) => {
      if (typeof window === "undefined") return;

      const audio = audioRef.current;
      playingRef.current = false;
      cancelFade();

      if (!audio) return;

      if (fadeMs <= 0) {
        safePause(audio);
        return;
      }

      try {
        const current = audio.volume;
        rampVolume(current, 0, fadeMs, () => {
          const active = audioRef.current;
          if (active) safePause(active);
        });
      } catch {
        safePause(audio);
      }
    },
    [cancelFade, rampVolume]
  );

  return { playLoop, stopLoop };
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  MOUSE_IDLE_MS,
  RANDOM_DISTRACTION_MAX_MS,
  RANDOM_DISTRACTION_MIN_MS,
} from "@/lib/constants";
import type { DistractionSource } from "@/lib/types";
import { randomBetween } from "@/lib/utils";

type Options = {
  enabled: boolean;
  onDistraction: (source: DistractionSource) => void;
};

export function useDistractionDetection({ enabled, onDistraction }: Options) {
  const onDistractionRef = useRef(onDistraction);
  onDistractionRef.current = onDistraction;

  const trigger = useCallback((source: DistractionSource) => {
    onDistractionRef.current(source);
  }, []);

  const simulate = useCallback(() => {
    if (enabled) trigger("simulate");
  }, [enabled, trigger]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) trigger("tab-hidden");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabled, trigger]);

  useEffect(() => {
    if (!enabled) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => trigger("mouse-idle"), MOUSE_IDLE_MS);
    };

    resetIdle();
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("mousedown", resetIdle);
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("scroll", resetIdle);

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("mousedown", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("scroll", resetIdle);
    };
  }, [enabled, trigger]);

  useEffect(() => {
    if (!enabled) return;

    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = randomBetween(
        RANDOM_DISTRACTION_MIN_MS,
        RANDOM_DISTRACTION_MAX_MS
      );
      timeout = setTimeout(() => {
        trigger("random");
        schedule();
      }, delay);
    };
    schedule();

    return () => clearTimeout(timeout);
  }, [enabled, trigger]);

  return { simulate };
}

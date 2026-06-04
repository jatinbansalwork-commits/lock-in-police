"use client";

import { useCallback, useRef } from "react";
import { ALERT_VOICE_LINES } from "@/lib/constants";

function pickRoboticVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Fred") ||
        v.name.includes("Daniel") ||
        v.name.includes("Google UK English Male") ||
        v.name.includes("Male"))
  );
  return preferred ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
}

export function useSpeechSynthesis() {
  const busyRef = useRef(false);
  const stopRef = useRef(false);

  const speakOne = useCallback((line: string) => {
    return new Promise<void>((resolve) => {
      if (!window.speechSynthesis || stopRef.current) {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(line);
      u.rate = 0.72;
      u.pitch = 0.35;
      u.volume = 1;
      const voice = pickRoboticVoice();
      if (voice) u.voice = voice;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }, []);

  /** Speak alert lines once — no loop */
  const speakAlertOnce = useCallback(async () => {
    if (!window.speechSynthesis || busyRef.current) return;
    busyRef.current = true;
    stopRef.current = false;
    window.speechSynthesis.cancel();

    if (window.speechSynthesis.getVoices().length === 0) {
      await new Promise<void>((resolve) => {
        window.speechSynthesis.onvoiceschanged = () => resolve();
        setTimeout(resolve, 200);
      });
    }

    for (const line of ALERT_VOICE_LINES) {
      if (stopRef.current) break;
      await speakOne(line);
      if (stopRef.current) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    busyRef.current = false;
  }, [speakOne]);

  const stop = useCallback(() => {
    stopRef.current = true;
    window.speechSynthesis?.cancel();
    busyRef.current = false;
  }, []);

  return { speakAlertOnce, stop };
}

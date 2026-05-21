"use client";

import { useCallback, useRef } from "react";
import { VOICE_LINES } from "@/lib/constants";

export function useSpeechSynthesis() {
  const speakingRef = useRef(false);

  const speakLines = useCallback(async () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speakingRef.current) return;

    speakingRef.current = true;
    window.speechSynthesis.cancel();

    for (const line of VOICE_LINES) {
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(line);
        utterance.rate = 0.95;
        utterance.pitch = 0.85;
        utterance.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.name.includes("Samantha")) ??
          voices.find((v) => v.lang.startsWith("en")) ??
          voices[0];
        if (preferred) utterance.voice = preferred;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
      await new Promise((r) => setTimeout(r, 280));
    }

    speakingRef.current = false;
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    speakingRef.current = false;
  }, []);

  return { speakLines, stop };
}

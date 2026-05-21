"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertModal } from "./AlertModal";
import { CameraPreview } from "./CameraPreview";
import { LiveIndicator } from "./LiveIndicator";
import { PoliceMascot } from "./PoliceMascot";
import { SessionComplete } from "./SessionComplete";
import { ShameDispatch } from "./ShameDispatch";
import { DEFAULT_MINUTES, SHAME_MESSAGES } from "@/lib/constants";
import type { AppScreen, MascotState } from "@/lib/types";
import {
  computeFocusScore,
  formatTimerDisplay,
  pickRandom,
} from "@/lib/utils";
import { useDistractionDetection } from "@/hooks/useDistractionDetection";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

export function LockInPolice() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [shameOpen, setShameOpen] = useState(false);
  const [shameMessage, setShameMessage] = useState(SHAME_MESSAGES[0]);
  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [completedMinutes, setCompletedMinutes] = useState(0);

  const alertCooldownRef = useRef(false);
  const totalSecondsRef = useRef(0);
  const { speakLines, stop } = useSpeechSynthesis();

  const handleDistraction = useCallback(() => {
    if (screen !== "active" || alertCooldownRef.current) return;

    alertCooldownRef.current = true;
    setViolations((v) => v + 1);
    setMascotState("siren");
    setAlertOpen(true);
    setShameMessage(pickRandom(SHAME_MESSAGES));

    speakLines();

    window.setTimeout(() => {
      setAlertOpen(false);
      setShameOpen(true);
      setMascotState("angry");
    }, 3200);

    window.setTimeout(() => {
      alertCooldownRef.current = false;
    }, 8000);
  }, [screen, speakLines]);

  const { simulate } = useDistractionDetection({
    enabled: screen === "active" && !alertOpen && !shameOpen,
    onDistraction: handleDistraction,
  });

  const startSession = () => {
    const total = Math.max(1, minutes) * 60;
    totalSecondsRef.current = total;
    setSecondsLeft(total);
    setViolations(0);
    setScreen("active");
    setMascotState("looking");
    setAlertOpen(false);
    setShameOpen(false);
    alertCooldownRef.current = false;
  };

  const endSession = useCallback(() => {
    stop();
    setAlertOpen(false);
    setShameOpen(false);
    setCompletedMinutes(minutes);
    setScreen("complete");
    setMascotState("idle");
    alertCooldownRef.current = false;
  }, [minutes, stop]);

  const dismissShame = () => {
    setShameOpen(false);
    setMascotState("looking");
    stop();
  };

  const resetApp = () => {
    setScreen("home");
    setMinutes(DEFAULT_MINUTES);
    setSecondsLeft(0);
    setViolations(0);
    setMascotState("idle");
  };

  useEffect(() => {
    if (screen !== "active") return;

    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          endSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [screen, endSession]);

  const focusScore = computeFocusScore(totalSecondsRef.current, violations);

  if (screen === "complete") {
    return (
      <SessionComplete
        minutes={completedMinutes}
        violations={violations}
        focusScore={focusScore}
        onLockInAgain={resetApp}
      />
    );
  }

  const isActive = screen === "active";

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface">
      <AmbientBackground active={isActive} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-8 sm:px-10 sm:py-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <motion.h1
            className="text-4xl font-black uppercase tracking-[0.12em] text-warm-white sm:text-6xl md:text-7xl"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Lock-In Police
          </motion.h1>
          <LiveIndicator size={isActive ? "md" : "sm"} />
        </header>

        {isActive && (
          <motion.p
            className="mt-4 text-center text-xs font-bold uppercase tracking-[0.45em] text-warm-white/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Don&apos;t touch it
          </motion.p>
        )}

        <main className="mt-8 flex flex-1 flex-col gap-8 lg:mt-10 lg:flex-row lg:items-stretch lg:gap-12">
          <div className="flex-1 lg:max-w-[58%]">
            <CameraPreview active={isActive} className="h-full" />
          </div>

          <div className="flex flex-1 flex-col justify-center lg:max-w-[42%]">
            {isActive ? (
              <ActivePanel
                secondsLeft={secondsLeft}
                mascotState={mascotState}
                onSimulate={simulate}
              />
            ) : (
              <HomePanel
                minutes={minutes}
                onMinutesChange={setMinutes}
                onLockIn={startSession}
              />
            )}
          </div>
        </main>
      </div>

      <AlertModal open={alertOpen} />
      <ShameDispatch
        open={shameOpen}
        message={shameMessage}
        onBackToWork={dismissShame}
        onStopSession={endSession}
      />
    </div>
  );
}

function AmbientBackground({ active }: { active: boolean }) {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-accent/8 blur-[120px]"
        animate={{ x: active ? [0, 30, 0] : 0, y: active ? [0, -20, 0] : 0 }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-warning/6 blur-[100px]"
        animate={{ x: active ? [0, -25, 0] : 0 }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
    </>
  );
}

function HomePanel({
  minutes,
  onMinutesChange,
  onLockIn,
}: {
  minutes: number;
  onMinutesChange: (n: number) => void;
  onLockIn: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col gap-8"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 22 }}
    >
      <div>
        <label
          htmlFor="minutes"
          className="text-[10px] font-bold uppercase tracking-[0.4em] text-warm-white/35"
        >
          Minutes
        </label>
        <input
          id="minutes"
          type="number"
          min={1}
          max={180}
          value={minutes}
          onChange={(e) =>
            onMinutesChange(Math.max(1, parseInt(e.target.value, 10) || 1))
          }
          className="glass mt-3 w-full rounded-card border-0 bg-transparent px-6 py-5 text-5xl font-light text-warm-white outline-none ring-0 focus:ring-2 focus:ring-accent/40"
        />
      </div>

      <motion.button
        type="button"
        onClick={onLockIn}
        className="w-full rounded-card bg-cream py-6 text-sm font-black uppercase tracking-[0.3em] text-surface shadow-[0_0_60px_rgba(245,240,232,0.15)]"
        whileHover={{ scale: 1.02, boxShadow: "0 0 80px rgba(245,240,232,0.25)" }}
        whileTap={{ scale: 0.98 }}
      >
        Lock In
      </motion.button>

      <div className="flex justify-center pt-2">
        <PoliceMascot state="idle" size="md" />
      </div>
    </motion.div>
  );
}

function ActivePanel({
  secondsLeft,
  mascotState,
  onSimulate,
}: {
  secondsLeft: number;
  mascotState: MascotState;
  onSimulate: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-warm-white/35">
        Focus Timer
      </p>
      <motion.p
        className="text-7xl font-black tabular-nums tracking-tight text-warm-white sm:text-8xl md:text-9xl"
        key={secondsLeft}
        initial={{ scale: 1.02 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {formatTimerDisplay(secondsLeft)}
      </motion.p>

      <div className="flex w-full flex-col items-center gap-6 lg:items-start">
        <PoliceMascot state={mascotState} size="md" />
        <motion.button
          type="button"
          onClick={onSimulate}
          className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-white/25 underline-offset-4 transition hover:text-warm-white/50 hover:underline"
        >
          Simulate phone pickup
        </motion.button>
      </div>
    </motion.div>
  );
}

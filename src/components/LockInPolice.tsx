"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertMode } from "./AlertMode";
import { BentoCard } from "./BentoCard";
import { CameraPreview } from "./CameraPreview";
import { DebugPanel } from "./DebugPanel";
import { FocusTimerCard } from "./FocusTimerCard";
import { PoliceMascot } from "./PoliceMascot";
import { Toast } from "./Toast";
import { TopToast } from "./TopToast";
import { pickAlertMessage } from "@/lib/alertMessages";
import {
  PHONE_WARNING_DURATION_MS,
  RECOVERY_DURATION_MS,
  SURVEILLANCE_FREEZE_MS,
  SURVEILLANCE_RESUME_MS,
} from "@/lib/constants";
import type {
  CameraState,
  DetectionDebug,
  OfficerVariant,
  SessionState,
  SurveillancePhase,
} from "@/lib/types";
import { isValidMinutesInput, parseMinutesInput } from "@/lib/utils";
import { usePhoneObjectDetection } from "@/hooks/usePhoneObjectDetection";
import { useSirenSound } from "@/hooks/useSirenSound";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useUIClick } from "@/hooks/useUIClick";

export function LockInPolice() {
  const [sessionState, setSessionState] = useState<SessionState>("IDLE");
  const sessionStateRef = useRef<SessionState>("IDLE");
  const [minutesInput, setMinutesInput] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [surveillancePhase, setSurveillancePhase] =
    useState<SurveillancePhase>("live");
  const [alertMessage, setAlertMessage] = useState("");
  const [streamReady, setStreamReady] = useState(false);
  const [justLocked, setJustLocked] = useState(false);

  const [topToastVisible, setTopToastVisible] = useState(false);
  const [bottomToastVisible, setBottomToastVisible] = useState(false);
  const [bottomToastMessage, setBottomToastMessage] = useState("");

  const [detectionDebug, setDetectionDebug] = useState<DetectionDebug>({
    phone: false,
    confidence: 0,
  });

  const lastAlertMessageRef = useRef<string | null>(null);
  const [detectionVideo, setDetectionVideo] = useState<HTMLVideoElement | null>(
    null
  );
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceTimersRef = useRef<number[]>([]);
  const phoneStillVisibleRef = useRef(false);

  const { speakAlertOnce, stop: stopSpeech } = useSpeechSynthesis();
  const { playLoop, stopLoop } = useSirenSound();
  const { playClick } = useUIClick();

  const lockInEnabled = isValidMinutesInput(minutesInput);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  const clearSequenceTimers = useCallback(() => {
    sequenceTimersRef.current.forEach((id) => window.clearTimeout(id));
    sequenceTimersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    sequenceTimersRef.current.push(id);
    return id;
  }, []);

  const stopAllEffects = useCallback(() => {
    stopLoop();
    stopSpeech();
  }, [stopLoop, stopSpeech]);

  const playAlertAudio = useCallback(() => {
    playClick();
    void speakAlertOnce();
  }, [playClick, speakAlertOnce]);

  const clearWarningTimer = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  const enterLockedIn = useCallback(() => {
    clearWarningTimer();
    setTopToastVisible(false);
    setSessionState("LOCKED_IN");
    setSurveillancePhase("live");
  }, [clearWarningTimer]);

  const enterAlertRef = useRef<() => void>(() => undefined);
  const enterLockedInRef = useRef<() => void>(() => undefined);
  enterLockedInRef.current = enterLockedIn;

  const resetDetectionRef = useRef<() => void>(() => undefined);

  const enterAlert = useCallback(() => {
    clearWarningTimer();
    setTopToastVisible(false);

    const message = pickAlertMessage(lastAlertMessageRef.current);
    lastAlertMessageRef.current = message;
    setAlertMessage(message);

    setSessionState("ALERT");
    setSurveillancePhase("snapshot");
    playAlertAudio();

    schedule(() => setSurveillancePhase("darken"), SURVEILLANCE_FREEZE_MS);
    schedule(() => setSurveillancePhase("live"), SURVEILLANCE_RESUME_MS);
  }, [clearWarningTimer, playAlertAudio, schedule]);

  enterAlertRef.current = enterAlert;

  const enterPhoneWarning = useCallback(() => {
    if (sessionStateRef.current !== "LOCKED_IN") return;

    setSessionState("PHONE_WARNING");
    setTopToastVisible(true);

    clearWarningTimer();
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      if (phoneStillVisibleRef.current) {
        enterAlertRef.current();
      } else {
        resetDetectionRef.current();
        enterLockedInRef.current();
      }
    }, PHONE_WARNING_DURATION_MS);
  }, [clearWarningTimer]);

  const detectionEnabled =
    sessionState === "LOCKED_IN" || sessionState === "PHONE_WARNING";

  const { resetDetection, isPhoneVisible } = usePhoneObjectDetection({
    video: detectionVideo,
    enabled: detectionEnabled,
    onDebug: setDetectionDebug,
    onPhoneSustained: enterPhoneWarning,
    onPhoneLost: () => {
      if (sessionStateRef.current !== "PHONE_WARNING") return;
      clearWarningTimer();
      setTopToastVisible(false);
      resetDetectionRef.current();
      enterLockedInRef.current();
    },
  });

  resetDetectionRef.current = resetDetection;

  useEffect(() => {
    phoneStillVisibleRef.current = isPhoneVisible();
  });

  const beginRecovery = useCallback(() => {
    stopAllEffects();
    clearWarningTimer();
    clearSequenceTimers();
    setTopToastVisible(false);
    setSurveillancePhase("live");
    setSessionState("RECOVERY");
    setBottomToastMessage("Back on duty");
    setBottomToastVisible(true);

    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = setTimeout(() => {
      recoveryTimerRef.current = null;
      setBottomToastVisible(false);
      resetDetection();
      enterLockedIn();
    }, RECOVERY_DURATION_MS);
  }, [
    stopAllEffects,
    clearWarningTimer,
    clearSequenceTimers,
    resetDetection,
    enterLockedIn,
  ]);

  const backToWork = useCallback(() => {
    if (sessionStateRef.current !== "ALERT") return;
    beginRecovery();
  }, [beginRecovery]);

  const handleVideoReady = useCallback((video: HTMLVideoElement | null) => {
    setDetectionVideo(video);
    setStreamReady(!!video);
  }, []);

  const startSession = () => {
    if (!lockInEnabled) return;
    const m = parseMinutesInput(minutesInput);
    setSecondsLeft(m * 60);
    stopAllEffects();
    clearWarningTimer();
    clearSequenceTimers();
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    resetDetection();
    setTopToastVisible(false);
    setBottomToastVisible(false);
    setSurveillancePhase("live");
    setJustLocked(true);
    setSessionState("LOCKED_IN");
    window.setTimeout(() => setJustLocked(false), 520);
  };

  const stopSession = useCallback(() => {
    stopAllEffects();
    clearWarningTimer();
    clearSequenceTimers();
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    resetDetection();
    setTopToastVisible(false);
    setBottomToastVisible(false);
    setSurveillancePhase("live");
    setSecondsLeft(0);
    setSessionState("IDLE");
  }, [stopAllEffects, clearWarningTimer, clearSequenceTimers, resetDetection]);

  useEffect(() => {
    if (sessionState !== "LOCKED_IN") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sessionState, stopSession]);

  useEffect(() => {
    return () => {
      clearSequenceTimers();
      clearWarningTimer();
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    };
  }, [clearSequenceTimers, clearWarningTimer]);

  const isLanding = sessionState === "IDLE";
  const isActive = sessionState !== "IDLE";
  const alertOpen = sessionState === "ALERT";
  const phoneWarning = sessionState === "PHONE_WARNING";

  const cameraState: CameraState = useMemo(() => {
    if (sessionState === "RECOVERY") return "recovered";
    if (sessionState === "ALERT") return "alert";
    if (sessionState === "PHONE_WARNING") return "phone-found";
    if (sessionState === "LOCKED_IN") return "active";
    return "ready";
  }, [sessionState]);

  const officerVariant: OfficerVariant = useMemo(() => {
    if (sessionState === "ALERT") return "alert";
    if (sessionState === "RECOVERY") return "recovered";
    if (sessionState === "PHONE_WARNING") return "watching";
    return "idle";
  }, [sessionState]);

  useEffect(() => {
    if (!alertOpen) return;

    playLoop();
    document.body.classList.add("siren-ambient-active");
    document.documentElement.classList.add("siren-ambient-active");

    return () => {
      stopLoop();
      document.body.classList.remove("siren-ambient-active");
      document.documentElement.classList.remove("siren-ambient-active");
    };
  }, [alertOpen, playLoop, stopLoop]);

  return (
    <div className="page-grain relative min-h-screen bg-canvas text-text">
      <div className="dashboard-page">
        <header
          className={`fade-in dashboard-header ${isActive ? "dashboard-header--active" : ""}`}
        >
          <h1 className="dashboard-headline font-extrabold text-text">
            Lock-in Police
          </h1>
        </header>

        <main className="fade-in-delayed dashboard-shell">
          <section className="dashboard-camera">
            <CameraPreview
              sessionActive={isActive}
              streamReady={streamReady}
              cameraState={cameraState}
              surveillancePhase={surveillancePhase}
              phoneWarning={phoneWarning}
              onVideoReady={handleVideoReady}
            />
          </section>

          <aside className="dashboard-rail">
            <FocusTimerCard
              isLanding={isLanding}
              isActive={isActive}
              justLocked={justLocked}
              minutesInput={minutesInput}
              secondsLeft={secondsLeft}
              lockInEnabled={lockInEnabled}
              onMinutesInputChange={setMinutesInput}
              onLockIn={startSession}
              onStopSession={stopSession}
            />

            <BentoCard className="police-card">
              <div className="police-card__officer">
                <PoliceMascot variant={officerVariant} />
              </div>
            </BentoCard>
          </aside>
        </main>

        <AlertMode
          open={alertOpen}
          alertMessage={alertMessage}
          onBackToWork={backToWork}
          onStopSession={stopSession}
        />
      </div>

      <TopToast message="Phone found" visible={topToastVisible} />
      <Toast message={bottomToastMessage} visible={bottomToastVisible} />

      <DebugPanel
        state={sessionState}
        phone={detectionDebug.phone}
        confidence={detectionDebug.confidence}
        alert={alertOpen}
        recovery={sessionState === "RECOVERY"}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertMode } from "./AlertMode";
import { BentoCard } from "./BentoCard";
import { CameraPreview } from "./CameraPreview";
import { DetectionProgress } from "./DetectionProgress";
import { FocusTimerCard } from "./FocusTimerCard";
import { PoliceMascot } from "./PoliceMascot";
import { SessionSummaryCard } from "./SessionSummaryCard";
import { Toast } from "./Toast";
import { WantedBanner } from "./WantedBanner";
import { pickAlertMessage, pickOfficerLine } from "@/lib/alertMessages";
import {
  RECOVERY_FEEDBACK_MS,
  RECOVERY_SECONDS,
  SIREN_FADE_IDLE_MS,
  SURVEILLANCE_FREEZE_MS,
  SURVEILLANCE_RESUME_MS,
} from "@/lib/constants";
import { computeFocusScore, focusScoreLabel } from "@/lib/focusScore";
import {
  alertPulseClass,
  sirenIntensityForViolation,
  sirenVolumeScale,
} from "@/lib/offense";
import {
  incrementTotalCaptures,
  loadActiveSession,
  loadTotalCaptures,
  saveActiveSession,
} from "@/lib/storage";
import type {
  AlertState,
  CameraSessionStatus,
  CameraState,
  ConfidenceLevel,
  DetectionSignal,
  MascotState,
  SessionState,
  SessionSummary,
  SirenIntensity,
  SurveillancePhase,
} from "@/lib/types";
import { resetAppCacheOnPageReload } from "@/lib/cacheReset";
import { isValidMinutesInput, parseMinutesInput } from "@/lib/utils";
import { usePhoneObjectDetection } from "@/hooks/usePhoneObjectDetection";
import { useRecoverySound } from "@/hooks/useRecoverySound";
import { warmupPhoneDetector } from "@/lib/phoneDetectorModel";
import { useSirenSound } from "@/hooks/useSirenSound";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useUIClick } from "@/hooks/useUIClick";

function confidenceLevel(score: number): ConfidenceLevel {
  if (score < 0.6) return "none";
  if (score < 0.72) return "low";
  if (score < 0.85) return "medium";
  return "high";
}

function mascotStateFromSession(sessionState: SessionState): MascotState {
  if (sessionState === "IDLE") return "IDLE";
  if (sessionState === "RECOVERY") return "RECOVERY";
  if (sessionState === "ALERT" || sessionState === "PHONE_CONFIRMED") {
    return "ALERT";
  }
  if (sessionState === "PHONE_SUSPECTED") return "WATCHING";
  return "LOCKED_IN";
}

function applySirenAmbientClasses(violationCount: number) {
  const classes = alertPulseClass(violationCount).split(" ");
  document.body.classList.remove(
    "siren-ambient-active",
    "siren-ambient--strong",
    "siren-ambient--max"
  );
  document.documentElement.classList.remove(
    "siren-ambient-active",
    "siren-ambient--strong",
    "siren-ambient--max"
  );
  classes.forEach((c) => {
    document.body.classList.add(c);
    document.documentElement.classList.add(c);
  });
}

function clearSirenAmbientClasses() {
  document.body.classList.remove(
    "siren-ambient-active",
    "siren-ambient--strong",
    "siren-ambient--max",
    "recovery-pulse-active",
    "phone-suspected-ambient"
  );
  document.documentElement.classList.remove(
    "siren-ambient-active",
    "siren-ambient--strong",
    "siren-ambient--max",
    "recovery-pulse-active",
    "phone-suspected-ambient"
  );
}

export function LockInPolice() {
  const [sessionState, setSessionState] = useState<SessionState>("IDLE");
  const sessionStateRef = useRef<SessionState>("IDLE");
  const [alertState, setAlertState] = useState<AlertState>("IDLE");
  const alertStateRef = useRef<AlertState>("IDLE");
  const [recoveryCountdown, setRecoveryCountdown] = useState(0);
  const [minutesInput, setMinutesInput] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [surveillancePhase, setSurveillancePhase] =
    useState<SurveillancePhase>("live");
  const [alertMessage, setAlertMessage] = useState("");
  const [streamReady, setStreamReady] = useState(false);
  const [justLocked, setJustLocked] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(
    null
  );

  const [bottomToastVisible, setBottomToastVisible] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [confidenceLevelState, setConfidenceLevelState] =
    useState<ConfidenceLevel>("none");
  const [recoveryElapsed, setRecoveryElapsed] = useState(0);
  const [totalCaptures, setTotalCaptures] = useState(0);

  const lastAlertMessageRef = useRef<string | null>(null);
  const lastOfficerLineRef = useRef<string | null>(null);
  const violationCountRef = useRef(0);
  const [violationCount, setViolationCount] = useState(0);
  const [sirenIntensity, setSirenIntensity] = useState<SirenIntensity>("soft");
  const [detectionVideo, setDetectionVideo] = useState<HTMLVideoElement | null>(
    null
  );

  const initialSessionSecondsRef = useRef(0);
  const focusSecondsRef = useRef(0);
  const currentStreakRef = useRef(0);
  const longestStreakRef = useRef(0);
  const interruptionsRef = useRef(0);
  const recoveryElapsedRef = useRef(0);
  const phoneClearSinceRef = useRef<number | null>(null);
  const recoveryStartedRef = useRef(false);

  const recoveryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceTimersRef = useRef<number[]>([]);

  const { speakAlertOnce, stop: stopSpeech } = useSpeechSynthesis();
  const { playLoop, stopLoop } = useSirenSound();
  const { playRecoveryChime } = useRecoverySound();
  const { playClick } = useUIClick();

  const lockInEnabled = isValidMinutesInput(minutesInput);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    alertStateRef.current = alertState;
  }, [alertState]);

  useEffect(() => {
    resetAppCacheOnPageReload();

    setTotalCaptures(loadTotalCaptures());

    const snap = loadActiveSession();
    if (snap && snap.state !== "IDLE" && snap.state !== "SESSION_COMPLETE") {
      violationCountRef.current = snap.violations;
      setViolationCount(snap.violations);
      setSecondsLeft(snap.secondsLeft);
      initialSessionSecondsRef.current = snap.initialSeconds;
      focusSecondsRef.current = snap.focusSeconds;
      longestStreakRef.current = snap.longestStreakSeconds;
      interruptionsRef.current = snap.interruptions;
      setSessionState(snap.state as SessionState);
    }
  }, []);

  const persistSession = useCallback(() => {
    if (
      sessionStateRef.current === "IDLE" ||
      sessionStateRef.current === "SESSION_COMPLETE"
    ) {
      saveActiveSession(null);
      return;
    }
    saveActiveSession({
      state: sessionStateRef.current,
      secondsLeft,
      violations: violationCountRef.current,
      interruptions: interruptionsRef.current,
      initialSeconds: initialSessionSecondsRef.current,
      focusSeconds: focusSecondsRef.current,
      longestStreakSeconds: longestStreakRef.current,
    });
  }, [secondsLeft]);

  useEffect(() => {
    persistSession();
  }, [sessionState, secondsLeft, violationCount, persistSession]);

  const clearSequenceTimers = useCallback(() => {
    sequenceTimersRef.current.forEach((id) => window.clearTimeout(id));
    sequenceTimersRef.current = [];
  }, []);

  const clearRecoveryInterval = useCallback(() => {
    if (recoveryIntervalRef.current) {
      clearInterval(recoveryIntervalRef.current);
      recoveryIntervalRef.current = null;
    }
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    sequenceTimersRef.current.push(id);
    return id;
  }, []);

  const stopAllEffects = useCallback(() => {
    setAlertState("IDLE");
    setRecoveryCountdown(0);
    stopLoop(SIREN_FADE_IDLE_MS);
    stopSpeech();
    clearSirenAmbientClasses();
    document.body.classList.remove("alert-era-active");
    document.documentElement.classList.remove("alert-era-active");
  }, [stopLoop, stopSpeech]);

  const playAlertAudio = useCallback(() => {
    playClick();
    void speakAlertOnce();
  }, [playClick, speakAlertOnce]);

  const enterLockedIn = useCallback(() => {
    recoveryStartedRef.current = false;
    phoneClearSinceRef.current = null;
    setAlertState("IDLE");
    setRecoveryCountdown(0);
    setRecoveryElapsed(0);
    recoveryElapsedRef.current = 0;
    setSessionState("LOCKED_IN");
    setSurveillancePhase("live");
    setDetectionProgress(0);
    setConfidenceLevelState("none");
  }, []);

  const resetDetectionRef = useRef<() => void>(() => undefined);

  const finishAlertRecovery = useCallback(() => {
    clearRecoveryInterval();
    recoveryStartedRef.current = false;
    setAlertState("IDLE");
    setRecoveryCountdown(0);
    stopLoop(SIREN_FADE_IDLE_MS);
    clearSirenAmbientClasses();
    document.body.classList.remove("alert-era-active");
    document.documentElement.classList.remove("alert-era-active");
    interruptionsRef.current += 1;
    setBottomToastVisible(true);
    document.body.classList.add("recovery-pulse-active");
    document.documentElement.classList.add("recovery-pulse-active");
    playRecoveryChime();

    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = setTimeout(() => {
      recoveryTimerRef.current = null;
      setBottomToastVisible(false);
      document.body.classList.remove("recovery-pulse-active");
      document.documentElement.classList.remove("recovery-pulse-active");
      resetDetectionRef.current();
      enterLockedIn();
    }, RECOVERY_FEEDBACK_MS);
  }, [clearRecoveryInterval, stopLoop, playRecoveryChime, enterLockedIn]);

  const beginRecoveryCountdown = useCallback(() => {
    if (recoveryStartedRef.current) return;
    if (alertStateRef.current !== "ALERT") return;

    recoveryStartedRef.current = true;
    phoneClearSinceRef.current = null;
    setAlertState("RECOVERING");
    setRecoveryCountdown(RECOVERY_SECONDS);
    stopSpeech();
    clearSequenceTimers();
    setSurveillancePhase("live");
    setSessionState("RECOVERY");
    setDetectionProgress(0);
    setConfidenceLevelState("none");
    recoveryElapsedRef.current = 0;
    setRecoveryElapsed(0);

    clearRecoveryInterval();
    recoveryIntervalRef.current = setInterval(() => {
      recoveryElapsedRef.current += 1;
      setRecoveryElapsed(recoveryElapsedRef.current);
      const remaining = RECOVERY_SECONDS - recoveryElapsedRef.current;
      setRecoveryCountdown(remaining > 0 ? remaining : 0);
      if (recoveryElapsedRef.current >= RECOVERY_SECONDS) {
        finishAlertRecovery();
      }
    }, 1000);
  }, [
    stopSpeech,
    clearSequenceTimers,
    clearRecoveryInterval,
    finishAlertRecovery,
  ]);

  const enterAlert = useCallback(() => {
    violationCountRef.current += 1;
    setViolationCount(violationCountRef.current);
    currentStreakRef.current = 0;
    recoveryStartedRef.current = false;
    phoneClearSinceRef.current = null;

    const captures = incrementTotalCaptures();
    setTotalCaptures(captures);

    const intensity = sirenIntensityForViolation(violationCountRef.current);
    setSirenIntensity(intensity);

    const message = pickAlertMessage(
      lastAlertMessageRef.current,
      intensity === "max" ? "max" : intensity === "strong" ? "strong" : "soft"
    );
    lastAlertMessageRef.current = message;
    setAlertMessage(message);

    if (violationCountRef.current >= 3) {
      const line = pickOfficerLine(
        Math.min(3, violationCountRef.current) as 1 | 2 | 3,
        lastOfficerLineRef.current
      );
      lastOfficerLineRef.current = line;
    }

    setAlertState("ALERT");
    setSessionState("ALERT");
    setSurveillancePhase("snapshot");
    setDetectionProgress(0);
    playAlertAudio();

    schedule(() => setSurveillancePhase("darken"), SURVEILLANCE_FREEZE_MS);
    schedule(() => setSurveillancePhase("live"), SURVEILLANCE_RESUME_MS);
  }, [playAlertAudio, schedule]);

  const enterPhoneSuspected = useCallback(() => {
    if (sessionStateRef.current !== "LOCKED_IN") return;
    setAlertState("DETECTING");
    setSessionState("PHONE_SUSPECTED");
  }, []);

  const enterPhoneConfirmed = useCallback(() => {
    if (
      sessionStateRef.current !== "PHONE_SUSPECTED" &&
      sessionStateRef.current !== "LOCKED_IN"
    ) {
      return;
    }
    setSessionState("PHONE_CONFIRMED");
    enterAlert();
  }, [enterAlert]);

  const handleDetectionSignal = useCallback(
    (signal: DetectionSignal) => {
      setDetectionProgress(signal.progress);
      setConfidenceLevelState(confidenceLevel(signal.confidence));

      const uiAlert = alertStateRef.current;

      if (uiAlert === "RECOVERING") {
        if (signal.smoothedPositive) {
          clearRecoveryInterval();
          recoveryStartedRef.current = false;
          recoveryElapsedRef.current = 0;
          setRecoveryElapsed(0);
          setRecoveryCountdown(0);
          setAlertState("ALERT");
          setSessionState("ALERT");
        }
        return;
      }

      if (uiAlert === "ALERT" && !recoveryStartedRef.current) {
        if (signal.smoothedPositive) {
          phoneClearSinceRef.current = null;
        } else {
          beginRecoveryCountdown();
        }
      }
    },
    [beginRecoveryCountdown, clearRecoveryInterval]
  );

  const detectionEnabled =
    sessionState === "LOCKED_IN" ||
    sessionState === "PHONE_SUSPECTED" ||
    sessionState === "ALERT" ||
    sessionState === "RECOVERY";

  const { resetDetection } = usePhoneObjectDetection({
    video: detectionVideo,
    enabled: detectionEnabled,
    onSignal: handleDetectionSignal,
    onPhoneSuspected: enterPhoneSuspected,
    onPhoneConfirmed: enterPhoneConfirmed,
    onPhoneLost: () => {
      if (sessionStateRef.current !== "PHONE_SUSPECTED") return;
      setAlertState("IDLE");
      resetDetectionRef.current();
      enterLockedIn();
    },
  });

  resetDetectionRef.current = resetDetection;

  const backToWork = useCallback(() => {
    if (alertStateRef.current !== "ALERT") return;
    beginRecoveryCountdown();
  }, [beginRecoveryCountdown]);

  const handleVideoReady = useCallback((video: HTMLVideoElement | null) => {
    setDetectionVideo(video);
    setStreamReady(!!video);
    if (video) void warmupPhoneDetector();
  }, []);

  const resetSessionMetrics = useCallback(() => {
    initialSessionSecondsRef.current = 0;
    focusSecondsRef.current = 0;
    currentStreakRef.current = 0;
    longestStreakRef.current = 0;
    interruptionsRef.current = 0;
    recoveryElapsedRef.current = 0;
    setRecoveryElapsed(0);
    setSessionSummary(null);
  }, []);

  const completeSession = useCallback(() => {
    stopAllEffects();
    clearSequenceTimers();
    clearRecoveryInterval();
    setSurveillancePhase("live");

    const violations = violationCountRef.current;
    const score = computeFocusScore(
      violations,
      interruptionsRef.current,
      true
    );

    setSessionSummary({
      focusScore: score,
      focusLabel: focusScoreLabel(score),
      pickups: violations,
      longestStreakMinutes: Math.floor(longestStreakRef.current / 60),
      interruptions: interruptionsRef.current,
    });

    setSessionState("SESSION_COMPLETE");
    saveActiveSession(null);
  }, [stopAllEffects, clearSequenceTimers, clearRecoveryInterval]);

  const startSession = () => {
    if (!lockInEnabled) return;
    const m = parseMinutesInput(minutesInput);
    const total = m * 60;
    setSecondsLeft(total);
    initialSessionSecondsRef.current = total;
    resetSessionMetrics();
    stopAllEffects();
    clearSequenceTimers();
    clearRecoveryInterval();
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    violationCountRef.current = 0;
    setViolationCount(0);
    lastAlertMessageRef.current = null;
    lastOfficerLineRef.current = null;
    resetDetection();
    setBottomToastVisible(false);
    setSurveillancePhase("live");
    setSirenIntensity("soft");
    setAlertState("IDLE");
    setRecoveryCountdown(0);
    setJustLocked(true);
    setSessionState("LOCKED_IN");
    void warmupPhoneDetector();
    window.setTimeout(() => setJustLocked(false), 520);
  };

  const stopSession = useCallback(() => {
    stopAllEffects();
    clearSequenceTimers();
    clearRecoveryInterval();
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    violationCountRef.current = 0;
    setViolationCount(0);
    lastAlertMessageRef.current = null;
    lastOfficerLineRef.current = null;
    resetDetection();
    resetSessionMetrics();
    setBottomToastVisible(false);
    setSurveillancePhase("live");
    setSirenIntensity("soft");
    setDetectionProgress(0);
    setConfidenceLevelState("none");
    setSecondsLeft(0);
    setAlertState("IDLE");
    setRecoveryCountdown(0);
    setSessionState("IDLE");
    saveActiveSession(null);
    clearSirenAmbientClasses();
  }, [
    stopAllEffects,
    clearSequenceTimers,
    clearRecoveryInterval,
    resetDetection,
    resetSessionMetrics,
  ]);

  useEffect(() => {
    if (sessionState !== "LOCKED_IN") return;
    const id = setInterval(() => {
      focusSecondsRef.current += 1;
      currentStreakRef.current += 1;
      if (currentStreakRef.current > longestStreakRef.current) {
        longestStreakRef.current = currentStreakRef.current;
      }

      setSecondsLeft((s) => {
        if (s <= 1) {
          completeSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sessionState, completeSession]);

  useEffect(() => {
    return () => {
      clearSequenceTimers();
      clearRecoveryInterval();
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    };
  }, [clearSequenceTimers, clearRecoveryInterval]);

  const isLanding = sessionState === "IDLE";
  const isSessionComplete = sessionState === "SESSION_COMPLETE";
  const isRecovering =
    alertState === "RECOVERING" || sessionState === "RECOVERY";
  const isActive =
    sessionState !== "IDLE" && sessionState !== "SESSION_COMPLETE";
  const alertPopupOpen =
    alertState === "ALERT" || alertState === "RECOVERING";
  const alertAudioActive = alertPopupOpen;
  const phoneSuspected = sessionState === "PHONE_SUSPECTED";
  const showDetectionProgress =
    alertState === "DETECTING" ||
    phoneSuspected ||
    sessionState === "PHONE_CONFIRMED";
  const timerPaused = alertPopupOpen || isSessionComplete;

  const mascotState = useMemo(
    () => mascotStateFromSession(sessionState),
    [sessionState]
  );

  const cameraState: CameraState = useMemo(() => {
    if (alertPopupOpen) return "alert";
    if (phoneSuspected || sessionState === "PHONE_CONFIRMED") {
      return "phone-suspected";
    }
    if (isActive) return "active";
    return "ready";
  }, [alertPopupOpen, phoneSuspected, isActive, sessionState]);

  const cameraSessionStatus: CameraSessionStatus = useMemo(() => {
    if (alertPopupOpen || sessionState === "PHONE_CONFIRMED") {
      return "phone-found";
    }
    if (isActive) return "locked-in";
    return "ready";
  }, [alertPopupOpen, sessionState, isActive]);

  useEffect(() => {
    if (!phoneSuspected) return;
    document.body.classList.add("phone-suspected-ambient");
    document.documentElement.classList.add("phone-suspected-ambient");
    return () => {
      document.body.classList.remove("phone-suspected-ambient");
      document.documentElement.classList.remove("phone-suspected-ambient");
    };
  }, [phoneSuspected]);

  useEffect(() => {
    if (!alertAudioActive) return;

    document.body.classList.add("alert-era-active");
    document.documentElement.classList.add("alert-era-active");
    void playLoop(sirenIntensity, sirenVolumeScale(violationCount));
    applySirenAmbientClasses(violationCount);

    return () => {
      document.body.classList.remove("alert-era-active");
      document.documentElement.classList.remove("alert-era-active");
      clearSirenAmbientClasses();
    };
  }, [alertAudioActive, playLoop, sirenIntensity, violationCount]);

  const railTimerSlot =
    isSessionComplete && sessionSummary ? (
      <SessionSummaryCard summary={sessionSummary} onDone={stopSession} />
    ) : (
      <FocusTimerCard
      isLanding={isLanding}
      isActive={isActive}
      isRecovering={isRecovering}
      recoveryElapsed={recoveryElapsed}
      timerPaused={timerPaused}
      justLocked={justLocked}
      minutesInput={minutesInput}
      secondsLeft={secondsLeft}
      lockInEnabled={lockInEnabled}
      onMinutesInputChange={setMinutesInput}
      onLockIn={startSession}
      onStopSession={stopSession}
    />
  );

  return (
    <div
      className={`lock-in-app page-grain bg-canvas text-text ${isActive || isSessionComplete ? "lock-in-app--focus" : ""}`}
    >
      <div className="dashboard-page">
        <header
          className={`fade-in dashboard-header ${isActive ? "dashboard-header--active" : ""}`}
        >
          <h1 className="dashboard-headline text-text">
            You are under surveillance 😉
          </h1>
        </header>

        <main className="fade-in-delayed dashboard-shell">
          <section className="dashboard-camera">
            <CameraPreview
              sessionActive={isActive || isSessionComplete}
              streamReady={streamReady}
              cameraState={cameraState}
              sessionStatus={cameraSessionStatus}
              surveillancePhase={surveillancePhase}
              confidenceLevel={confidenceLevelState}
              onVideoReady={handleVideoReady}
            />
            {showDetectionProgress && (
              <DetectionProgress progress={detectionProgress} />
            )}
          </section>

          <aside className="dashboard-rail">
            <div className="dashboard-rail__timer">{railTimerSlot}</div>

            <BentoCard className="police-card glass-card--elev-low dashboard-rail__police">
              <WantedBanner captures={totalCaptures} />
              <div className="police-card__officer">
                <PoliceMascot state={mascotState} />
              </div>
            </BentoCard>
          </aside>
        </main>

        {alertPopupOpen ? (
          <div
            className={`alert-warning-strip ${alertState === "RECOVERING" ? "alert-warning-strip--recovering" : ""}`}
            role="alert"
            aria-live="assertive"
          >
            <span className="alert-warning-strip__icon" aria-hidden>
              {alertState === "RECOVERING" ? "🟡" : "🚨"}
            </span>
            <span className="alert-warning-strip__text">
              {alertState === "RECOVERING"
                ? "Confirming focus..."
                : "PHONE DETECTED"}
            </span>
          </div>
        ) : null}

        <AlertMode
          alertState={alertState}
          alertMessage={alertMessage}
          recoveryCountdown={recoveryCountdown}
          violationLevel={Math.min(3, Math.max(1, violationCount))}
          onBackToWork={backToWork}
          onStopSession={stopSession}
        />
      </div>

      <Toast message="✓ Focus restored" visible={bottomToastVisible} />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertMode } from "./AlertMode";
import { BentoCard } from "./BentoCard";
import { CameraPreview } from "./CameraPreview";
import { DailyRecordPanel } from "./DailyRecord";
import { DetectionProgress } from "./DetectionProgress";
import { FocusTimerCard } from "./FocusTimerCard";
import { OffenseBadge } from "./OffenseBadge";
import { PoliceMascot } from "./PoliceMascot";
import { SessionSummaryCard } from "./SessionSummaryCard";
import { SessionTerminatedCard } from "./SessionTerminatedCard";
import { StrictModeToggle } from "./StrictModeToggle";
import { Toast } from "./Toast";
import { WantedBanner } from "./WantedBanner";
import { pickAlertMessage, pickOfficerLine } from "@/lib/alertMessages";
import {
  PHONE_LOST_MS,
  RECOVERY_FEEDBACK_MS,
  RECOVERY_SECONDS,
  SIREN_FADE_RECOVERY_MS,
  STRICT_VIOLATION_LIMIT,
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
  loadDailyRecord,
  loadSettings,
  loadTotalCaptures,
  recordCompletedSession,
  saveActiveSession,
  saveDailyRecord,
  saveSettings,
  type DailyRecord,
} from "@/lib/storage";
import type {
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

function mascotStateFromSession(
  sessionState: SessionState,
  strictMode: boolean,
  violations: number
): MascotState {
  if (sessionState === "IDLE") return "IDLE";
  if (sessionState === "SESSION_TERMINATED") return "STRICT";
  if (sessionState === "RECOVERY") return "RECOVERY";
  if (sessionState === "ALERT" || sessionState === "PHONE_CONFIRMED") {
    return "ALERT";
  }
  if (sessionState === "PHONE_SUSPECTED") return "WATCHING";
  if (strictMode && violations >= 2) return "STRICT";
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
  const [strictMode, setStrictMode] = useState(false);
  const [totalCaptures, setTotalCaptures] = useState(0);
  const [dailyRecord, setDailyRecord] = useState<DailyRecord>(() =>
    loadDailyRecord()
  );

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
    const settings = loadSettings();
    setStrictMode(settings.strictMode);
    setTotalCaptures(loadTotalCaptures());
    setDailyRecord(loadDailyRecord());

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
      sessionStateRef.current === "SESSION_COMPLETE" ||
      sessionStateRef.current === "SESSION_TERMINATED"
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
    stopLoop();
    stopSpeech();
    clearSirenAmbientClasses();
  }, [stopLoop, stopSpeech]);

  const playAlertAudio = useCallback(() => {
    playClick();
    void speakAlertOnce();
  }, [playClick, speakAlertOnce]);

  const enterLockedIn = useCallback(() => {
    recoveryStartedRef.current = false;
    phoneClearSinceRef.current = null;
    setRecoveryElapsed(0);
    recoveryElapsedRef.current = 0;
    setSessionState("LOCKED_IN");
    setSurveillancePhase("live");
    setDetectionProgress(0);
    setConfidenceLevelState("none");
  }, []);

  const resetDetectionRef = useRef<() => void>(() => undefined);

  const terminateSession = useCallback(() => {
    stopAllEffects();
    clearSequenceTimers();
    clearRecoveryInterval();
    setSurveillancePhase("live");
    setSessionState("SESSION_TERMINATED");
    saveActiveSession(null);
  }, [stopAllEffects, clearSequenceTimers, clearRecoveryInterval]);

  const finishRecovery = useCallback(() => {
    clearRecoveryInterval();
    stopLoop(SIREN_FADE_RECOVERY_MS);
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
    if (sessionStateRef.current !== "ALERT") return;
    if (strictMode) return;

    recoveryStartedRef.current = true;
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
      if (recoveryElapsedRef.current >= RECOVERY_SECONDS) {
        finishRecovery();
      }
    }, 1000);
  }, [
    strictMode,
    stopSpeech,
    clearSequenceTimers,
    clearRecoveryInterval,
    finishRecovery,
  ]);

  const enterAlert = useCallback(() => {
    violationCountRef.current += 1;
    setViolationCount(violationCountRef.current);
    currentStreakRef.current = 0;
    recoveryStartedRef.current = false;
    phoneClearSinceRef.current = null;

    const captures = incrementTotalCaptures();
    setTotalCaptures(captures);

    const daily = loadDailyRecord();
    const nextDaily = {
      ...daily,
      violations: daily.violations + 1,
    };
    saveDailyRecord(nextDaily);
    setDailyRecord(nextDaily);

    if (strictMode && violationCountRef.current >= STRICT_VIOLATION_LIMIT) {
      terminateSession();
      return;
    }

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

    setSessionState("ALERT");
    setSurveillancePhase("snapshot");
    setDetectionProgress(0);
    playAlertAudio();

    schedule(() => setSurveillancePhase("darken"), SURVEILLANCE_FREEZE_MS);
    schedule(() => setSurveillancePhase("live"), SURVEILLANCE_RESUME_MS);
  }, [strictMode, playAlertAudio, schedule, terminateSession]);

  const enterPhoneSuspected = useCallback(() => {
    if (sessionStateRef.current !== "LOCKED_IN") return;
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

      const state = sessionStateRef.current;

      if (state === "RECOVERY" && signal.smoothedPositive) {
        recoveryElapsedRef.current = 0;
        setRecoveryElapsed(0);
        return;
      }

      if (state === "ALERT" && !recoveryStartedRef.current) {
        if (signal.smoothedPositive) {
          phoneClearSinceRef.current = null;
        } else {
          if (phoneClearSinceRef.current === null) {
            phoneClearSinceRef.current = Date.now();
          } else if (
            Date.now() - phoneClearSinceRef.current >= PHONE_LOST_MS
          ) {
            beginRecoveryCountdown();
          }
        }
      }
    },
    [beginRecoveryCountdown]
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
      resetDetectionRef.current();
      enterLockedIn();
    },
  });

  resetDetectionRef.current = resetDetection;

  const backToWork = useCallback(() => {
    if (sessionStateRef.current !== "ALERT") return;
    if (strictMode) return;
    beginRecoveryCountdown();
  }, [strictMode, beginRecoveryCountdown]);

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

    const focusedMinutes = Math.round(
      focusSecondsRef.current / 60
    );
    setDailyRecord(recordCompletedSession(focusedMinutes, violations));
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

  const handleStrictModeChange = useCallback((next: boolean) => {
    setStrictMode(next);
    saveSettings({ strictMode: next });
  }, []);

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
  const isTerminated = sessionState === "SESSION_TERMINATED";
  const isRecovering = sessionState === "RECOVERY";
  const isActive =
    sessionState !== "IDLE" &&
    sessionState !== "SESSION_COMPLETE" &&
    sessionState !== "SESSION_TERMINATED";
  const alertOpen = sessionState === "ALERT";
  const sirenEraActive =
    sessionState === "ALERT" || sessionState === "RECOVERY";
  const phoneSuspected = sessionState === "PHONE_SUSPECTED";
  const showDetectionProgress =
    phoneSuspected || sessionState === "PHONE_CONFIRMED";
  const timerPaused =
    alertOpen || isRecovering || isTerminated || isSessionComplete;

  const mascotState = useMemo(
    () => mascotStateFromSession(sessionState, strictMode, violationCount),
    [sessionState, strictMode, violationCount]
  );

  const cameraState: CameraState = useMemo(() => {
    if (sessionState === "ALERT" || isRecovering) return "alert";
    if (phoneSuspected || sessionState === "PHONE_CONFIRMED") {
      return "phone-suspected";
    }
    if (isActive) return "active";
    return "ready";
  }, [sessionState, phoneSuspected, isRecovering, isActive]);

  const cameraSessionStatus: CameraSessionStatus = useMemo(() => {
    if (sessionState === "ALERT" || sessionState === "PHONE_CONFIRMED") {
      return "phone-found";
    }
    if (isActive) return "locked-in";
    return "ready";
  }, [sessionState, isActive]);

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
    if (!sirenEraActive) return;

    document.body.classList.add("alert-era-active");
    document.documentElement.classList.add("alert-era-active");
    void playLoop(sirenIntensity, sirenVolumeScale(violationCount));
    applySirenAmbientClasses(violationCount);

    return () => {
      document.body.classList.remove("alert-era-active");
      document.documentElement.classList.remove("alert-era-active");
      clearSirenAmbientClasses();
    };
  }, [sirenEraActive, playLoop, sirenIntensity, violationCount]);

  const railTimerSlot = isTerminated ? (
    <SessionTerminatedCard onDone={stopSession} />
  ) : isSessionComplete && sessionSummary ? (
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
    <div className="lock-in-app page-grain bg-canvas text-text">
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
              sessionActive={isActive || isSessionComplete || isTerminated}
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
            {railTimerSlot}
            {isActive && !isTerminated ? (
              <OffenseBadge violations={violationCount} />
            ) : null}
            <StrictModeToggle
              enabled={strictMode}
              onChange={handleStrictModeChange}
              disabled={isActive && !isLanding}
            />
            <DailyRecordPanel record={dailyRecord} />

            <BentoCard className="police-card glass-card--elev-low">
              <WantedBanner captures={totalCaptures} />
              <div className="police-card__officer">
                <PoliceMascot
                  state={mascotState}
                  strictMode={strictMode}
                  violationCount={violationCount}
                />
              </div>
            </BentoCard>
          </aside>
        </main>

        {alertOpen ? (
          <div className="alert-warning-strip" role="alert" aria-live="assertive">
            <span className="alert-warning-strip__icon" aria-hidden>
              ⚠
            </span>
            <span className="alert-warning-strip__text">PHONE DETECTED</span>
          </div>
        ) : null}

        <AlertMode
          open={alertOpen}
          alertMessage={alertMessage}
          violationLevel={Math.min(3, Math.max(1, violationCount))}
          onBackToWork={backToWork}
          onStopSession={stopSession}
        />
      </div>

      <Toast message="✓ Focus restored" visible={bottomToastVisible} />
    </div>
  );
}

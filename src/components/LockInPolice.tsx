"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertMode } from "./AlertMode";
import { BentoCard } from "./BentoCard";
import { CameraPreview } from "./CameraPreview";
import { DetectionProgress } from "./DetectionProgress";
import { FocusTimerCard } from "./FocusTimerCard";
import { PoliceMascot } from "./PoliceMascot";
import { SessionStatsFooter } from "./SessionStatsFooter";
import { SessionSummaryCard } from "./SessionSummaryCard";
import { Toast } from "./Toast";
import { pickAlertMessage, pickOfficerLine } from "@/lib/alertMessages";
import {
  RECOVERY_FEEDBACK_MS,
  SURVEILLANCE_FREEZE_MS,
  SURVEILLANCE_RESUME_MS,
} from "@/lib/constants";
import type {
  CameraSessionStatus,
  CameraState,
  ConfidenceLevel,
  DetectionSignal,
  OfficerVariant,
  SessionState,
  SessionSummary,
  SirenIntensity,
  SurveillancePhase,
} from "@/lib/types";
import { isValidMinutesInput, parseMinutesInput } from "@/lib/utils";
import { usePhoneObjectDetection } from "@/hooks/usePhoneObjectDetection";
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

function violationToIntensity(count: number): SirenIntensity {
  if (count >= 3) return "max";
  if (count >= 2) return "strong";
  return "soft";
}

function computeFocusPercent(
  focusSeconds: number,
  totalSeconds: number
): number {
  if (totalSeconds <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((focusSeconds / totalSeconds) * 100)));
}

export function LockInPolice() {
  const [sessionState, setSessionState] = useState<SessionState>("IDLE");
  const sessionStateRef = useRef<SessionState>("IDLE");
  const [minutesInput, setMinutesInput] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [surveillancePhase, setSurveillancePhase] =
    useState<SurveillancePhase>("live");
  const [alertMessage, setAlertMessage] = useState("");
  const [officerCaption, setOfficerCaption] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [justLocked, setJustLocked] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(
    null
  );

  const [bottomToastVisible, setBottomToastVisible] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [confidenceLevelState, setConfidenceLevelState] =
    useState<ConfidenceLevel>("none");
  const [liveFocusPercent, setLiveFocusPercent] = useState(100);

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

  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceTimersRef = useRef<number[]>([]);
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

  const enterLockedIn = useCallback(() => {
    setSessionState("LOCKED_IN");
    setSurveillancePhase("live");
    setOfficerCaption(null);
    setDetectionProgress(0);
    setConfidenceLevelState("none");
  }, []);

  const resetDetectionRef = useRef<() => void>(() => undefined);

  const enterAlert = useCallback(() => {
    violationCountRef.current += 1;
    setViolationCount(violationCountRef.current);
    currentStreakRef.current = 0;

    const violation = Math.min(
      3,
      violationCountRef.current
    ) as 1 | 2 | 3;
    const intensity = violationToIntensity(violationCountRef.current);
    setSirenIntensity(intensity);

    const message = pickAlertMessage(lastAlertMessageRef.current, intensity);
    lastAlertMessageRef.current = message;
    setAlertMessage(message);

    if (violation >= 3) {
      const line = pickOfficerLine(violation, lastOfficerLineRef.current);
      lastOfficerLineRef.current = line;
      setOfficerCaption(line);
    } else {
      setOfficerCaption(null);
    }

    setSessionState("ALERT");
    setSurveillancePhase("snapshot");
    setDetectionProgress(0);
    playAlertAudio();

    schedule(() => setSurveillancePhase("darken"), SURVEILLANCE_FREEZE_MS);
    schedule(() => setSurveillancePhase("live"), SURVEILLANCE_RESUME_MS);
  }, [playAlertAudio, schedule]);

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

  const handleDetectionSignal = useCallback((signal: DetectionSignal) => {
    setDetectionProgress(signal.progress);
    setConfidenceLevelState(confidenceLevel(signal.confidence));
  }, []);

  const detectionEnabled =
    sessionState === "LOCKED_IN" || sessionState === "PHONE_SUSPECTED";

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

  const beginRecovery = useCallback(() => {
    stopAllEffects();
    clearSequenceTimers();
    setSurveillancePhase("live");
    setSessionState("RECOVERY");
    setDetectionProgress(0);
    setConfidenceLevelState("none");
    setBottomToastVisible(true);

    document.body.classList.add("recovery-pulse-active");
    document.documentElement.classList.add("recovery-pulse-active");

    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = setTimeout(() => {
      recoveryTimerRef.current = null;
      setBottomToastVisible(false);
      document.body.classList.remove("recovery-pulse-active");
      document.documentElement.classList.remove("recovery-pulse-active");
      resetDetection();
      enterLockedIn();
    }, RECOVERY_FEEDBACK_MS);
  }, [stopAllEffects, clearSequenceTimers, resetDetection, enterLockedIn]);

  const backToWork = useCallback(() => {
    if (sessionStateRef.current !== "ALERT") return;
    beginRecovery();
  }, [beginRecovery]);

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
    setLiveFocusPercent(100);
    setSessionSummary(null);
  }, []);

  const completeSession = useCallback(() => {
    stopAllEffects();
    clearSequenceTimers();
    setSurveillancePhase("live");
    setDetectionProgress(0);
    setConfidenceLevelState("none");

    const total = initialSessionSecondsRef.current;
    const focusPercent = computeFocusPercent(focusSecondsRef.current, total);

    setSessionSummary({
      focusPercent,
      pickups: violationCountRef.current,
      longestStreakMinutes: Math.floor(longestStreakRef.current / 60),
    });
    setSessionState("SESSION_COMPLETE");
  }, [stopAllEffects, clearSequenceTimers]);

  const startSession = () => {
    if (!lockInEnabled) return;
    const m = parseMinutesInput(minutesInput);
    const total = m * 60;
    setSecondsLeft(total);
    initialSessionSecondsRef.current = total;
    resetSessionMetrics();
    stopAllEffects();
    clearSequenceTimers();
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    violationCountRef.current = 0;
    setViolationCount(0);
    lastAlertMessageRef.current = null;
    lastOfficerLineRef.current = null;
    resetDetection();
    setBottomToastVisible(false);
    setSurveillancePhase("live");
    setOfficerCaption(null);
    setSirenIntensity("soft");
    setJustLocked(true);
    setSessionState("LOCKED_IN");
    void warmupPhoneDetector();
    window.setTimeout(() => setJustLocked(false), 520);
  };

  const stopSession = useCallback(() => {
    stopAllEffects();
    clearSequenceTimers();
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    violationCountRef.current = 0;
    setViolationCount(0);
    lastAlertMessageRef.current = null;
    lastOfficerLineRef.current = null;
    resetDetection();
    resetSessionMetrics();
    setBottomToastVisible(false);
    setSurveillancePhase("live");
    setOfficerCaption(null);
    setSirenIntensity("soft");
    setDetectionProgress(0);
    setConfidenceLevelState("none");
    setSecondsLeft(0);
    setSessionState("IDLE");
    document.body.classList.remove("siren-ambient-active");
    document.body.classList.remove("recovery-pulse-active");
    document.body.classList.remove("phone-suspected-ambient");
    document.documentElement.classList.remove("siren-ambient-active");
    document.documentElement.classList.remove("recovery-pulse-active");
    document.documentElement.classList.remove("phone-suspected-ambient");
  }, [stopAllEffects, clearSequenceTimers, resetDetection, resetSessionMetrics]);

  useEffect(() => {
    if (sessionState !== "LOCKED_IN") return;
    const id = setInterval(() => {
      focusSecondsRef.current += 1;
      currentStreakRef.current += 1;
      if (currentStreakRef.current > longestStreakRef.current) {
        longestStreakRef.current = currentStreakRef.current;
      }

      setSecondsLeft((s) => {
        const next = s <= 1 ? 0 : s - 1;
        const elapsed = Math.max(
          1,
          initialSessionSecondsRef.current - next
        );
        setLiveFocusPercent(
          computeFocusPercent(focusSecondsRef.current, elapsed)
        );
        if (s <= 1) completeSession();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sessionState, completeSession]);

  useEffect(() => {
    return () => {
      clearSequenceTimers();
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    };
  }, [clearSequenceTimers]);

  const isLanding = sessionState === "IDLE";
  const isSessionComplete = sessionState === "SESSION_COMPLETE";
  const isActive =
    sessionState !== "IDLE" && sessionState !== "SESSION_COMPLETE";
  const alertOpen = sessionState === "ALERT";
  const phoneSuspected = sessionState === "PHONE_SUSPECTED";
  const showDetectionProgress =
    phoneSuspected || sessionState === "PHONE_CONFIRMED";
  const showSessionStats = isActive && !isSessionComplete;

  const cameraState: CameraState = useMemo(() => {
    if (sessionState === "RECOVERY") return "recovered";
    if (sessionState === "ALERT") return "alert";
    if (phoneSuspected || sessionState === "PHONE_CONFIRMED") {
      return "phone-suspected";
    }
    if (sessionState === "LOCKED_IN" || sessionState === "SESSION_COMPLETE") {
      return "active";
    }
    return "ready";
  }, [sessionState, phoneSuspected]);

  const cameraSessionStatus: CameraSessionStatus = useMemo(() => {
    if (sessionState === "ALERT" || sessionState === "PHONE_CONFIRMED") {
      return "phone-found";
    }
    if (isActive) return "locked-in";
    return "ready";
  }, [sessionState, isActive]);

  const officerVariant: OfficerVariant = useMemo(() => {
    if (sessionState === "ALERT") return "alert";
    if (sessionState === "RECOVERY") return "recovered";
    if (phoneSuspected) return "watching";
    return "idle";
  }, [sessionState, phoneSuspected]);

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
    if (!alertOpen) return;

    playLoop(sirenIntensity);
    document.body.classList.add("siren-ambient-active");
    document.documentElement.classList.add("siren-ambient-active");

    return () => {
      stopLoop();
      document.body.classList.remove("siren-ambient-active");
      document.documentElement.classList.remove("siren-ambient-active");
    };
  }, [alertOpen, playLoop, stopLoop, sirenIntensity]);

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
            {isSessionComplete && sessionSummary ? (
              <SessionSummaryCard
                summary={sessionSummary}
                onDone={stopSession}
              />
            ) : (
              <FocusTimerCard
                isLanding={isLanding}
                isActive={isActive}
                timerPaused={alertOpen}
                justLocked={justLocked}
                minutesInput={minutesInput}
                secondsLeft={secondsLeft}
                lockInEnabled={lockInEnabled}
                onMinutesInputChange={setMinutesInput}
                onLockIn={startSession}
                onStopSession={stopSession}
              />
            )}

            <BentoCard className="police-card glass-card--elev-low">
              <div className="police-card__officer">
                <PoliceMascot
                  variant={officerVariant}
                  pickupCount={violationCount}
                />
              </div>
              {officerCaption ? (
                <p className="police-card__caption">{officerCaption}</p>
              ) : null}
              {showSessionStats ? (
                <SessionStatsFooter
                  pickups={violationCount}
                  focusPercent={liveFocusPercent}
                />
              ) : isSessionComplete && sessionSummary ? (
                <SessionStatsFooter
                  pickups={sessionSummary.pickups}
                  focusPercent={sessionSummary.focusPercent}
                />
              ) : null}
            </BentoCard>
          </aside>
        </main>

        <AlertMode
          open={alertOpen}
          alertMessage={alertMessage}
          violationLevel={Math.min(3, violationCount)}
          onBackToWork={backToWork}
          onStopSession={stopSession}
        />
      </div>

      <Toast message="✓ Focus restored" visible={bottomToastVisible} />
    </div>
  );
}

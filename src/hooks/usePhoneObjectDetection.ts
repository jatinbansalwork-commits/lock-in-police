"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  clearDetectOrigin,
  markDetectOrigin,
  reportDetectSuspected,
} from "@/lib/detectTiming";
import {
  PHONE_BBOX_IOU_MIN,
  PHONE_CONFIRM_MS,
  PHONE_CONSECUTIVE_REQUIRED,
  PHONE_DETECT_INTERVAL_MS,
  PHONE_HISTORY_POSITIVE_MIN,
  PHONE_HISTORY_WINDOW,
  PHONE_LOST_MS,
  PHONE_MAX_AREA_RATIO,
  PHONE_MIN_AREA_RATIO,
  PHONE_MODEL_MIN_SCORE,
  PHONE_SUSPECT_MS,
  PHONE_THRESHOLD,
} from "@/lib/constants";
import {
  getPhoneDetector,
  warmupPhoneDetector,
  type PhoneDetectorModel,
} from "@/lib/phoneDetectorModel";
import type { DetectionSignal } from "@/lib/types";

type PhoneDetection = {
  class: string;
  score: number;
  bbox: [number, number, number, number];
};

type Bbox = [number, number, number, number];

function bboxArea(b: Bbox): number {
  return b[2] * b[3];
}

function bboxIoU(a: Bbox, b: Bbox): number {
  const ax2 = a[0] + a[2];
  const ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2];
  const by2 = b[1] + b[3];
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = bboxArea(a) + bboxArea(b) - inter;
  return union > 0 ? inter / union : 0;
}

/** Static-friendly geometry — partial, close-up, and handheld phones. */
function passesGeometry(
  det: PhoneDetection,
  videoWidth: number,
  videoHeight: number
): boolean {
  const [x, y, w, h] = det.bbox;
  const frameArea = videoWidth * videoHeight;
  const boxArea = w * h;
  if (frameArea <= 0 || boxArea <= 0) return false;

  const areaRatio = boxArea / frameArea;
  if (areaRatio < PHONE_MIN_AREA_RATIO || areaRatio > PHONE_MAX_AREA_RATIO) {
    return false;
  }

  const aspect = w / h;
  if (aspect < 0.32 || aspect > 2.8) return false;

  const cx = x + w / 2;
  const cy = y + h / 2;
  const marginX = videoWidth * 0.02;
  const marginY = videoHeight * 0.02;
  return (
    cx >= marginX &&
    cy >= marginY &&
    cx <= videoWidth - marginX &&
    cy <= videoHeight - marginY
  );
}

function pickBestPhone(
  predictions: PhoneDetection[],
  videoWidth: number,
  videoHeight: number,
  lastBbox: Bbox | null
): { confidence: number; bbox: Bbox | null; framePositive: boolean } {
  let bestScore = 0;
  let bestBbox: Bbox | null = null;
  let continuityScore = 0;
  let continuityBbox: Bbox | null = null;

  for (const det of predictions) {
    if (det.class !== "cell phone") continue;
    if (!passesGeometry(det, videoWidth, videoHeight)) continue;

    const score = det.score;
    if (score > bestScore) {
      bestScore = score;
      bestBbox = det.bbox;
    }

    if (lastBbox) {
      const iou = bboxIoU(det.bbox, lastBbox);
      if (iou >= PHONE_BBOX_IOU_MIN && score > continuityScore) {
        continuityScore = score;
        continuityBbox = det.bbox;
      }
    }
  }

  const chosenScore =
    continuityBbox && continuityScore >= PHONE_THRESHOLD * 0.85
      ? continuityScore
      : bestScore;
  const chosenBbox = continuityBbox ?? bestBbox;

  return {
    confidence: chosenScore,
    bbox: chosenBbox,
    framePositive: chosenScore >= PHONE_THRESHOLD,
  };
}

function countPositive(history: boolean[]): number {
  return history.filter(Boolean).length;
}

function hasConsecutivePositive(history: boolean[], n: number): boolean {
  if (history.length < n) return false;
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]) {
      streak += 1;
      if (streak >= n) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}

function isStablePositive(history: boolean[]): boolean {
  const window = history.slice(-PHONE_HISTORY_WINDOW);
  if (window.length < PHONE_CONSECUTIVE_REQUIRED) return false;
  if (hasConsecutivePositive(window, PHONE_CONSECUTIVE_REQUIRED)) return true;
  if (
    window.length >= PHONE_HISTORY_POSITIVE_MIN &&
    countPositive(window) >= PHONE_HISTORY_POSITIVE_MIN
  ) {
    return true;
  }
  return false;
}

function progressFromHistory(history: boolean[]): number {
  const window = history.slice(-PHONE_HISTORY_WINDOW);
  const positives = countPositive(window);
  return Math.min(5, Math.ceil((positives / PHONE_HISTORY_WINDOW) * 5));
}

async function runInference(
  model: PhoneDetectorModel,
  video: HTMLVideoElement,
  lastBbox: Bbox | null
) {
  const predictions = await model.detect(
    video,
    10,
    PHONE_MODEL_MIN_SCORE
  );
  return pickBestPhone(
    predictions,
    video.videoWidth,
    video.videoHeight,
    lastBbox
  );
}

export function usePhoneObjectDetection({
  video,
  enabled,
  onSignal,
  onPhoneSuspected,
  onPhoneConfirmed,
  onPhoneLost,
}: {
  video: HTMLVideoElement | null;
  enabled: boolean;
  onSignal?: (signal: DetectionSignal) => void;
  onPhoneSuspected: () => void;
  onPhoneConfirmed: () => void;
  onPhoneLost: () => void;
}) {
  const detectingRef = useRef(false);
  const historyRef = useRef<boolean[]>([]);
  const lastBboxRef = useRef<Bbox | null>(null);
  const suspectedFiredRef = useRef(false);
  const confirmedFiredRef = useRef(false);
  const positiveSinceRef = useRef<number | null>(null);
  const lostSinceRef = useRef<number | null>(null);
  const lastInferAtRef = useRef(0);

  const onSignalRef = useRef(onSignal);
  const onPhoneSuspectedRef = useRef(onPhoneSuspected);
  const onPhoneConfirmedRef = useRef(onPhoneConfirmed);
  const onPhoneLostRef = useRef(onPhoneLost);
  onSignalRef.current = onSignal;
  onPhoneSuspectedRef.current = onPhoneSuspected;
  onPhoneConfirmedRef.current = onPhoneConfirmed;
  onPhoneLostRef.current = onPhoneLost;

  useEffect(() => {
    if (!enabled) {
      positiveSinceRef.current = null;
      lostSinceRef.current = null;
      return;
    }

    void warmupPhoneDetector();

    let cancelled = false;
    let rafId = 0;

    const processFrame = async (now: number) => {
      if (cancelled || !video) return;

      const model = getPhoneDetector();
      if (!model || video.readyState < 2 || video.videoWidth === 0) return;
      if (detectingRef.current) return;
      if (now - lastInferAtRef.current < PHONE_DETECT_INTERVAL_MS) return;

      lastInferAtRef.current = now;
      detectingRef.current = true;

      try {
        const { confidence, bbox, framePositive } = await runInference(
          model,
          video,
          lastBboxRef.current
        );

        if (bbox) lastBboxRef.current = bbox;
        else if (!framePositive) lastBboxRef.current = null;

        const history = historyRef.current;
        history.push(framePositive);
        while (history.length > PHONE_HISTORY_WINDOW) {
          history.shift();
        }

        const stable = isStablePositive(history);
        const progress = progressFromHistory(history);

        onSignalRef.current?.({
          smoothedPositive: stable,
          confidence,
          progress,
        });

        const ts = Date.now();

        if (stable) {
          lostSinceRef.current = null;
          if (positiveSinceRef.current === null) {
            positiveSinceRef.current = ts;
            markDetectOrigin();
          }

          const elapsed = ts - positiveSinceRef.current;

          if (!suspectedFiredRef.current && elapsed >= PHONE_SUSPECT_MS) {
            suspectedFiredRef.current = true;
            reportDetectSuspected();
            onPhoneSuspectedRef.current();
          }

          if (!confirmedFiredRef.current && elapsed >= PHONE_CONFIRM_MS) {
            confirmedFiredRef.current = true;
            onPhoneConfirmedRef.current();
          }
        } else {
          positiveSinceRef.current = null;
          clearDetectOrigin();

          if (suspectedFiredRef.current && !confirmedFiredRef.current) {
            if (lostSinceRef.current === null) {
              lostSinceRef.current = ts;
            } else if (ts - lostSinceRef.current >= PHONE_LOST_MS) {
              onPhoneLostRef.current();
            }
          } else {
            lostSinceRef.current = null;
          }
        }
      } catch {
        onSignalRef.current?.({
          smoothedPositive: false,
          confidence: 0,
          progress: 0,
        });
      } finally {
        detectingRef.current = false;
      }
    };

    const tick = (now: number) => {
      if (cancelled) return;
      rafId = requestAnimationFrame(tick);
      void processFrame(now);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [video, enabled]);

  const resetDetection = useCallback(() => {
    historyRef.current = [];
    lastBboxRef.current = null;
    suspectedFiredRef.current = false;
    confirmedFiredRef.current = false;
    positiveSinceRef.current = null;
    lostSinceRef.current = null;
    lastInferAtRef.current = 0;
    clearDetectOrigin();
    onSignalRef.current?.({
      smoothedPositive: false,
      confidence: 0,
      progress: 0,
    });
  }, []);

  return { resetDetection };
}

export { warmupPhoneDetector };

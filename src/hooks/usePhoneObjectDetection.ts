"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  PHONE_CONFIDENCE_MIN,
  PHONE_DEBOUNCE_MS,
  PHONE_DETECT_INTERVAL_MS,
  PHONE_MIN_AREA_RATIO,
} from "@/lib/constants";
import type { DetectionDebug } from "@/lib/types";

type PhoneDetection = {
  class: string;
  score: number;
  bbox: [number, number, number, number];
};

type CocoModel = {
  detect: (
    input: HTMLVideoElement,
    maxNumBoxes?: number,
    minScore?: number
  ) => Promise<PhoneDetection[]>;
};

function bestPhoneScore(
  predictions: PhoneDetection[],
  videoWidth: number,
  videoHeight: number
): { visible: boolean; confidence: number } {
  let best = 0;
  for (const det of predictions) {
    if (det.class !== "cell phone") continue;

    const [x, y, w, h] = det.bbox;
    const frameArea = videoWidth * videoHeight;
    const boxArea = w * h;
    if (frameArea <= 0 || boxArea <= 0) continue;

    const areaRatio = boxArea / frameArea;
    if (areaRatio < PHONE_MIN_AREA_RATIO || areaRatio > 0.35) continue;

    const aspect = w / h;
    if (aspect < 0.45 || aspect > 2.2) continue;

    const cx = x + w / 2;
    const cy = y + h / 2;
    const marginX = videoWidth * 0.05;
    const marginY = videoHeight * 0.05;
    if (
      cx < marginX ||
      cy < marginY ||
      cx > videoWidth - marginX ||
      cy > videoHeight - marginY
    ) {
      continue;
    }

    if (det.score > best) best = det.score;
  }

  return {
    visible: best >= PHONE_CONFIDENCE_MIN,
    confidence: best,
  };
}

export function usePhoneObjectDetection({
  video,
  enabled,
  onDebug,
  onPhoneSustained,
  onPhoneLost,
}: {
  video: HTMLVideoElement | null;
  enabled: boolean;
  onDebug?: (debug: DetectionDebug) => void;
  onPhoneSustained: () => void;
  onPhoneLost: () => void;
}) {
  const modelRef = useRef<CocoModel | null>(null);
  const loadingRef = useRef(false);
  const visibleSinceRef = useRef<number | null>(null);
  const sustainedFiredRef = useRef(false);
  const detectingRef = useRef(false);
  const phoneVisibleRef = useRef(false);

  const onDebugRef = useRef(onDebug);
  const onPhoneSustainedRef = useRef(onPhoneSustained);
  const onPhoneLostRef = useRef(onPhoneLost);
  onDebugRef.current = onDebug;
  onPhoneSustainedRef.current = onPhoneSustained;
  onPhoneLostRef.current = onPhoneLost;

  useEffect(() => {
    if (!enabled) {
      visibleSinceRef.current = null;
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadModel = async () => {
      if (modelRef.current || loadingRef.current || cancelled) return;
      loadingRef.current = true;
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const cocoSsd = await import("@tensorflow-models/coco-ssd");
        if (cancelled) return;
        modelRef.current = (await cocoSsd.load({
          base: "lite_mobilenet_v2",
        })) as CocoModel;
      } catch {
        modelRef.current = null;
      } finally {
        loadingRef.current = false;
      }
    };

    void loadModel();

    intervalId = setInterval(async () => {
      if (cancelled || !video || !modelRef.current || detectingRef.current) {
        return;
      }
      if (video.readyState < 2 || video.videoWidth === 0) return;

      detectingRef.current = true;
      try {
        const predictions = await modelRef.current.detect(video, 6, 0.55);
        const { visible, confidence } = bestPhoneScore(
          predictions,
          video.videoWidth,
          video.videoHeight
        );

        onDebugRef.current?.({ phone: visible, confidence });

        const wasVisible = phoneVisibleRef.current;
        phoneVisibleRef.current = visible;

        if (visible && !sustainedFiredRef.current) {
          if (visibleSinceRef.current === null) {
            visibleSinceRef.current = Date.now();
          } else if (
            Date.now() - visibleSinceRef.current >= PHONE_DEBOUNCE_MS
          ) {
            sustainedFiredRef.current = true;
            onPhoneSustainedRef.current();
          }
        } else if (!visible) {
          visibleSinceRef.current = null;
          if (wasVisible) {
            onPhoneLostRef.current();
          }
        }
      } catch {
        onDebugRef.current?.({ phone: false, confidence: 0 });
      } finally {
        detectingRef.current = false;
      }
    }, PHONE_DETECT_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [video, enabled]);

  const resetDetection = useCallback(() => {
    visibleSinceRef.current = null;
    sustainedFiredRef.current = false;
    phoneVisibleRef.current = false;
  }, []);

  const isPhoneVisible = useCallback(() => phoneVisibleRef.current, []);

  return { resetDetection, isPhoneVisible };
}

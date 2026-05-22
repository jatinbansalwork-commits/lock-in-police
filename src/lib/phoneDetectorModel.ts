"use client";

type PhoneDetection = {
  class: string;
  score: number;
  bbox: [number, number, number, number];
};

export type PhoneDetectorModel = {
  detect: (
    input: HTMLVideoElement,
    maxNumBoxes?: number,
    minScore?: number
  ) => Promise<PhoneDetection[]>;
};

let model: PhoneDetectorModel | null = null;
let loadPromise: Promise<PhoneDetectorModel | null> | null = null;

export function getPhoneDetector(): PhoneDetectorModel | null {
  return model;
}

export function isPhoneDetectorReady(): boolean {
  return model !== null;
}

/** Load once and keep hot for the session — never unload. */
export async function warmupPhoneDetector(): Promise<PhoneDetectorModel | null> {
  if (model) return model;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (typeof window === "undefined") return null;
    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      model = (await cocoSsd.load({
        base: "lite_mobilenet_v2",
      })) as PhoneDetectorModel;
      return model;
    } catch {
      model = null;
      return null;
    }
  })();

  return loadPromise;
}

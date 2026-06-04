"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type {
  CameraSessionStatus,
  CameraState,
  ConfidenceLevel,
  SurveillancePhase,
} from "@/lib/types";

type CameraPreviewProps = {
  sessionActive?: boolean;
  streamReady?: boolean;
  cameraState?: CameraState;
  sessionStatus?: CameraSessionStatus;
  surveillancePhase?: SurveillancePhase;
  confidenceLevel?: ConfidenceLevel;
  onVideoReady?: (video: HTMLVideoElement | null) => void;
};

const VIDEO_CONSTRAINTS: MediaStreamConstraints[] = [
  {
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30, max: 30 },
    },
  },
  {
    audio: false,
    video: { facingMode: "user" },
  },
  { audio: false, video: true },
];

const BIND_RETRY_MS = 120;
const BIND_MAX_ATTEMPTS = 40;
const CAMERA_TIMEOUT_MS = 20_000;
const HAVE_CURRENT_DATA = 2;

async function requestCameraStream(): Promise<MediaStream | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  let lastError: unknown;
  for (const constraints of VIDEO_CONSTRAINTS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }

  if (process.env.NODE_ENV === "development" && lastError) {
    console.warn("[CameraPreview] getUserMedia failed:", lastError);
  }
  return null;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.onended = null;
    track.stop();
  });
}

function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HAVE_CURRENT_DATA && video.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video failed to load"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onReady, { once: true });
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function playVideoElement(video: HTMLVideoElement): Promise<void> {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "true");

  try {
    await video.play();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    throw error;
  }
}

const CameraPreviewInner = forwardRef<HTMLDivElement, CameraPreviewProps>(
  function CameraPreviewInner(
    {
      sessionActive = false,
      streamReady = false,
      cameraState = "ready",
      sessionStatus = "ready",
      surveillancePhase = "live",
      confidenceLevel = "none",
      onVideoReady,
    },
    ref
  ) {
    const instanceId = useId();
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const onVideoReadyRef = useRef(onVideoReady);
    const startGenerationRef = useRef(0);
    const mountedRef = useRef(false);

    const [unavailable, setUnavailable] = useState(false);
    const [starting, setStarting] = useState(true);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);
    const [snapshotReady, setSnapshotReady] = useState(false);
    const [localReady, setLocalReady] = useState(false);

    const showSnapshot =
      surveillancePhase === "snapshot" || surveillancePhase === "darken";
    const showLiveVideo = surveillancePhase === "live" && !showSnapshot;

    const statusLabel =
      sessionStatus === "phone-found"
        ? "Phone found"
        : sessionStatus === "locked-in"
          ? "Locked in"
          : null;

    useEffect(() => {
      onVideoReadyRef.current = onVideoReady;
    }, [onVideoReady]);

    const markReady = useCallback((video: HTMLVideoElement) => {
      if (!mountedRef.current) return;
      setLocalReady(true);
      setUnavailable(false);
      setStarting(false);
      setErrorDetail(null);
      onVideoReadyRef.current?.(video);
    }, []);

    const markFailed = useCallback((detail: string) => {
      if (!mountedRef.current) return;
      setUnavailable(true);
      setStarting(false);
      setLocalReady(false);
      setErrorDetail(detail);
      onVideoReadyRef.current?.(null);
    }, []);

    const bindStreamToVideo = useCallback(async (): Promise<boolean> => {
      const video = videoRef.current;
      const stream = streamRef.current;
      if (!video || !stream || !mountedRef.current) return false;

      const track = stream.getVideoTracks()[0];
      if (!track || track.readyState === "ended") return false;

      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      try {
        await waitForVideoFrame(video);
        await playVideoElement(video);
        if (video.videoWidth > 0) {
          markReady(video);
          return true;
        }
        return false;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[CameraPreview] bind/play failed:", error);
        }
        return false;
      }
    }, [markReady]);

    const bindWithRetries = useCallback(
      async (generation: number): Promise<boolean> => {
        for (let attempt = 0; attempt < BIND_MAX_ATTEMPTS; attempt += 1) {
          if (startGenerationRef.current !== generation || !mountedRef.current) {
            return false;
          }
          if (await bindStreamToVideo()) return true;
          await new Promise((resolve) => setTimeout(resolve, BIND_RETRY_MS));
        }
        return false;
      },
      [bindStreamToVideo]
    );

    const watchStreamTrack = useCallback(
      (stream: MediaStream, generation: number) => {
        const track = stream.getVideoTracks()[0];
        if (!track) return;
        track.onended = () => {
          if (startGenerationRef.current !== generation || !mountedRef.current) {
            return;
          }
          markFailed("Camera disconnected — tap Retry");
        };
      },
      [markFailed]
    );

    const startCamera = useCallback(async () => {
      if (!mountedRef.current) return;

      const generation = startGenerationRef.current + 1;
      startGenerationRef.current = generation;

      stopStream(streamRef.current);
      streamRef.current = null;

      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }

      setStarting(true);
      setUnavailable(false);
      setLocalReady(false);
      setErrorDetail(null);
      onVideoReadyRef.current?.(null);

      const isStale = () =>
        !mountedRef.current || startGenerationRef.current !== generation;

      const timeoutId = window.setTimeout(() => {
        if (!isStale() && !streamRef.current) {
          markFailed("Camera is taking too long — tap Retry or allow access");
        }
      }, CAMERA_TIMEOUT_MS);

      const stream = await requestCameraStream();

      window.clearTimeout(timeoutId);

      if (isStale()) {
        stopStream(stream);
        return;
      }

      if (!stream) {
        const needsSecure =
          typeof window !== "undefined" &&
          (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia);
        markFailed(
          needsSecure
            ? "Camera requires HTTPS or localhost"
            : "Camera access denied — allow it in browser settings"
        );
        return;
      }

      streamRef.current = stream;
      watchStreamTrack(stream, generation);

      if (!(await bindWithRetries(generation))) {
        if (!isStale()) {
          markFailed("Could not start video preview — tap Retry");
        }
      }
    }, [bindWithRetries, markFailed, watchStreamTrack]);

    const startCameraRef = useRef(startCamera);
    startCameraRef.current = startCamera;

    const setVideoNode = useCallback(
      (node: HTMLVideoElement | null) => {
        videoRef.current = node;
        if (node && streamRef.current && mountedRef.current) {
          void bindStreamToVideo();
        }
      },
      [bindStreamToVideo]
    );

    useEffect(() => {
      mountedRef.current = true;

      const scheduleStart = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (mountedRef.current) void startCameraRef.current();
          });
        });
      };

      scheduleStart();

      const onPageShow = (event: PageTransitionEvent) => {
        if (event.persisted && mountedRef.current) {
          void startCameraRef.current();
        }
      };

      const onVisibility = () => {
        if (
          document.visibilityState === "visible" &&
          mountedRef.current &&
          streamRef.current
        ) {
          void bindStreamToVideo();
        }
      };

      const releaseCamera = () => {
        startGenerationRef.current += 1;
        stopStream(streamRef.current);
        streamRef.current = null;
      };

      window.addEventListener("pageshow", onPageShow);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pagehide", releaseCamera);

      return () => {
        mountedRef.current = false;
        window.removeEventListener("pageshow", onPageShow);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pagehide", releaseCamera);
        releaseCamera();
        const video = videoRef.current;
        if (video) {
          video.srcObject = null;
        }
        setLocalReady(false);
        setStarting(false);
        onVideoReadyRef.current?.(null);
      };
    }, [bindStreamToVideo]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !streamRef.current || !localReady) return;

      if (showLiveVideo) {
        void playVideoElement(video).catch(() => undefined);
      } else if (surveillancePhase === "snapshot") {
        video.pause();
      }
    }, [showLiveVideo, surveillancePhase, localReady]);

    useEffect(() => {
      if (surveillancePhase !== "snapshot") {
        setSnapshotReady(false);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < HAVE_CURRENT_DATA) return;

      const w = video.videoWidth || video.clientWidth;
      const h = video.videoHeight || video.clientHeight;
      if (w === 0 || h === 0) return;

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      try {
        ctx.drawImage(video, 0, 0, w, h);
        setSnapshotReady(true);
        video.pause();
      } catch {
        setSnapshotReady(false);
      }
    }, [surveillancePhase]);

    const confidenceClass =
      confidenceLevel !== "none"
        ? `camera-shell--confidence-${confidenceLevel}`
        : "";

    const showPlaceholder = unavailable || (starting && !localReady);
    const placeholderMessage = unavailable
      ? errorDetail ?? "Camera unavailable — check permissions and tap Retry"
      : "Starting camera…";

    return (
      <div
        ref={ref}
        className={`camera-shell glass-card glass-card--elev-high camera-shell--${cameraState} ${confidenceClass} ${
          sessionActive ? "camera-shell--session" : ""
        } ${streamReady || localReady ? "camera-shell--stream-ready" : ""} ${
          cameraState === "phone-suspected"
            ? "camera-shell--suspected-ambient"
            : ""
        }`}
        data-camera-instance={instanceId}
      >
        <div className="camera-shell__feed camera-vignette camera-grain">
          {statusLabel ? (
            <div className="camera-shell__status-wrap">
              <span
                className={`camera-shell__status camera-shell__status--${sessionStatus}`}
              >
                <span className="camera-shell__status-dot" aria-hidden />
                {statusLabel}
              </span>
            </div>
          ) : null}
          <video
            ref={setVideoNode}
            autoPlay
            playsInline
            muted
            disablePictureInPicture
            onLoadedMetadata={() => {
              void bindStreamToVideo();
            }}
            onLoadedData={() => {
              void bindStreamToVideo();
            }}
            className={`camera-shell__video ${
              showLiveVideo && localReady
                ? "camera-shell__video--visible"
                : "camera-shell__video--hidden"
            }`}
          />

          <canvas
            ref={canvasRef}
            className={`camera-shell__snapshot ${
              showSnapshot && snapshotReady
                ? "camera-shell__snapshot--visible"
                : ""
            } ${surveillancePhase === "darken" ? "camera-shell__snapshot--darken" : ""}`}
            aria-hidden
          />

          {showPlaceholder && (
            <div className="camera-shell__placeholder" aria-live="polite">
              <p className="camera-shell__placeholder-text">
                {placeholderMessage}
              </p>
              {unavailable ? (
                <button
                  type="button"
                  className="camera-shell__retry app-btn app-btn--secondary"
                  onClick={() => void startCamera()}
                >
                  Retry
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export const CameraPreview = memo(CameraPreviewInner);

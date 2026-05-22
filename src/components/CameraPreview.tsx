"use client";

import { forwardRef, memo, useEffect, useRef, useState } from "react";
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
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [unavailable, setUnavailable] = useState(false);
    const [snapshotReady, setSnapshotReady] = useState(false);
    const [localReady, setLocalReady] = useState(false);

    const showSnapshot =
      surveillancePhase === "snapshot" || surveillancePhase === "darken";
    const showLiveVideo = surveillancePhase === "live" && !showSnapshot;

    const statusLabel =
      sessionStatus === "phone-found"
        ? "PHONE FOUND"
        : sessionStatus === "locked-in"
          ? "LOCKED IN"
          : null;

    useEffect(() => {
      onVideoReady?.(videoRef.current);
    }, [onVideoReady, unavailable, localReady]);

    useEffect(() => {
      let mounted = true;

      (async () => {
        try {
          const local = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 },
            },
          });
          if (!mounted) {
            local.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = local;
          const video = videoRef.current;
          if (video) {
            video.srcObject = local;
            await video.play().catch(() => undefined);
            setLocalReady(true);
            onVideoReady?.(video);
          }
          setUnavailable(false);
        } catch {
          if (mounted) {
            setUnavailable(true);
            setLocalReady(false);
          }
          onVideoReady?.(null);
        }
      })();

      return () => {
        mounted = false;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setLocalReady(false);
        onVideoReady?.(null);
      };
    }, [onVideoReady]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !streamRef.current) return;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      if (showLiveVideo) {
        void video.play().catch(() => undefined);
      } else if (surveillancePhase === "snapshot") {
        video.pause();
      }
    }, [showLiveVideo, surveillancePhase]);

    useEffect(() => {
      if (surveillancePhase !== "snapshot") {
        setSnapshotReady(false);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

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
      >
        <div className="camera-shell__header">
          <div className="camera-shell__title-group">
            <span className="camera-shell__title">Camera Feed</span>
            {statusLabel ? (
              <span
                className={`camera-shell__status camera-shell__status--${sessionStatus}`}
              >
                <span className="camera-shell__status-dot" aria-hidden />
                {statusLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="camera-shell__feed camera-vignette camera-grain">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`camera-shell__video ${
              showLiveVideo
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

          {unavailable && (
            <div className="camera-shell__placeholder" aria-live="polite">
              <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-muted">
                Enable Camera
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export const CameraPreview = memo(CameraPreviewInner);

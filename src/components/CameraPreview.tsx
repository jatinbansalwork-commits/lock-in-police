"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { CameraState, SurveillancePhase } from "@/lib/types";

type CameraPreviewProps = {
  sessionActive?: boolean;
  streamReady?: boolean;
  cameraState?: CameraState;
  surveillancePhase?: SurveillancePhase;
  phoneWarning?: boolean;
  onVideoReady?: (video: HTMLVideoElement | null) => void;
};

function CameraPreviewInner({
  sessionActive = false,
  streamReady = false,
  cameraState = "ready",
  surveillancePhase = "live",
  phoneWarning = false,
  onVideoReady,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [localReady, setLocalReady] = useState(false);

  const showSnapshot =
    surveillancePhase === "snapshot" || surveillancePhase === "darken";
  const showLiveVideo = surveillancePhase === "live" && !showSnapshot;

  const resolvedState: CameraState = phoneWarning
    ? "phone-found"
    : cameraState;

  const liveLabel =
    resolvedState === "phone-found"
      ? "Phone found"
      : resolvedState === "alert"
        ? "Alert"
        : resolvedState === "recovered"
          ? "Live"
          : sessionActive
            ? "Live"
            : localReady
              ? "Live"
              : "Ready";

  useEffect(() => {
    onVideoReady?.(videoRef.current);
  }, [onVideoReady, unavailable, localReady]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const local = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
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

    try {
      ctx.drawImage(video, 0, 0, w, h);
      setSnapshotReady(true);
      video.pause();
    } catch {
      setSnapshotReady(false);
    }
  }, [surveillancePhase]);

  return (
    <div
      className={`camera-shell glass-card camera-shell--${resolvedState} ${
        sessionActive ? "camera-shell--session" : ""
      } ${streamReady || localReady ? "camera-shell--stream-ready" : ""}`}
    >
      <div className="camera-shell__header">
        <span className="text-[14px] font-semibold leading-[18px] text-muted">
          Camera Feed
        </span>
        <div className="camera-live-tag flex items-center gap-1">
          <span className="live-dot h-2 w-2 rounded-full bg-accent" />
          <span className="camera-live-tag__text text-[12px] font-bold uppercase leading-[18px] text-accent">
            {liveLabel}
          </span>
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

export const CameraPreview = memo(CameraPreviewInner);

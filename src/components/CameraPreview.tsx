"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Props = {
  active?: boolean;
  className?: string;
};

export function CameraPreview({ active = false, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let localStream: MediaStream | null = null;

    async function init() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mounted) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(localStream);
        setError(false);
      } catch {
        if (mounted) setError(true);
      }
    }

    init();

    return () => {
      mounted = false;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
  }, [stream]);

  return (
    <motion.div
      className={`glass scanlines relative overflow-hidden rounded-card ${className}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
    >
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-warm-white/80">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        Surveillance Feed
      </div>

      {active && (
        <motion.div
          className="absolute inset-0 z-[5] pointer-events-none border-2 border-accent/30"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative aspect-[4/3] w-full min-h-[280px] bg-black/60 md:min-h-[360px]">
        {!error && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/5 to-transparent p-8 text-center">
            <span className="text-5xl opacity-60">📹</span>
            <p className="text-sm uppercase tracking-[0.2em] text-warm-white/40">
              Camera offline — officer on desk duty
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface/90 to-transparent" />
    </motion.div>
  );
}

"use client";

import type { SessionState } from "@/lib/types";

export function DebugPanel({
  state,
  phone,
  confidence,
  alert,
  recovery,
}: {
  state: SessionState;
  phone: boolean;
  confidence: number;
  alert: boolean;
  recovery: boolean;
}) {
  return (
    <div
      className="debug-panel"
      aria-hidden
    >
      <p>state: {state}</p>
      <p>phone: {String(phone)}</p>
      <p>confidence: {confidence.toFixed(2)}</p>
      <p>alert: {String(alert)}</p>
      <p>recovery: {String(recovery)}</p>
    </div>
  );
}

"use client";

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="toast-enter pointer-events-none fixed bottom-8 left-1/2 z-[70] -translate-x-1/2">
      <p className="toast-message rounded-control border border-muted/25 bg-card px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.2em] text-text">
        {message}
      </p>
    </div>
  );
}

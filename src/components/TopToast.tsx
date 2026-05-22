"use client";

export function TopToast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="top-toast pointer-events-none fixed left-1/2 top-6 z-[70] -translate-x-1/2">
      <p className="top-toast__text">{message}</p>
    </div>
  );
}

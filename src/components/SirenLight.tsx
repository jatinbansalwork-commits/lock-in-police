"use client";

export function SirenLight({ className = "" }: { className?: string }) {
  return (
    <div
      className={`siren-light relative flex h-full w-full items-center justify-center ${className}`}
      aria-hidden
    >
      <div className="siren-light__glow siren-light__glow--red" />
      <div className="siren-light__glow siren-light__glow--blue" />
      <div className="siren-light__rotate">
        <div className="siren-light__beam" />
        <div className="siren-light__beam siren-light__beam--offset" />
      </div>
      <div className="siren-light__dome relative z-10">
        <div className="siren-light__base" />
      </div>
    </div>
  );
}

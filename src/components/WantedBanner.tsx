"use client";

import { memo, useEffect, useRef, useState } from "react";

function WantedBannerInner({ captures }: { captures: number }) {
  const [pulse, setPulse] = useState(false);
  const prevRef = useRef(captures);

  useEffect(() => {
    if (captures > prevRef.current) {
      setPulse(true);
      const id = window.setTimeout(() => setPulse(false), 320);
      prevRef.current = captures;
      return () => clearTimeout(id);
    }
    prevRef.current = captures;
  }, [captures]);

  return (
    <div
      className={`wanted-banner ${pulse ? "wanted-banner--pulse" : ""}`}
      role="status"
    >
      <span className="wanted-banner__title">Most Wanted</span>
      <span className="wanted-banner__capture tabular-nums">
        📱 Phone ({captures} captures)
      </span>
    </div>
  );
}

export const WantedBanner = memo(WantedBannerInner);

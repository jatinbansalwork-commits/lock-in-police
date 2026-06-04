"use client";

import { memo, useEffect, useRef, useState } from "react";
import { formatTimerDisplay } from "@/lib/utils";

function CountdownDisplayInner({ seconds }: { seconds: number }) {
  const [display, setDisplay] = useState(formatTimerDisplay(seconds));
  const prevRef = useRef(seconds);

  useEffect(() => {
    if (prevRef.current === seconds) return;
    prevRef.current = seconds;
    setDisplay(formatTimerDisplay(seconds));
  }, [seconds]);

  return (
    <p className="timer-card__clock" aria-live="polite" key={display}>
      {display}
    </p>
  );
}

export const CountdownDisplay = memo(CountdownDisplayInner);

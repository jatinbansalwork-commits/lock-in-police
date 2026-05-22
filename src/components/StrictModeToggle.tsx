"use client";

import { memo } from "react";

function StrictModeToggleInner({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`strict-toggle ${enabled ? "strict-toggle--on" : ""} ${
        disabled ? "strict-toggle--disabled" : ""
      }`}
    >
      <span className="strict-toggle__label">Strict Mode</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        className="strict-toggle__switch"
        onClick={() => onChange(!enabled)}
      >
        <span className="strict-toggle__thumb" />
        <span className="strict-toggle__state">{enabled ? "ON" : "OFF"}</span>
      </button>
    </label>
  );
}

export const StrictModeToggle = memo(StrictModeToggleInner);

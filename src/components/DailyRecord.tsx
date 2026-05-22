"use client";

import { memo } from "react";
import type { DailyRecord } from "@/lib/storage";

function DailyRecordPanelInner({ record }: { record: DailyRecord }) {
  return (
    <div className="daily-record" aria-label="Today's record">
      <p className="daily-record__heading">Today</p>
      <ul className="daily-record__list">
        <li>
          <span>Sessions</span>
          <span className="tabular-nums">{record.sessions}</span>
        </li>
        <li>
          <span>Focused</span>
          <span className="tabular-nums">{record.focusedMinutes} min</span>
        </li>
        <li>
          <span>Violations</span>
          <span className="tabular-nums">{record.violations}</span>
        </li>
      </ul>
      {record.streak > 0 ? (
        <p className="daily-record__streak">
          🔥 <span className="tabular-nums">{record.streak}</span> Day Streak
        </p>
      ) : null}
    </div>
  );
}

export const DailyRecordPanel = memo(DailyRecordPanelInner);

"use client";

export function SessionStatsFooter({
  pickups,
  focusPercent,
}: {
  pickups: number;
  focusPercent: number;
}) {
  return (
    <footer className="session-stats" aria-label="Session statistics">
      <div className="session-stats__rule" aria-hidden />
      <div className="session-stats__grid">
        <div className="session-stats__item">
          <span className="session-stats__label">Pickups</span>
          <span className="session-stats__value tabular-nums">{pickups}</span>
        </div>
        <div className="session-stats__item">
          <span className="session-stats__label">Focus</span>
          <span className="session-stats__value tabular-nums">{focusPercent}%</span>
        </div>
      </div>
    </footer>
  );
}

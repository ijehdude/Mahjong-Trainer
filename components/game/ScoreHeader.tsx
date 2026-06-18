"use client";

import { WIND_NAME } from "@/types/tiles";
import type { Wind } from "@/types/tiles";

/* ===========================================================================
   Sticky top header + info row for the game screen.
   =========================================================================== */

interface Props {
  stack: number;
  pnl: number;
  correct: number;
  total: number;
  wall: number;
  roundWind: Wind;
  seatWind: Wind;
  handNumber: number;
  onHome: () => void;
  onRestart: () => void;
}

function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export default function ScoreHeader({
  stack,
  pnl,
  correct,
  total,
  wall,
  roundWind,
  seatWind,
  handNumber,
  onHome,
  onRestart,
}: Props) {
  const pct = total === 0 ? 100 : Math.round((correct / total) * 100);
  const pnlColor =
    pnl > 0
      ? "text-[var(--feedback-correct)]"
      : pnl < 0
        ? "text-[var(--feedback-wrong)]"
        : "text-[var(--text-primary)]";

  return (
    <header className="sticky top-0 z-30 bg-[rgba(15,30,23,0.92)] backdrop-blur-md">
      {/* Row 1 — stats */}
      <div className="flex items-stretch divide-x divide-[rgba(255,255,255,0.06)] border-b border-[rgba(255,255,255,0.06)]">
        <button
          onClick={onHome}
          className="flex items-center gap-1.5 px-3 text-xs font-semibold tracking-wider text-[var(--text-primary)] hover:text-[var(--accent-gold)]"
        >
          ← 首页
        </button>
        <Stat label="筹码 Stack" value={money(stack)} />
        <Stat label="盈亏 P&L" value={money(pnl)} valueClass={pnlColor} />
        <Stat
          label="正确 Correct"
          value={`${pct}%`}
          sub={`${correct}/${total}`}
          valueClass="text-[var(--accent-gold)]"
        />
        <Stat label="牌墙 Wall" value={String(wall)} />
      </div>

      {/* Row 2 — round / seat / controls */}
      <div className="flex items-center gap-2 px-3 py-1 text-xs">
        <span className="rounded-lg border border-[rgba(255,255,255,0.1)] px-2.5 py-1 font-semibold text-[var(--text-primary)]">
          圈风 {WIND_NAME[roundWind]} {handNumber}
        </span>
        <span className="rounded-lg border border-[rgba(255,255,255,0.1)] px-2.5 py-1 text-[var(--text-muted)]">
          门风 {WIND_NAME[seatWind]}
        </span>
        <button
          onClick={onRestart}
          className="ml-auto rounded-lg border border-[rgba(192,57,43,0.5)] bg-[rgba(192,57,43,0.15)] px-2.5 py-1 font-semibold text-[#e8a59d] hover:bg-[rgba(192,57,43,0.3)]"
        >
          ↺
        </button>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  sub,
  valueClass = "text-[var(--text-primary)]",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span className={`text-sm font-bold leading-tight ${valueClass}`}>
        {value}
      </span>
      {sub && <span className="text-[9px] text-[var(--text-muted)]">{sub}</span>}
    </div>
  );
}

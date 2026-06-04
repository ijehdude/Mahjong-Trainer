"use client";

import type { TileId } from "@/types/tiles";
import TileComponent from "./TileComponent";

/* ===========================================================================
   A single player's discard pool with name label and (optional) melds.
   =========================================================================== */

interface Props {
  label: string;
  tiles: TileId[];
  isDealer?: boolean;
  isCurrent?: boolean;
  recentTile?: boolean; // highlight most recent
  align?: "start" | "center";
  compact?: boolean;
  children?: React.ReactNode; // melds slot
}

export default function DiscardPool({
  label,
  tiles,
  isDealer,
  isCurrent,
  recentTile = true,
  align = "start",
  compact = false,
  children,
}: Props) {
  return (
    <div
      className={`flex flex-col gap-1 ${
        align === "center" ? "items-center" : "items-start"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            isCurrent
              ? "bg-[var(--accent-gold)] text-[var(--bg-dark)]"
              : "text-[var(--text-muted)]"
          }`}
        >
          {label}
        </span>
        {isDealer && (
          <span className="rounded bg-[rgba(192,57,43,0.25)] px-1 py-0.5 text-[8px] font-bold uppercase text-[#e8a59d]">
            Dealer
          </span>
        )}
      </div>
      {children}
      <div
        className={`flex max-w-[150px] flex-wrap gap-0.5 ${
          align === "center" ? "justify-center" : ""
        }`}
      >
        {tiles.length === 0 && (
          <span className="text-[10px] italic text-[var(--text-muted)]/50">
            —
          </span>
        )}
        {tiles.map((t, i) => (
          <TileComponent
            key={i}
            tileId={t}
            size={compact ? "mini" : "discard"}
            recent={recentTile && i === tiles.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

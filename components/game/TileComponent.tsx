"use client";

import { makeTile } from "@/lib/mahjong/tiles";
import type { TileId } from "@/types/tiles";
import TileFace from "./TileFace";

/* ===========================================================================
   Core tile renderer — an ivory tile card with a realistic SVG face
   (TileFace). No images or emoji; everything is drawn in CSS/SVG.
   =========================================================================== */

export type TileSize = "hand" | "handfit" | "discard" | "meld" | "mini" | "tiny";

const SIZE: Record<TileSize, string> = {
  hand: "w-12 h-16 rounded-lg p-1",
  // The player's hand: shrinks on mobile so a full 14-tile hand fits one
  // screen (no horizontal scroll), full size on tablet/desktop.
  handfit: "w-6 h-9 rounded p-px md:w-12 md:h-16 md:rounded-lg md:p-1",
  discard: "w-8 h-11 rounded-md p-0.5",
  meld: "w-7 h-10 rounded-md p-0.5",
  mini: "w-6 h-8 rounded p-px",
  // Smallest face — used to pack a full discard pile into one screen on mobile.
  tiny: "w-[18px] h-[26px] rounded-sm p-px",
};

interface Props {
  tileId: TileId;
  size?: TileSize;
  selected?: boolean;
  recent?: boolean;
  /** The freshly drawn tile — highlighted with a green border. */
  drawn?: boolean;
  dimmed?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function TileComponent({
  tileId,
  size = "hand",
  selected = false,
  recent = false,
  drawn = false,
  dimmed = false,
  faceDown = false,
  onClick,
  className = "",
}: Props) {
  const tile = makeTile(tileId);
  const interactive = !!onClick;

  if (faceDown) {
    return (
      <div
        className={`${SIZE[size]} shrink-0 border border-[#1d3f63] bg-[var(--bg-tile-back)] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.08)_0_4px,transparent_4px_8px)] shadow-md ${className}`}
      />
    );
  }

  // Stacked box-shadows fake the ivory tile's thickness (lighter edges) plus a
  // soft drop shadow underneath — giving a subtle 3D, sitting-on-felt look.
  const depth =
    "shadow-[0_1px_0_#fffdf7,0_2px_0_#e4dcc8,0_4px_0_#cdc3ac,0_6px_9px_rgba(0,0,0,0.45)]";

  const classes = `${SIZE[size]} relative shrink-0 select-none border bg-gradient-to-b from-white via-[#f6f1e6] to-[#e6ddca] ${depth} transition-all duration-150 ${
    selected
      ? "-translate-y-1.5 border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)] shadow-[0_0_18px_rgba(201,168,76,0.6)]"
      : drawn
        ? "border-[var(--feedback-correct)] ring-2 ring-[var(--feedback-correct)] shadow-[0_0_14px_rgba(39,174,96,0.5)]"
        : "border-[#cbc1a8]"
  } ${recent ? "ring-2 ring-[var(--accent-gold)]/80" : ""} ${
    dimmed ? "opacity-45" : ""
  } ${
    interactive
      ? "cursor-pointer hover:-translate-y-1 hover:border-[var(--accent-gold)] hover:shadow-[0_0_14px_rgba(201,168,76,0.45)]"
      : "cursor-default"
  } ${className}`;

  const inner = (
    <>
      {/* top bevel highlight + soft side shading for a 3D tile feel */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-2/5 rounded-t-[inherit] bg-gradient-to-b from-white/80 to-transparent" />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_-3px_4px_rgba(120,108,80,0.18),inset_2px_0_3px_rgba(255,255,255,0.5)]" />
      <TileFace tile={tile} />
    </>
  );

  // Render a <button> only when interactive — otherwise a <div>, so tiles can
  // safely sit inside other buttons (e.g. the Chi dropdown options).
  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {inner}
      </button>
    );
  }
  return <div className={classes}>{inner}</div>;
}

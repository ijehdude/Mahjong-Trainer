"use client";

import { makeTile } from "@/lib/mahjong/tiles";
import type { TileId } from "@/types/tiles";
import TileFace from "./TileFace";

/* ===========================================================================
   Core tile renderer — an ivory tile card with a realistic SVG face
   (TileFace). No images or emoji; everything is drawn in CSS/SVG.
   =========================================================================== */

export type TileSize = "hand" | "discard" | "meld" | "mini";

const SIZE: Record<TileSize, string> = {
  hand: "w-12 h-16 rounded-lg p-1",
  discard: "w-8 h-11 rounded-md p-0.5",
  meld: "w-7 h-10 rounded-md p-0.5",
  mini: "w-6 h-8 rounded p-px",
};

interface Props {
  tileId: TileId;
  size?: TileSize;
  selected?: boolean;
  recent?: boolean;
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

  const classes = `${SIZE[size]} relative shrink-0 select-none border bg-gradient-to-b from-white to-[#ece5d6] shadow-[0_2px_0_rgba(0,0,0,0.28),0_3px_6px_rgba(0,0,0,0.3)] transition-all duration-150 ${
    selected
      ? "-translate-y-1.5 border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)] shadow-[0_0_18px_rgba(201,168,76,0.6)]"
      : "border-[#cfc7b4]"
  } ${recent ? "ring-2 ring-[var(--accent-gold)]/70" : ""} ${
    dimmed ? "opacity-45" : ""
  } ${
    interactive
      ? "cursor-pointer hover:-translate-y-1 hover:border-[var(--accent-gold)] hover:shadow-[0_0_14px_rgba(201,168,76,0.45)]"
      : "cursor-default"
  } ${className}`;

  const inner = (
    <>
      {/* top bevel highlight for a 3D tile feel */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 rounded-t-[inherit] bg-gradient-to-b from-white/70 to-transparent" />
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

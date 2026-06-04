"use client";

import { makeTile } from "@/lib/mahjong/tiles";
import type { TileId } from "@/types/tiles";

/* ===========================================================================
   Core tile renderer — a styled CSS/HTML card (no images, no emoji).
   =========================================================================== */

export type TileSize = "hand" | "discard" | "meld" | "mini";

const SIZE: Record<TileSize, string> = {
  hand: "w-12 h-16 rounded-lg text-[10px]",
  discard: "w-8 h-11 rounded-md text-[7px]",
  meld: "w-7 h-10 rounded-md text-[7px]",
  mini: "w-6 h-8 rounded text-[6px]",
};

const NUM_SIZE: Record<TileSize, string> = {
  hand: "text-2xl",
  discard: "text-base",
  meld: "text-sm",
  mini: "text-xs",
};

const COLOR_CLASS: Record<string, string> = {
  red: "text-[var(--accent-red)]",
  green: "text-[#1f7a4d]",
  blue: "text-[#2a5c8f]",
  ink: "text-[#2b2b2b]",
  pink: "text-[#c2477d]",
  orange: "text-[#d2792b]",
};

const SUIT_GLYPH: Record<string, string> = {
  wan: "万",
  tong: "筒",
  bam: "条",
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
  const color = COLOR_CLASS[tile.color] ?? COLOR_CLASS.ink;
  const interactive = !!onClick;

  if (faceDown) {
    return (
      <div
        className={`${SIZE[size]} shrink-0 border border-[#1d3f63] bg-[var(--bg-tile-back)] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.07)_0_4px,transparent_4px_8px)] shadow-md ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`${SIZE[size]} relative shrink-0 select-none border bg-[var(--bg-tile)] shadow-[0_2px_0_rgba(0,0,0,0.25),0_3px_6px_rgba(0,0,0,0.3)] transition-all duration-150 ${
        selected
          ? "-translate-y-1.5 border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)] shadow-[0_0_18px_rgba(201,168,76,0.6)]"
          : "border-[#d9d2c2]"
      } ${recent ? "ring-2 ring-[var(--accent-gold)]/70" : ""} ${
        dimmed ? "opacity-45" : ""
      } ${
        interactive
          ? "cursor-pointer hover:-translate-y-1 hover:border-[var(--accent-gold)] hover:shadow-[0_0_14px_rgba(201,168,76,0.45)]"
          : "cursor-default"
      } ${className}`}
    >
      <span className="flex h-full w-full flex-col items-center justify-center font-tile leading-none">
        {tile.category === "suit" && (
          <>
            <span className={`${NUM_SIZE[size]} font-black ${color}`}>
              {tile.label}
            </span>
            <span className={`mt-0.5 font-bold ${color}`}>
              {SUIT_GLYPH[tile.suit!]}
            </span>
          </>
        )}
        {(tile.category === "wind" || tile.category === "dragon") && (
          <span className={`${NUM_SIZE[size]} font-black ${color}`}>
            {tile.label}
          </span>
        )}
        {(tile.category === "flower" || tile.category === "season") && (
          <span className={`${NUM_SIZE[size]} font-black ${color}`}>
            {tile.label}
          </span>
        )}
      </span>
    </button>
  );
}

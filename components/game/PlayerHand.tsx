"use client";

import { sortTiles } from "@/lib/mahjong/tiles";
import type { Meld } from "@/types/game";
import type { TileId } from "@/types/tiles";
import MeldedSets from "./MeldedSets";
import TileComponent from "./TileComponent";

/* ===========================================================================
   The human player's hand — concealed tiles + the freshly drawn tile set apart.
   Tapping a tile pre-selects it as the discard candidate.
   =========================================================================== */

interface Props {
  hand: TileId[];
  melds: Meld[];
  drawnTile: TileId | null;
  selected: TileId | null;
  interactive: boolean;
  onSelect: (tile: TileId) => void;
  seatLabel: string;
  bet: number;
}

export default function PlayerHand({
  hand,
  melds,
  drawnTile,
  selected,
  interactive,
  onSelect,
  seatLabel,
  bet,
}: Props) {
  // Sort the concealed hand, keeping the freshly drawn tile out to the right.
  let concealed = [...hand];
  let fresh: TileId | null = null;
  if (drawnTile && concealed.includes(drawnTile)) {
    const idx = concealed.indexOf(drawnTile);
    concealed = [...concealed.slice(0, idx), ...concealed.slice(idx + 1)];
    fresh = drawnTile;
  }
  const sorted = sortTiles(concealed);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        <span className="text-[var(--accent-gold)]">Your Hand</span>
        <span>·</span>
        <span>{seatLabel}</span>
        <span>·</span>
        <span>${bet} bet</span>
      </div>

      {melds.length > 0 && (
        <div className="mb-2">
          <MeldedSets melds={melds} size="discard" />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-1">
        {sorted.map((t, i) => (
          <TileComponent
            key={`${t}-${i}`}
            tileId={t}
            size="hand"
            selected={selected === t}
            onClick={interactive ? () => onSelect(t) : undefined}
          />
        ))}
        {fresh && (
          <div className="ml-2 animate-slide-in-right border-l border-dashed border-[rgba(201,168,76,0.4)] pl-2">
            <TileComponent
              tileId={fresh}
              size="hand"
              selected={selected === fresh}
              onClick={interactive ? () => onSelect(fresh!) : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

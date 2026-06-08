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
  pendingBonus: TileId | null;
  selected: TileId | null;
  interactive: boolean;
  onSelect: (tile: TileId) => void;
  seatLabel: string;
}

export default function PlayerHand({
  hand,
  melds,
  drawnTile,
  pendingBonus,
  selected,
  interactive,
  onSelect,
  seatLabel,
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
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[var(--text-muted)]">
        <span className="text-[var(--accent-gold)]">我的手牌 Your Hand</span>
        <span>·</span>
        <span>{seatLabel}</span>
      </div>

      {melds.length > 0 && (
        <div className="mb-2">
          <MeldedSets melds={melds} size="discard" />
        </div>
      )}

      {/* Full hand on one screen: tiles shrink on mobile so all ~14 fit
          without horizontal scrolling; wraps/full-size on wider screens. */}
      <div className="flex flex-nowrap items-end gap-0.5 overflow-x-auto pb-1 md:flex-wrap md:gap-1">
        {sorted.map((t, i) => (
          <TileComponent
            key={`${t}-${i}`}
            tileId={t}
            size="handfit"
            selected={selected === t}
            onClick={interactive ? () => onSelect(t) : undefined}
          />
        ))}
        {fresh && (
          <div className="flex animate-slide-in-right md:ml-2 md:border-l md:border-dashed md:border-[rgba(201,168,76,0.4)] md:pl-2">
            <TileComponent
              tileId={fresh}
              size="handfit"
              selected={selected === fresh}
              drawn={selected !== fresh}
              onClick={interactive ? () => onSelect(fresh!) : undefined}
            />
          </div>
        )}
        {pendingBonus && (
          <div className="ml-2 flex animate-slide-in-right flex-col items-center border-l border-dashed border-[rgba(201,168,76,0.4)] pl-2">
            <TileComponent tileId={pendingBonus} size="hand" recent />
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">
              → 上桌 table
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

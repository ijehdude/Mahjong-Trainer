"use client";

import { sortTiles } from "@/lib/mahjong/tiles";
import type { TileId } from "@/types/tiles";
import TileComponent from "./TileComponent";
import { useScaledTileRow } from "./useScaledTileRow";

/* ===========================================================================
   The human player's hand — concealed tiles + the freshly drawn tile set apart.
   Tapping a tile pre-selects it as the discard candidate. Declared melds are
   shown on the table (felt), not here, to avoid duplication.
   =========================================================================== */

interface Props {
  hand: TileId[];
  drawnTile: TileId | null;
  pendingBonus: TileId | null;
  selected: TileId | null;
  interactive: boolean;
  onSelect: (tile: TileId) => void;
  seatLabel: string;
}

export default function PlayerHand({
  hand,
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

  // ONE row, always: tiles scale to the container (aspect 42:58) via
  // --tile-w/--tile-h so all 14 tiles stay visible without scrolling. The
  // drawn tile stays inline behind a dashed divider (~9px: ml-1 + pl-1 +
  // 1px border), which we reserve via `extra` so the math never overflows.
  const count = sorted.length + (fresh ? 1 : 0) + (pendingBonus ? 1 : 0);
  const extra = (fresh ? 9 : 0) + (pendingBonus ? 9 : 0);
  const { ref, style } = useScaledTileRow(count, { extra });

  return (
    <div className="w-full" ref={ref}>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[var(--text-muted)]">
        <span className="text-[var(--accent-gold)]">我的手牌 Your Hand</span>
        <span>·</span>
        <span>{seatLabel}</span>
      </div>

      <div
        className="scrollbar-hide flex flex-nowrap items-end gap-1 overflow-x-auto pb-1"
        style={style}
      >
        {sorted.map((t, i) => (
          <TileComponent
            key={`${t}-${i}`}
            tileId={t}
            size="scaled"
            selected={selected === t}
            onClick={interactive ? () => onSelect(t) : undefined}
          />
        ))}
        {fresh && (
          <div className="ml-1 flex shrink-0 animate-slide-in-right border-l border-dashed border-[rgba(201,168,76,0.4)] pl-1">
            <TileComponent
              tileId={fresh}
              size="scaled"
              selected={selected === fresh}
              drawn={selected !== fresh}
              onClick={interactive ? () => onSelect(fresh!) : undefined}
            />
          </div>
        )}
        {pendingBonus && (
          <div className="ml-1 flex shrink-0 animate-slide-in-right flex-col items-center border-l border-dashed border-[rgba(201,168,76,0.4)] pl-1">
            <TileComponent tileId={pendingBonus} size="scaled" recent />
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">
              → 上桌 table
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

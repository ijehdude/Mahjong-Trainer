"use client";

import type { GameState, RelativeSeat } from "@/types/game";
import type { TileId } from "@/types/tiles";
import { WIND_NAME } from "@/types/tiles";
import { indexForSeat } from "@/lib/mahjong/gameState";
import { taiHintFor } from "@/lib/mahjong/taiCalculator";
import MeldedSets from "./MeldedSets";
import TileComponent from "./TileComponent";

/* ===========================================================================
   Compact mobile felt zone (<768px). A 3-column grid laid out like a real
   table from the player's seat:
     • side columns  — the two side players' info (name · count · tai · melds)
     • centre column — across discards (top) / side discards flanking the wall
                       counter (middle) / your discards (bottom)
   Discard pools use the smallest tile face so the whole table fits one screen.
   The overhead SVG table (GameTable) is shown only on ≥768px instead.
   =========================================================================== */

interface Props {
  state: GameState;
}

interface SeatInfo {
  player: GameState["players"][number];
  isDealer: boolean;
  isCurrent: boolean;
  tai: number;
}

export default function MobileFelt({ state }: Props) {
  const seatView = (seat: RelativeSeat): SeatInfo | null => {
    const idx = indexForSeat(state, seat);
    if (idx === null) return null;
    const p = state.players[idx];
    return {
      player: p,
      isDealer: p.isDealer,
      isCurrent: state.turnIndex === idx,
      tai: taiHintFor(p.flowers, p.melds, p.seatWind, state.roundWind, state.rules),
    };
  };

  const self = seatView("self");
  const across = seatView("across");
  const left = seatView("left");
  const right = seatView("right");

  return (
    <div className="felt-glow flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] p-1.5">
      <div className="grid h-full w-full grid-cols-[58px_1fr_58px] gap-1">
        {/* Left side player */}
        <SideInfo view={left} side="left" />

        {/* Centre: discards + wall */}
        <div className="flex min-h-0 flex-col items-center justify-between gap-1">
          {/* Across player (top) */}
          <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-0.5">
            <SeatTag view={across} />
            {across && across.player.melds.length > 0 && (
              <MeldedSets melds={across.player.melds} size="mini" />
            )}
            <Pool tiles={across?.player.discards ?? []} />
          </div>

          {/* Middle: left discards · wall · right discards */}
          <div className="flex w-full shrink-0 items-center justify-center gap-1">
            <Pool
              tiles={left?.player.discards ?? []}
              className="max-h-16 flex-1 justify-end"
            />
            <div className="flex shrink-0 flex-col items-center leading-none">
              <span className="text-sm font-bold text-[var(--accent-gold)]">
                {state.wall.length}
              </span>
              <span className="text-[7px] uppercase tracking-wider text-[var(--text-muted)]">
                墙 wall
              </span>
            </div>
            <Pool
              tiles={right?.player.discards ?? []}
              className="max-h-16 flex-1 justify-start"
            />
          </div>

          {/* Self (bottom) */}
          <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-end gap-0.5">
            <Pool tiles={self?.player.discards ?? []} />
            <SeatTag view={self} self />
          </div>
        </div>

        {/* Right side player */}
        <SideInfo view={right} side="right" />
      </div>
    </div>
  );
}

/** A discard pool rendered with the smallest tile face. Scrolls if it overflows. */
function Pool({
  tiles,
  className = "",
}: {
  tiles: TileId[];
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap content-start gap-px overflow-y-auto ${className}`}
    >
      {tiles.map((t, i) => (
        <TileComponent
          key={i}
          tileId={t}
          size="tiny"
          recent={i === tiles.length - 1}
        />
      ))}
    </div>
  );
}

/** A small name/tai tag for the across & self seats in the centre column. */
function SeatTag({ view, self }: { view: SeatInfo | null; self?: boolean }) {
  if (!view) return <div className="h-3" />;
  const { player, isDealer, isCurrent, tai } = view;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span
        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
          isCurrent
            ? "bg-[var(--accent-gold)] text-[var(--bg-dark)]"
            : "text-[var(--text-muted)]"
        }`}
      >
        {WIND_NAME[player.seatWind]} · {player.name}
      </span>
      {isDealer && (
        <span className="rounded bg-[rgba(192,57,43,0.25)] px-1 text-[8px] font-bold text-[#e8a59d]">
          庄
        </span>
      )}
      {tai > 0 && (
        <span className="rounded bg-[rgba(201,168,76,0.2)] px-1 text-[8px] font-bold text-[var(--accent-gold)]">
          +{tai}台
        </span>
      )}
      {!self && (
        <span className="flex items-center gap-0.5 text-[8px] text-[var(--text-muted)]">
          <TileComponent tileId="east" size="tiny" faceDown />×{player.hand.length}
        </span>
      )}
    </div>
  );
}

/** A side player's column: name · count · tai · melds (rotated to face inward). */
function SideInfo({
  view,
  side,
}: {
  view: SeatInfo | null;
  side: "left" | "right";
}) {
  if (!view) return <div />;
  const { player, isDealer, isCurrent, tai } = view;
  return (
    <div className="flex min-h-0 flex-col items-center gap-1 overflow-y-auto">
      <span
        className={`rounded px-1 py-0.5 text-center text-[9px] font-bold uppercase leading-tight tracking-wider ${
          isCurrent
            ? "bg-[var(--accent-gold)] text-[var(--bg-dark)]"
            : "text-[var(--text-muted)]"
        }`}
      >
        {WIND_NAME[player.seatWind]}
        <br />
        {player.name}
      </span>
      <div className="flex items-center gap-0.5 text-[8px] text-[var(--text-muted)]">
        <TileComponent tileId="east" size="tiny" faceDown />×{player.hand.length}
      </div>
      <div className="flex items-center gap-1">
        {isDealer && (
          <span className="rounded bg-[rgba(192,57,43,0.25)] px-1 text-[8px] font-bold text-[#e8a59d]">
            庄
          </span>
        )}
        {tai > 0 && (
          <span className="rounded bg-[rgba(201,168,76,0.2)] px-1 text-[8px] font-bold text-[var(--accent-gold)]">
            +{tai}台
          </span>
        )}
      </div>
      {player.melds.length > 0 && (
        <MeldedSets melds={player.melds} size="mini" orient={side} />
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { GameState, RelativeSeat } from "@/types/game";
import { WIND_NAME } from "@/types/tiles";
import { indexForSeat } from "@/lib/mahjong/gameState";
import { taiHintFor } from "@/lib/mahjong/taiCalculator";
import MeldedSets from "./MeldedSets";
import TileComponent from "./TileComponent";

/* ===========================================================================
   Compact mobile felt zone (<768px). A 3-column grid:
     • side columns  — the two side players' info (name · count · tai · melds)
     • centre column — the across player's info on top, then ONE combined
                       discard pile that all players add to (newest auto-scrolled
                       into view). No per-player split, no central wall counter.
   Discard tiles use the smallest face so a full pile fits one screen. The
   overhead SVG table (GameTable) is shown only on ≥768px instead.
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

  const across = seatView("across");
  const left = seatView("left");
  const right = seatView("right");
  const self = seatView("self");

  // Keep the most recent discard in view as the pile grows.
  const pileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pileRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.discardPile.length]);

  const pile = state.discardPile;
  const lastIdx = pile.length - 1;

  return (
    <div className="felt-glow flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] p-1.5">
      <div className="grid h-full w-full grid-cols-[58px_1fr_58px] gap-1">
        {/* Left side player */}
        <SideInfo view={left} side="left" />

        {/* Centre: across info + one combined discard pile */}
        <div className="flex min-h-0 flex-col gap-1">
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <SeatTag view={across} />
            {across && across.player.melds.length > 0 && (
              <MeldedSets melds={across.player.melds} size="mini" />
            )}
          </div>

          <div
            ref={pileRef}
            className="flex min-h-0 flex-1 flex-wrap content-start justify-center gap-px overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.18)] p-1"
          >
            {pile.length === 0 ? (
              <span className="m-auto text-[10px] italic text-[var(--text-muted)]/50">
                弃牌区 discards
              </span>
            ) : (
              pile.map((d, i) => (
                <TileComponent
                  key={i}
                  tileId={d.tile}
                  size="tiny"
                  recent={i === lastIdx}
                />
              ))
            )}
          </div>

          {/* Your declared melds — kept on the table, not in the hand. */}
          {self && self.player.melds.length > 0 && (
            <div className="flex shrink-0 flex-col items-center gap-0.5">
              <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">
                你 YOU
              </span>
              <MeldedSets melds={self.player.melds} size="mini" />
            </div>
          )}
        </div>

        {/* Right side player */}
        <SideInfo view={right} side="right" />
      </div>
    </div>
  );
}

/** A small name/tai tag for the across seat above the discard pile. */
function SeatTag({ view }: { view: SeatInfo | null }) {
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
      <span className="flex items-center gap-0.5 text-[8px] text-[var(--text-muted)]">
        <TileComponent tileId="east" size="tiny" faceDown />×{player.hand.length}
      </span>
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

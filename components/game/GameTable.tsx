"use client";

import type { GameState, RelativeSeat } from "@/types/game";
import { WIND_NAME } from "@/types/tiles";
import { indexForSeat, relativeSeat } from "@/lib/mahjong/gameState";
import DiscardPool from "./DiscardPool";
import MeldedSets from "./MeldedSets";
import TileComponent from "./TileComponent";

/* ===========================================================================
   The felt table: dealer pill, opponent discard pools + melds arranged around
   a centre info disc, and the human's own discard pool.
   =========================================================================== */

interface Props {
  state: GameState;
}

export default function GameTable({ state }: Props) {
  const dealer = state.players[0];
  const lastDiscarder = state.lastDiscard?.playerIndex ?? -1;

  const seatView = (seat: RelativeSeat) => {
    const idx = indexForSeat(state, seat);
    if (idx === null) return null;
    const p = state.players[idx];
    return {
      idx,
      player: p,
      label: `${WIND_NAME[p.seatWind].toUpperCase()} · ${p.name}`,
      isDealer: p.isDealer,
      isCurrent: state.turnIndex === idx,
      recent: lastDiscarder === idx,
    };
  };

  const across = seatView("across");
  const left = seatView("left");
  const right = seatView("right");
  const self = seatView("self");

  const OpponentBlock = ({
    view,
    align = "start",
  }: {
    view: ReturnType<typeof seatView>;
    align?: "start" | "center";
  }) => {
    if (!view) return <div />;
    return (
      <div
        className={`flex flex-col gap-1 ${
          align === "center" ? "items-center" : ""
        }`}
      >
        {view.player.melds.length > 0 && (
          <MeldedSets melds={view.player.melds} size="mini" />
        )}
        <div className="flex items-center gap-1">
          <TileComponent tileId="east" size="mini" faceDown />
          <span className="text-[9px] text-[var(--text-muted)]">
            ×{view.player.hand.length}
          </span>
        </div>
        <DiscardPool
          label={view.label}
          tiles={view.player.discards}
          isDealer={view.isDealer}
          isCurrent={view.isCurrent}
          align={align}
          compact
        />
      </div>
    );
  };

  return (
    <div className="felt-glow relative flex flex-1 flex-col rounded-2xl border border-[rgba(255,255,255,0.05)] p-3">
      {/* Dealer pill */}
      <div className="flex justify-center">
        <span className="rounded-full border border-[rgba(201,168,76,0.4)] bg-[rgba(0,0,0,0.25)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">
          庄家 Dealer — {WIND_NAME[dealer.seatWind]} ({dealer.name})
        </span>
      </div>

      {/* Across (top) */}
      <div className="mt-3 flex justify-center">
        <OpponentBlock view={across} align="center" />
      </div>

      {/* Middle: left | centre | right */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <OpponentBlock view={left} />

        {/* Centre info disc */}
        <div className="flex flex-col items-center justify-center gap-1 self-center rounded-2xl border border-[rgba(201,168,76,0.25)] bg-[rgba(0,0,0,0.25)] px-4 py-3">
          <TileComponent tileId={state.roundWind} size="discard" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {WIND_NAME[state.roundWind]} 圈
          </span>
          <span className="text-base font-bold text-[var(--accent-gold)]">
            {state.wall.length}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
            牌墙 wall
          </span>
        </div>

        <div className="flex justify-end">
          <OpponentBlock view={right} />
        </div>
      </div>

      {/* Self discard pool */}
      <div className="mt-auto flex justify-center pt-3">
        {self && (
          <DiscardPool
            label={`${WIND_NAME[self.player.seatWind].toUpperCase()} · 我`}
            tiles={self.player.discards}
            isDealer={self.isDealer}
            isCurrent={self.isCurrent}
            align="center"
          />
        )}
      </div>
    </div>
  );
}

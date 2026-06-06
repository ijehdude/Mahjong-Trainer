"use client";

import type { GameState, RelativeSeat } from "@/types/game";
import { WIND_NAME } from "@/types/tiles";
import { indexForSeat } from "@/lib/mahjong/gameState";
import MeldedSets from "./MeldedSets";
import TileComponent from "./TileComponent";

/* ===========================================================================
   The felt table: a single central discard pile (as on a real table), with
   each player's name / wind / melds / bonus tiles arranged around it.
   =========================================================================== */

interface Props {
  state: GameState;
}

export default function GameTable({ state }: Props) {
  const dealer = state.players[0];

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
    };
  };

  const across = seatView("across");
  const left = seatView("left");
  const right = seatView("right");
  const self = seatView("self");

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
        <PlayerInfo view={across} align="center" />
      </div>

      {/* Left & right players flank the table */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <PlayerInfo view={left} vertical />
        <div className="flex flex-col items-center gap-1">
          <TileComponent tileId={state.roundWind} size="meld" />
          <div className="text-center leading-tight">
            <div className="text-base font-bold text-[var(--accent-gold)]">
              {state.wall.length}
            </div>
            <div className="text-[8px] uppercase tracking-wider text-[var(--text-muted)]">
              牌墙 wall
            </div>
          </div>
        </div>
        <PlayerInfo view={right} vertical />
      </div>

      {/* Central discard pile — spans the table, up to 12 tiles per row */}
      <div className="mt-3 flex flex-1 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.18)] px-2 py-3">
        <DiscardCenter state={state} />
      </div>

      {/* Self (bottom) */}
      <div className="mt-3 flex justify-center pt-1">
        <PlayerInfo view={self} align="center" hideCount />
      </div>
    </div>
  );
}

function DiscardCenter({ state }: { state: GameState }) {
  const pile = state.discardPile;
  const lastIdx = pile.length - 1;
  if (pile.length === 0) {
    return (
      <div className="flex h-11 items-center text-[10px] italic text-[var(--text-muted)]/50">
        弃牌区 discards
      </div>
    );
  }
  return (
    // ~12 discard tiles (32px + gap) per row before wrapping.
    <div className="flex max-w-[420px] flex-wrap justify-center gap-0.5">
      {pile.map((d, i) => (
        <TileComponent
          key={i}
          tileId={d.tile}
          size="discard"
          recent={i === lastIdx}
        />
      ))}
    </div>
  );
}

function PlayerInfo({
  view,
  align = "start",
  vertical = false,
  hideCount = false,
}: {
  view: {
    player: GameState["players"][number];
    label: string;
    isDealer: boolean;
    isCurrent: boolean;
  } | null;
  align?: "start" | "center";
  vertical?: boolean;
  hideCount?: boolean;
}) {
  if (!view) return <div />;
  const { player, label, isDealer, isCurrent } = view;
  return (
    <div
      className={`flex max-w-[150px] flex-col gap-1 ${
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
            庄
          </span>
        )}
        {!hideCount && (
          <span className="flex items-center gap-0.5 text-[9px] text-[var(--text-muted)]">
            <TileComponent tileId="east" size="mini" faceDown />×
            {player.hand.length}
          </span>
        )}
      </div>
      {player.melds.length > 0 && (
        <MeldedSets melds={player.melds} size="mini" />
      )}
      {player.flowers.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-0.5 rounded bg-[rgba(201,168,76,0.12)] px-1 py-0.5 ${
            vertical ? "max-w-[80px]" : ""
          }`}
        >
          {player.flowers.map((t) => (
            <TileComponent key={t} tileId={t} size="discard" />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import type { GameState, RelativeSeat } from "@/types/game";
import { WIND_NAME } from "@/types/tiles";
import { indexForSeat } from "@/lib/mahjong/gameState";
import { taiHintFor } from "@/lib/mahjong/taiCalculator";
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
  const dealer = state.players[state.dealerIndex];

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
    <div className="felt-glow relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] p-2">
      {/* Dealer pill */}
      <div className="flex justify-center">
        <span className="rounded-full border border-[rgba(201,168,76,0.4)] bg-[rgba(0,0,0,0.25)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">
          庄家 Dealer — {WIND_NAME[dealer.seatWind]} ({dealer.name})
        </span>
      </div>

      {/* Across (top) */}
      <div className="mt-2 flex justify-center">
        <PlayerInfo view={across} align="center" rules={state.rules} roundWind={state.roundWind} payAnim={state.payAnim} />
      </div>

      {/* Middle row: left player | central discard pile | right player,
          all vertically centred — discards sit in the middle of the table. */}
      <div className="mt-2 flex min-h-0 flex-1 items-center gap-2">
        <PlayerInfo view={left} vertical side="left" rules={state.rules} roundWind={state.roundWind} payAnim={state.payAnim} />

        <div className="flex min-h-0 flex-1 flex-col items-center gap-1 self-stretch justify-center">
          {/* Wall count */}
          <div className="text-center leading-tight">
            <div className="text-sm font-bold text-[var(--accent-gold)]">
              {state.wall.length}
            </div>
            <div className="text-[8px] uppercase tracking-wider text-[var(--text-muted)]">
              牌墙 wall
            </div>
          </div>
          {/* Central discard pile — tiles wrap to fill width; scrolls if tall. */}
          <div className="flex max-h-full w-full flex-1 items-start justify-center overflow-y-auto rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.18)] px-2 py-2">
            <DiscardCenter state={state} />
          </div>
        </div>

        <PlayerInfo view={right} vertical side="right" rules={state.rules} roundWind={state.roundWind} payAnim={state.payAnim} />
      </div>

      {/* Self (bottom) */}
      <div className="mt-2 flex justify-center">
        <PlayerInfo view={self} align="center" hideCount rules={state.rules} roundWind={state.roundWind} payAnim={state.payAnim} />
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
    // Desktop central pile: readable tiles, capped so 24 fit per row before
    // wrapping into the (otherwise unused) vertical space below.
    <div className="flex max-w-[880px] flex-wrap content-start justify-center gap-1">
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
  side,
  rules,
  roundWind,
  payAnim,
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
  side?: "left" | "right";
  rules: GameState["rules"];
  roundWind: GameState["roundWind"];
  payAnim: GameState["payAnim"];
}) {
  if (!view) return <div />;
  const { player, label, isDealer, isCurrent } = view;
  const rot = side === "left" ? "rotate-90" : side === "right" ? "-rotate-90" : "";
  const tai = taiHintFor(
    player.flowers,
    player.melds,
    player.seatWind,
    roundWind,
    rules
  );
  const delta = payAnim ? payAnim.deltas[player.index] ?? 0 : 0;
  return (
    <div
      className={`relative flex flex-col gap-1 ${
        align === "center" ? "items-center" : "max-w-[120px] items-start"
      }`}
    >
      {payAnim && delta !== 0 && (
        <span
          key={payAnim.id}
          className={`animate-pay-float pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-bold ${
            delta < 0
              ? "text-[var(--feedback-wrong)]"
              : "text-[var(--feedback-correct)]"
          }`}
        >
          {delta < 0 ? "−" : "+"}
          {Math.abs(delta) < 1
            ? `${Math.round(Math.abs(delta) * 100)}¢`
            : `$${Math.abs(delta).toFixed(2)}`}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <span
          className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
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
        {tai > 0 && (
          <span className="rounded bg-[rgba(201,168,76,0.2)] px-1 py-0.5 text-[9px] font-bold text-[var(--accent-gold)]">
            +{tai}台
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
        <MeldedSets
          melds={player.melds}
          size="mini"
          orient={side ?? "up"}
        />
      )}
      {player.flowers.length > 0 && (
        <div
          className={`flex items-center gap-0.5 rounded bg-[rgba(201,168,76,0.12)] px-1 py-0.5 ${
            side ? "flex-col" : "flex-wrap"
          } ${vertical && !side ? "max-w-[80px]" : ""}`}
        >
          {player.flowers.map((t) =>
            side ? (
              <span key={t} className="flex h-6 w-8 items-center justify-center">
                <TileComponent tileId={t} size="mini" className={rot} />
              </span>
            ) : (
              <TileComponent key={t} tileId={t} size="mini" />
            )
          )}
        </div>
      )}
    </div>
  );
}

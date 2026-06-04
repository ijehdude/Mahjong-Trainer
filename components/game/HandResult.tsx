"use client";

import type { GameState } from "@/types/game";
import type { Verdict } from "@/lib/claude/strategyFeedback";
import { sortTiles, tileName } from "@/lib/mahjong/tiles";
import Button from "@/components/shared/Button";
import TileComponent from "./TileComponent";
import MeldedSets from "./MeldedSets";

/* ===========================================================================
   Hand-result overlay shown when a hand ends (win or washout).
   =========================================================================== */

interface Props {
  state: GameState;
  lastDiscard: { tile: string; verdict: Verdict | null; text: string } | null;
  onNext: () => void;
  onHome: () => void;
}

function money(n: number): string {
  const sign = n < 0 ? "-" : "+";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export default function HandResult({
  state,
  lastDiscard,
  onNext,
  onHome,
}: Props) {
  const { result } = state;
  const human = state.players.find((p) => p.isHuman)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-pop-in w-full max-w-[440px] overflow-hidden rounded-3xl border border-[rgba(201,168,76,0.3)] bg-[var(--bg-surface)] shadow-2xl">
        {/* Header */}
        <div className="border-b border-[rgba(255,255,255,0.07)] px-6 pb-4 pt-6 text-center">
          {result ? (
            <>
              <div className="font-display text-3xl font-black tracking-wide text-[var(--accent-gold)]">
                🀄 MAHJONG!
              </div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                {state.players[result.winnerIndex].name} (
                {state.players[result.winnerIndex].seatWind.toUpperCase()}) wins
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-3xl font-black tracking-wide text-[var(--text-muted)]">
                Washout
              </div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">
                Wall exhausted — no winner this hand.
              </div>
            </>
          )}
        </div>

        {result && (
          <div className="space-y-4 px-6 py-5">
            {/* Winning hand */}
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Winning hand
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {sortTiles(result.handTiles).map((t, i) => (
                  <TileComponent
                    key={i}
                    tileId={t}
                    size="discard"
                    recent={t === result.winningTile}
                  />
                ))}
              </div>
              {result.handMelds.length > 0 && (
                <div className="mt-1.5">
                  <MeldedSets melds={result.handMelds} size="discard" />
                </div>
              )}
            </div>

            {/* Tai breakdown */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.07)] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Score
                </span>
                <span className="font-bold text-[var(--accent-gold)]">
                  {result.tai} tai{" "}
                  {result.selfDraw ? "· self-draw" : "· off discard"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.taiBreakdown
                  .filter((b) => b.tai > 0)
                  .map((b, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-[rgba(201,168,76,0.12)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]/90"
                    >
                      {b.label} +{b.tai}
                    </span>
                  ))}
                {result.taiBreakdown.length === 0 && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    No scoring elements.
                  </span>
                )}
              </div>
            </div>

            {/* Payment */}
            <div className="flex items-center justify-between rounded-xl bg-[rgba(0,0,0,0.2)] px-4 py-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  You {result.payments[human.index] >= 0 ? "collect" : "pay"}
                </div>
                <div
                  className={`text-xl font-bold ${
                    result.payments[human.index] >= 0
                      ? "text-[var(--feedback-correct)]"
                      : "text-[var(--feedback-wrong)]"
                  }`}
                >
                  {money(result.payments[human.index])}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Stack {money(human.stack).replace("+", "")}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    state.pnl >= 0
                      ? "text-[var(--feedback-correct)]"
                      : "text-[var(--feedback-wrong)]"
                  }`}
                >
                  P&L {money(state.pnl)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last discard feedback */}
        {lastDiscard && (
          <div className="mx-6 mb-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.18)] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Your last discard: {tileName(lastDiscard.tile)}
            </div>
            <div
              className={`mt-1 text-sm ${
                lastDiscard.verdict === "good"
                  ? "text-[var(--feedback-correct)]"
                  : lastDiscard.verdict === "risky"
                    ? "text-[var(--feedback-wrong)]"
                    : "text-[var(--feedback-neutral)]"
              }`}
            >
              {lastDiscard.verdict === "good"
                ? "✓ "
                : lastDiscard.verdict === "risky"
                  ? "✗ "
                  : "~ "}
              {lastDiscard.text || "No feedback recorded."}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="gold" fullWidth onClick={onNext} className="py-3.5">
            NEXT HAND
          </Button>
          <Button variant="outline" onClick={onHome} className="py-3.5">
            HOME
          </Button>
        </div>
      </div>
    </div>
  );
}

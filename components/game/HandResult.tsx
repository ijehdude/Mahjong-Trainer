"use client";

import type { GameState, PayEvent } from "@/types/game";
import type { Verdict } from "@/lib/claude/strategyFeedback";
import { sortTiles, tileName } from "@/lib/mahjong/tiles";
import Button from "@/components/shared/Button";
import TileComponent from "./TileComponent";
import MeldedSets from "./MeldedSets";
import { useScaledTileRow } from "./useScaledTileRow";

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

/** "(咬 — 猫咬鼠)"-style label for a mid-hand payment event. */
function eventLabel(e: PayEvent): string {
  if (e.kind === "kong") return `杠 — ${e.note} kong bonus`;
  if (e.kind === "animal") return `咬 — ${e.note}`;
  return e.note === "正花"
    ? "正花 — own seat flower pair"
    : "咬 — holds their flower+season pair";
}

/** Mid-hand bonus payments (kong / 咬 / 正花) as one line item each. */
function BonusPayList({ state }: { state: GameState }) {
  if (state.payEvents.length === 0) return null;
  return (
    <div className="mt-3 space-y-1 border-t border-[rgba(255,255,255,0.07)] pt-2">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        本局即付 Bonus payments during the hand
      </div>
      {state.payEvents.map((e, i) => (
        <div key={i} className="text-[11px] text-[var(--text-primary)]/85">
          <span className="font-semibold">{state.players[e.from].name}</span>
          {" pays "}
          <span className="font-semibold">{state.players[e.to].name}</span>{" "}
          <span className="font-bold text-[var(--feedback-correct)]">
            ${e.amount.toFixed(2)}
          </span>{" "}
          <span className="text-[var(--text-muted)]">({eventLabel(e)})</span>
        </div>
      ))}
    </div>
  );
}

/** Who paid whom this hand: winner row, every loser row, plus bonus events. */
function PaymentBreakdown({ state }: { state: GameState }) {
  const { result } = state;
  if (!result) {
    // Washout: only the mid-hand bonus payments are worth showing.
    if (state.payEvents.length === 0) return null;
    return (
      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] p-3">
        <BonusPayList state={state} />
      </div>
    );
  }

  const winner = state.players[result.winnerIndex];
  const losers = state.players.filter(
    (p) => p.index !== result.winnerIndex && result.payments[p.index] !== 0
  );
  const row = (p: (typeof state.players)[number]) => {
    const amt = result.payments[p.index];
    const isWinner = p.index === result.winnerIndex;
    const isDiscarder = !result.selfDraw && p.index === result.discarderIndex;
    return (
      <div key={p.index} className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {p.name} · {p.seatWind.toUpperCase()}
          </span>
          {isWinner && (
            <span className="rounded bg-[rgba(39,174,96,0.2)] px-1 py-0.5 text-[9px] font-bold text-[var(--feedback-correct)]">
              胡
            </span>
          )}
          {isDiscarder && (
            <span className="rounded bg-[rgba(231,76,60,0.25)] px-1 py-0.5 text-[9px] font-bold text-[#e8a59d]">
              放铳
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-xs font-bold ${
              amt >= 0
                ? "text-[var(--feedback-correct)]"
                : "text-[var(--feedback-wrong)]"
            }`}
          >
            {money(amt)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            筹码 ${p.stack.toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.07)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        结算 Payment breakdown
      </div>
      <div className="mt-2 space-y-1.5">
        {row(winner)}
        {losers.map(row)}
      </div>
      <BonusPayList state={state} />
    </div>
  );
}

export default function HandResult({
  state,
  lastDiscard,
  onNext,
  onHome,
}: Props) {
  const { result } = state;
  const human = state.players.find((p) => p.isHuman)!;

  // Winning hand on a single row: scale tiles to the modal width (the modal
  // is narrow, so allow smaller tiles than the in-play hand) and scroll
  // rather than wrap if even that is not enough.
  const winRow = useScaledTileRow(result?.handTiles.length ?? 0, {
    min: 24,
    max: 32,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-pop-in w-full max-w-[440px] overflow-hidden rounded-3xl border border-[rgba(201,168,76,0.3)] bg-[var(--bg-surface)] shadow-2xl">
        {/* Header */}
        <div className="border-b border-[rgba(255,255,255,0.07)] px-6 pb-4 pt-6 text-center">
          {result ? (
            <>
              <div className="font-display text-3xl font-black tracking-wide text-[var(--accent-gold)]">
                🀄 胡了！MAHJONG
              </div>
              <div className="mt-1 text-sm font-semibold tracking-wider text-[var(--text-primary)]">
                {state.players[result.winnerIndex].name} (
                {state.players[result.winnerIndex].seatWind.toUpperCase()}) 胡牌
                {result.limit && " · 限制番 Limit"}
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-3xl font-black tracking-wide text-[var(--text-muted)]">
                流局 Washout
              </div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">
                牌墙耗尽，本局无人胡牌 · Wall exhausted.
              </div>
            </>
          )}
        </div>

        {result && (
          <div className="space-y-4 px-6 py-5">
            {/* Winning hand */}
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                胡牌 Winning hand
              </div>
              <div ref={winRow.ref}>
                <div
                  className="scrollbar-hide flex flex-nowrap items-center gap-1 overflow-x-auto"
                  style={winRow.style}
                >
                  {sortTiles(result.handTiles).map((t, i) => (
                    <TileComponent
                      key={i}
                      tileId={t}
                      size="scaled"
                      recent={t === result.winningTile}
                    />
                  ))}
                </div>
              </div>
              {result.handMelds.length > 0 && (
                <div className="mt-1.5">
                  <MeldedSets melds={result.handMelds} size="discard" revealConcealed />
                </div>
              )}
              {result.handFlowers.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-gold)]">
                    花/季 Flowers
                  </span>
                  {result.handFlowers.map((t, i) => (
                    <TileComponent key={i} tileId={t} size="discard" />
                  ))}
                </div>
              )}
            </div>

            {/* Tai breakdown */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.07)] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  台数 Score
                </span>
                <span className="font-bold text-[var(--accent-gold)]">
                  {result.tai} 台{" "}
                  {result.selfDraw
                    ? "· 自摸"
                    : result.robKong
                      ? "· 抢杠"
                      : "· 出铳"}
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
                    无计分项 No scoring elements.
                  </span>
                )}
              </div>
            </div>

            {/* Payment */}
            <div className="flex items-center justify-between rounded-xl bg-[rgba(0,0,0,0.2)] px-4 py-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {result.payments[human.index] >= 0 ? "你收 Collect" : "你付 Pay"}
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
                  筹码 {money(human.stack).replace("+", "")}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    state.pnl >= 0
                      ? "text-[var(--feedback-correct)]"
                      : "text-[var(--feedback-wrong)]"
                  }`}
                >
                  盈亏 {money(state.pnl)}
                </div>
              </div>
            </div>

            {/* Who paid whom */}
            <PaymentBreakdown state={state} />
          </div>
        )}

        {/* Washout: still show any mid-hand bonus payments */}
        {!result && state.payEvents.length > 0 && (
          <div className="px-6 py-4">
            <PaymentBreakdown state={state} />
          </div>
        )}

        {/* Last discard feedback */}
        {lastDiscard && (
          <div className="mx-6 mb-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.18)] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              你最后打出 Last discard: {tileName(lastDiscard.tile)}
            </div>
            <div
              className={`mt-1 text-sm ${
                lastDiscard.verdict === "best"
                  ? "text-[var(--feedback-correct)]"
                  : lastDiscard.verdict === "fine"
                    ? "text-[var(--text-muted)]"
                    : lastDiscard.verdict === "mistake"
                      ? "text-[var(--feedback-wrong)]"
                      : "text-[var(--feedback-neutral)]"
              }`}
            >
              {lastDiscard.verdict === "best"
                ? "✓ "
                : lastDiscard.verdict === "fine"
                  ? "○ "
                  : lastDiscard.verdict === "mistake"
                    ? "✗ "
                    : "~ "}
              {lastDiscard.text || "无反馈记录 No feedback recorded."}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="gold" fullWidth onClick={onNext} className="py-3.5">
            下一局 · NEXT HAND
          </Button>
          <Button variant="outline" onClick={onHome} className="py-3.5">
            首页
          </Button>
        </div>
      </div>
    </div>
  );
}

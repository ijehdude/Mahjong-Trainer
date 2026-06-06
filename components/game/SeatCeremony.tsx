"use client";

import { useEffect, useRef, useState } from "react";
import type { GameRules } from "@/types/game";
import { WIND_NAME, WINDS } from "@/types/tiles";
import type { Wind } from "@/types/tiles";
import { shuffle } from "@/lib/mahjong/deck";
import TileComponent from "./TileComponent";
import Button from "@/components/shared/Button";

/* ===========================================================================
   Interactive seat ceremony. The player clicks to roll three dice, the bots
   roll in turn, the highest roller picks a face-down wind tile first, and the
   tiles reveal one by one (player first). Whoever draws East is the dealer.
   =========================================================================== */

interface Props {
  rules: GameRules;
  onSeated: (seatIndex: number) => void;
}

function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}
function roll3() {
  return [rollDie(), rollDie(), rollDie()];
}

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }: { value: number; rolling?: boolean }) {
  const pips = PIP_LAYOUT[value] ?? [];
  return (
    <div
      className={`grid h-8 w-8 grid-cols-3 grid-rows-3 gap-px rounded-md border border-[#d9d2c2] bg-gradient-to-b from-white to-[#ece5d6] p-1 shadow-[0_1px_0_#cdc3ac,0_2px_4px_rgba(0,0,0,0.4)] ${
        rolling ? "animate-[spin_0.5s_linear_infinite]" : "animate-pop-in"
      }`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={`m-auto h-1.5 w-1.5 rounded-full ${
            pips.includes(i)
              ? value === 1 || value === 4
                ? "bg-[var(--accent-red)]"
                : "bg-[#2b2b2b]"
              : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

interface Roller {
  isHuman: boolean;
  dice: number[];
  total: number;
  wind: Wind;
  rank: number; // 0 = picks first (highest)
}

export default function SeatCeremony({ rules, onSeated }: Props) {
  const n = rules.players;

  // Everything is decided up front; the timeline just reveals it gradually.
  const planRef = useRef<{ rollers: Roller[]; seatIndex: number } | null>(null);
  if (!planRef.current) {
    const dice = Array.from({ length: n }, () => roll3());
    const totals = dice.map((d) => d[0] + d[1] + d[2]);
    const tiebreak = Array.from({ length: n }, () => Math.random());
    // Rank rollers by total (desc); ties broken randomly. Roller 0 is YOU.
    const order = Array.from({ length: n }, (_, i) => i).sort(
      (a, b) => totals[b] - totals[a] || tiebreak[a] - tiebreak[b]
    );
    const windOrder = shuffle(WINDS.slice(0, n)); // face-down tiles
    const rank: number[] = new Array(n).fill(0);
    const wind: Wind[] = new Array(n).fill("east");
    order.forEach((rollerIdx, pickPos) => {
      rank[rollerIdx] = pickPos;
      wind[rollerIdx] = windOrder[pickPos]; // picks in rank order
    });
    const rollers: Roller[] = Array.from({ length: n }, (_, i) => ({
      isHuman: i === 0,
      dice: dice[i],
      total: totals[i],
      wind: wind[i],
      rank: rank[i],
    }));
    planRef.current = {
      rollers,
      seatIndex: WINDS.indexOf(wind[0]),
    };
  }
  const { rollers, seatIndex } = planRef.current;
  const humanWind = rollers[0].wind;

  // Reveal order for the wind tiles: YOU first, then the rest by rank.
  const revealOrder = [
    0,
    ...rollers
      .map((_, i) => i)
      .filter((i) => i !== 0)
      .sort((a, b) => rollers[a].rank - rollers[b].rank),
  ];

  const [started, setStarted] = useState(false);
  const [rolledCount, setRolledCount] = useState(0); // how many rollers shown
  const [tumble, setTumble] = useState([1, 1, 1]);
  const [assigned, setAssigned] = useState(false);
  const [flipped, setFlipped] = useState(0); // wind tiles revealed
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!started) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const at = (fn: () => void, t: number) =>
      timeouts.push(setTimeout(fn, t));

    const interval = setInterval(() => setTumble(roll3()), 80);
    at(() => {
      clearInterval(interval);
      setRolledCount(1); // YOU settles
    }, 900);
    for (let b = 1; b < n; b++) at(() => setRolledCount(b + 1), 900 + b * 650);

    const afterRolls = 900 + (n - 1) * 650;
    at(() => setAssigned(true), afterRolls + 600);
    for (let r = 0; r < n; r++)
      at(() => setFlipped(r + 1), afterRolls + 1200 + r * 600);
    at(() => setDone(true), afterRolls + 1200 + n * 600);

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, [started, n]);

  const isRevealed = (rollerIdx: number) =>
    flipped > revealOrder.indexOf(rollerIdx);

  return (
    <div className="tile-texture fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[var(--bg-dark)] px-6 py-8">
      <h2 className="font-display text-2xl font-bold tracking-wide text-[var(--accent-gold)]">
        掷骰定位
      </h2>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
        Roll for Seats
      </p>

      {/* Roller rows */}
      <div className="mt-7 w-full max-w-[400px] space-y-2.5">
        {rollers.map((r, i) => {
          const hasRolled = rolledCount > i;
          const rolling = started && rolledCount === i && i === 0;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                r.isHuman
                  ? "border-[var(--accent-gold)]/50 bg-[rgba(201,168,76,0.08)]"
                  : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]"
              }`}
            >
              <span
                className={`w-12 shrink-0 text-[11px] font-bold uppercase tracking-wider ${
                  r.isHuman ? "text-[var(--accent-gold)]" : "text-[var(--text-muted)]"
                }`}
              >
                {r.isHuman ? "你 YOU" : `BOT ${i}`}
              </span>

              {/* Dice */}
              <div className="flex w-[104px] shrink-0 gap-1">
                {hasRolled
                  ? r.dice.map((v, k) => <Die key={k} value={v} />)
                  : rolling
                    ? tumble.map((v, k) => <Die key={k} value={v} rolling />)
                    : [0, 1, 2].map((k) => (
                        <div
                          key={k}
                          className="h-8 w-8 rounded-md border border-dashed border-[rgba(255,255,255,0.12)]"
                        />
                      ))}
              </div>

              {/* Total + rank */}
              <div className="w-12 shrink-0 text-center">
                {hasRolled && (
                  <span className="animate-pop-in text-lg font-bold text-[var(--text-primary)]">
                    {r.total}
                  </span>
                )}
              </div>
              <div className="w-8 shrink-0 text-center">
                {assigned && (
                  <span className="animate-pop-in text-[11px] font-bold text-[var(--accent-gold)]">
                    #{r.rank + 1}
                  </span>
                )}
              </div>

              {/* Wind tile (face-down until revealed) */}
              <div className="ml-auto">
                {assigned ? (
                  <TileComponent
                    tileId={r.wind}
                    size="discard"
                    faceDown={!isRevealed(i)}
                    selected={isRevealed(i) && r.isHuman}
                  />
                ) : (
                  <div className="h-11 w-8" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls / result */}
      <div className="mt-7 w-full max-w-[400px] text-center">
        {!started && (
          <Button
            variant="gold"
            fullWidth
            onClick={() => setStarted(true)}
            className="py-3.5 text-base font-bold tracking-wide"
          >
            🎲 掷骰子 · ROLL THE DICE
          </Button>
        )}

        {started && !done && (
          <p className="text-sm text-[var(--text-muted)]">
            {rolledCount < n
              ? "投掷中… rolling"
              : !assigned
                ? "按点数大小依次摸牌… picking"
                : "翻牌… revealing"}
          </p>
        )}

        {done && (
          <div className="animate-slide-up">
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              你抽到{" "}
              <span className="text-[var(--accent-gold)]">
                {WIND_NAME[humanWind]}风
              </span>{" "}
              · {WIND_NAME[humanWind]} seat
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {humanWind === "east"
                ? "你是庄家 · You are the dealer (East)"
                : "圈风东 · East round, dealer is East"}
            </p>
            <Button
              variant="gold"
              fullWidth
              onClick={() => onSeated(seatIndex)}
              className="mt-4 py-3.5 font-bold tracking-wide"
            >
              入座开始 · TAKE YOUR SEAT
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameRules } from "@/types/game";
import { WIND_NAME, WINDS } from "@/types/tiles";
import type { Wind } from "@/types/tiles";
import { shuffle } from "@/lib/mahjong/deck";
import TileComponent from "./TileComponent";
import Button from "@/components/shared/Button";

/* ===========================================================================
   Interactive seat ceremony. The player rolls, the bots roll, then players draw
   face-down wind tiles in rank order (highest first). Ties are broken by the
   tied players re-rolling — triggered manually by the player, never automatic.
   =========================================================================== */

interface Props {
  rules: GameRules;
  onSeated: (seatIndex: number) => void;
}

const rollDie = () => 1 + Math.floor(Math.random() * 6);
const roll3 = () => [rollDie(), rollDie(), rollDie()];
const sum3 = () => roll3().reduce((a, b) => a + b, 0);

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
      className={`grid h-7 w-7 grid-cols-3 grid-rows-3 gap-px rounded-md border border-[#d9d2c2] bg-gradient-to-b from-white to-[#ece5d6] p-1 shadow-[0_1px_0_#cdc3ac,0_2px_3px_rgba(0,0,0,0.4)] ${
        rolling ? "animate-[spin_0.5s_linear_infinite]" : "animate-pop-in"
      }`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={`m-auto h-1 w-1 rounded-full ${
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

type Phase =
  | "ready"
  | "rolling"
  | "tie"
  | "rerolling"
  | "picking"
  | "revealing"
  | "done";

/** Tied players sharing an identical key (total + re-roll history). */
function tieGroupsOf(keys: number[][]): number[][] {
  const groups: Record<string, number[]> = {};
  keys.forEach((k, i) => ((groups[k.join(",")] ??= []).push(i)));
  return Object.values(groups).filter((g) => g.length > 1);
}

export default function SeatCeremony({ rules, onSeated }: Props) {
  const n = rules.players;

  // Fixed up front: each roller's initial dice and the hidden wind under each
  // tile. Re-rolls are appended to `keys` (state) as the player triggers them.
  const fixed = useRef<{ dice: number[][]; totals: number[]; windAt: Wind[] }>(
    null as unknown as { dice: number[][]; totals: number[]; windAt: Wind[] }
  );
  if (!fixed.current) {
    const dice = Array.from({ length: n }, roll3);
    fixed.current = {
      dice,
      totals: dice.map((d) => d[0] + d[1] + d[2]),
      windAt: shuffle(WINDS.slice(0, n)),
    };
  }
  const { dice, totals, windAt } = fixed.current;

  const [phase, setPhase] = useState<Phase>("ready");
  const [rolledCount, setRolledCount] = useState(0);
  const [tumble, setTumble] = useState([1, 1, 1]);
  const [rerollTumble, setRerollTumble] = useState(7);
  const [keys, setKeys] = useState<number[][]>(() => totals.map((t) => [t]));
  const [pickStep, setPickStep] = useState(0);
  const [takenBy, setTakenBy] = useState<(number | null)[]>(
    new Array(n).fill(null)
  );
  const [flipped, setFlipped] = useState(0);

  const tieGroups = useMemo(() => tieGroupsOf(keys), [keys]);
  const tiedSet = useMemo(() => new Set(tieGroups.flat()), [tieGroups]);
  const hasTie = tieGroups.length > 0;

  const { pickOrder, rank } = useMemo(() => {
    const cmp = (a: number, b: number) => {
      const ka = keys[a];
      const kb = keys[b];
      for (let d = 0; d < Math.max(ka.length, kb.length); d++) {
        const va = ka[d] ?? 0;
        const vb = kb[d] ?? 0;
        if (va !== vb) return vb - va;
      }
      return 0;
    };
    const order = Array.from({ length: n }, (_, i) => i).sort(cmp);
    const r = new Array(n).fill(0);
    order.forEach((p, pos) => (r[p] = pos));
    return { pickOrder: order, rank: r };
  }, [keys, n]);

  const currentPicker = pickOrder[pickStep];
  const yourTurn = phase === "picking" && currentPicker === 0;
  const orderSettled =
    phase === "picking" || phase === "revealing" || phase === "done";

  // ---- Initial rolling animation ----------------------------------------
  useEffect(() => {
    if (phase !== "rolling") return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const interval = setInterval(() => setTumble(roll3()), 80);
    timeouts.push(
      setTimeout(() => {
        clearInterval(interval);
        setRolledCount(1);
      }, 900)
    );
    for (let b = 1; b < n; b++)
      timeouts.push(setTimeout(() => setRolledCount(b + 1), 900 + b * 650));
    timeouts.push(
      setTimeout(
        () => setPhase(tieGroupsOf(keys).length > 0 ? "tie" : "picking"),
        900 + (n - 1) * 650 + 500
      )
    );
    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, n]);

  // ---- Re-roll animation (manual) ---------------------------------------
  useEffect(() => {
    if (phase !== "rerolling") return;
    const interval = setInterval(() => setRerollTumble(sum3()), 80);
    const t = setTimeout(() => {
      clearInterval(interval);
      const groups = tieGroupsOf(keys);
      const next = keys.map((k) => [...k]);
      for (const g of groups) for (const i of g) next[i].push(sum3());
      setKeys(next);
      setPhase(tieGroupsOf(next).length > 0 ? "tie" : "picking");
    }, 900);
    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---- Auto-pick for bots; wait for the human ---------------------------
  useEffect(() => {
    if (phase !== "picking") return;
    if (pickStep >= n) {
      setPhase("revealing");
      return;
    }
    if (currentPicker === 0) return; // human picks manually
    const t = setTimeout(() => {
      setTakenBy((prev) => {
        const free = prev
          .map((v, i) => (v === null ? i : -1))
          .filter((i) => i >= 0);
        const pos = free[Math.floor(Math.random() * free.length)];
        const next = [...prev];
        next[pos] = currentPicker;
        return next;
      });
      setPickStep((s) => s + 1);
    }, 750);
    return () => clearTimeout(t);
  }, [phase, pickStep, currentPicker, n]);

  // ---- Reveal tiles one by one (you first) ------------------------------
  const revealPositions = useMemo(() => {
    if (phase !== "revealing" && phase !== "done") return [];
    const positions = takenBy.map((_, i) => i);
    const youPos = takenBy.indexOf(0);
    const others = positions
      .filter((p) => p !== youPos)
      .sort((a, b) => rank[takenBy[a]!] - rank[takenBy[b]!]);
    return [youPos, ...others];
  }, [phase, takenBy, rank]);

  useEffect(() => {
    if (phase !== "revealing") return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let r = 0; r < n; r++)
      timeouts.push(setTimeout(() => setFlipped(r + 1), 350 + r * 600));
    timeouts.push(setTimeout(() => setPhase("done"), 350 + n * 600));
    return () => timeouts.forEach(clearTimeout);
  }, [phase, n]);

  const handlePick = (pos: number) => {
    if (!yourTurn || takenBy[pos] !== null) return;
    setTakenBy((prev) => {
      const next = [...prev];
      next[pos] = 0;
      return next;
    });
    setPickStep((s) => s + 1);
  };

  const isRevealed = (pos: number) =>
    flipped > revealPositions.indexOf(pos) && revealPositions.indexOf(pos) >= 0;

  const youPos = takenBy.indexOf(0);
  const humanWind = youPos >= 0 ? windAt[youPos] : "east";
  const seatIndex = WINDS.indexOf(humanWind);

  return (
    <div className="tile-texture fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[var(--bg-dark)] px-5 py-8">
      <h2 className="font-display text-2xl font-bold tracking-wide text-[var(--accent-gold)]">
        掷骰定位
      </h2>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
        Roll for Seats
      </p>

      {/* Roller dice rows */}
      <div className="mt-6 w-full max-w-[400px] space-y-2">
        {Array.from({ length: n }, (_, i) => {
          const hasRolled = rolledCount > i;
          const rolling = phase === "rolling" && rolledCount === i && i === 0;
          const picking = phase === "picking" && currentPicker === i;
          const isTied = tiedSet.has(i);
          const tieHighlight = (phase === "tie" || phase === "rerolling") && isTied;
          const rerolls = keys[i].slice(1);
          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors ${
                i === 0
                  ? "border-[var(--accent-gold)]/50 bg-[rgba(201,168,76,0.08)]"
                  : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]"
              } ${picking ? "ring-1 ring-[var(--accent-gold)]" : ""} ${
                tieHighlight ? "ring-1 ring-[#e8a59d]" : ""
              }`}
            >
              <span
                className={`w-11 shrink-0 text-[11px] font-bold uppercase ${
                  i === 0 ? "text-[var(--accent-gold)]" : "text-[var(--text-muted)]"
                }`}
              >
                {i === 0 ? "你 YOU" : `BOT ${i}`}
              </span>
              <div className="flex w-[92px] shrink-0 gap-1">
                {hasRolled
                  ? dice[i].map((v, k) => <Die key={k} value={v} />)
                  : rolling
                    ? tumble.map((v, k) => <Die key={k} value={v} rolling />)
                    : [0, 1, 2].map((k) => (
                        <div
                          key={k}
                          className="h-7 w-7 rounded-md border border-dashed border-[rgba(255,255,255,0.12)]"
                        />
                      ))}
              </div>
              <div className="w-7 text-center text-base font-bold text-[var(--text-primary)]">
                {hasRolled ? totals[i] : ""}
              </div>
              {/* tie re-roll value(s) */}
              <div className="w-12 text-center text-[10px] font-semibold text-[#e8a59d]">
                {phase === "rerolling" && isTied
                  ? `↻ ${rerollTumble}`
                  : rerolls.length > 0
                    ? `↻ ${rerolls.join("/")}`
                    : ""}
              </div>
              <div className="ml-auto text-right text-[11px] font-bold text-[var(--accent-gold)]">
                {orderSettled ? `#${rank[i] + 1}` : ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tile pool */}
      {(phase === "picking" || phase === "revealing" || phase === "done") && (
        <div className="mt-6 flex items-start justify-center gap-2.5">
          {windAt.map((w, pos) => {
            const taker = takenBy[pos];
            const revealed = isRevealed(pos);
            const clickable = yourTurn && taker === null;
            return (
              <button
                key={pos}
                onClick={() => handlePick(pos)}
                disabled={!clickable}
                className={`flex flex-col items-center gap-1 rounded-xl p-1 transition-transform ${
                  clickable
                    ? "-translate-y-1 cursor-pointer animate-pulse"
                    : "cursor-default"
                } ${taker !== null && !revealed ? "opacity-70" : ""}`}
              >
                <TileComponent
                  tileId={w}
                  size="hand"
                  faceDown={!revealed}
                  selected={revealed && taker === 0}
                />
                <span
                  className={`text-[10px] font-bold uppercase ${
                    taker === 0
                      ? "text-[var(--accent-gold)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {taker === null ? " " : taker === 0 ? "你" : `BOT ${taker}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Controls / status / result */}
      <div className="mt-6 w-full max-w-[400px] text-center">
        {phase === "ready" && (
          <Button
            variant="gold"
            fullWidth
            onClick={() => setPhase("rolling")}
            className="py-3.5 text-base font-bold tracking-wide"
          >
            🎲 掷骰子 · ROLL THE DICE
          </Button>
        )}

        {phase === "rolling" && (
          <p className="text-sm text-[var(--text-muted)]">投掷中… rolling</p>
        )}

        {(phase === "tie" || phase === "rerolling") && (
          <>
            <p className="mb-3 text-sm font-semibold text-[#e8a59d]">
              {tiedSet.has(0)
                ? "平手！轮到你重掷 · Tie — your re-roll"
                : "平手！点击重掷 · Tie — tap to re-roll"}
            </p>
            <Button
              variant="gold"
              fullWidth
              disabled={phase === "rerolling"}
              onClick={() => setPhase("rerolling")}
              className="py-3.5 text-base font-bold tracking-wide"
            >
              🎲 重掷 · RE-ROLL
            </Button>
          </>
        )}

        {phase === "picking" && (
          <p className="text-sm font-semibold text-[var(--accent-gold)]">
            {yourTurn
              ? "轮到你摸牌 — 点选一张 · Your pick — tap a tile"
              : `BOT ${currentPicker} 摸牌中… picking`}
          </p>
        )}

        {phase === "revealing" && (
          <p className="text-sm text-[var(--text-muted)]">翻牌… revealing</p>
        )}

        {phase === "done" && (
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

"use client";

import { useEffect, useRef, useState } from "react";
import type { GameRules } from "@/types/game";
import { WIND_NAME, WINDS } from "@/types/tiles";
import type { Wind } from "@/types/tiles";
import { shuffle } from "@/lib/mahjong/deck";
import TileComponent from "./TileComponent";
import Button from "@/components/shared/Button";

/* ===========================================================================
   Pre-game seat ceremony: roll three dice, draw the face-down wind tiles, and
   reveal which seat the player takes. The round wind is always East.
   =========================================================================== */

interface Props {
  rules: GameRules;
  onSeated: (seatIndex: number) => void;
}

function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const pips = PIP_LAYOUT[value] ?? [];
  return (
    <div
      className={`grid h-12 w-12 grid-cols-3 grid-rows-3 gap-0.5 rounded-xl border border-[#d9d2c2] bg-gradient-to-b from-white to-[#ece5d6] p-1.5 shadow-[0_2px_0_#cdc3ac,0_4px_7px_rgba(0,0,0,0.45)] ${
        rolling ? "animate-[spin_0.6s_linear_infinite]" : ""
      }`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={`m-auto h-2 w-2 rounded-full ${
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

export default function SeatCeremony({ rules, onSeated }: Props) {
  const n = rules.players;
  // Final roll + shuffled face-down winds are fixed on mount.
  const finalRef = useRef<{ dice: number[]; order: Wind[] }>({
    dice: [rollDie(), rollDie(), rollDie()],
    order: shuffle(WINDS.slice(0, n)),
  });
  const { dice, order } = finalRef.current;
  const sum = dice[0] + dice[1] + dice[2];
  const drawnWind = order[sum % n];
  const seatIndex = WINDS.indexOf(drawnWind);

  const [phase, setPhase] = useState<"rolling" | "revealed">("rolling");
  const [shown, setShown] = useState<number[]>([1, 1, 1]);

  useEffect(() => {
    // Tumble the dice, then settle on the real values and reveal.
    const id = setInterval(
      () => setShown([rollDie(), rollDie(), rollDie()]),
      90
    );
    const stop = setTimeout(() => {
      clearInterval(id);
      setShown(dice);
      setPhase("revealed");
    }, 1400);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [dice]);

  const revealed = phase === "revealed";

  return (
    <div className="tile-texture fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-dark)] px-6">
      <h2 className="font-display text-2xl font-bold tracking-wide text-[var(--accent-gold)]">
        掷骰定位
      </h2>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
        Roll for Seats
      </p>

      {/* Dice */}
      <div className="mt-8 flex items-center gap-3">
        {(revealed ? dice : shown).map((v, i) => (
          <Die key={i} value={v} rolling={!revealed} />
        ))}
      </div>
      <div className="mt-3 h-5 text-sm text-[var(--text-muted)]">
        {revealed ? `点数 Total: ${sum}` : "投掷中…"}
      </div>

      {/* Wind tiles */}
      <div className="mt-6 flex items-end justify-center gap-2">
        {order.map((w) => {
          const isYou = w === drawnWind;
          return (
            <div key={w} className="flex flex-col items-center gap-1.5">
              <div
                className={
                  revealed && isYou
                    ? "animate-pop-in"
                    : revealed
                      ? ""
                      : ""
                }
              >
                <TileComponent
                  tileId={w}
                  size="hand"
                  faceDown={!revealed}
                  selected={revealed && isYou}
                />
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  revealed && isYou
                    ? "text-[var(--accent-gold)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {revealed ? (isYou ? "你 YOU" : "BOT") : "?"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Result + continue */}
      <div className="mt-8 h-24 w-full max-w-[360px] text-center">
        {revealed && (
          <div className="animate-slide-up">
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              你抽到{" "}
              <span className="text-[var(--accent-gold)]">
                {WIND_NAME[drawnWind as keyof typeof WIND_NAME]}风
              </span>{" "}
              · {WIND_NAME[drawnWind as keyof typeof WIND_NAME]} seat
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              圈风 East round · 庄家东 Dealer is East
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

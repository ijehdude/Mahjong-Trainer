import type { GameRules } from "@/types/game";
import type { Meld } from "@/types/game";
import type { TileId, Wind } from "@/types/tiles";
import { DRAGONS } from "@/types/tiles";
import { Decomposition } from "./handValidator";
import { isSuit, suitOf } from "./tiles";

/* ===========================================================================
   Singapore tai (points) scoring.
   =========================================================================== */

export interface TaiResult {
  tai: number; // final tai after caps / chicken adjustment
  rawTai: number; // before cap
  breakdown: { label: string; tai: number }[];
  chicken: boolean; // won as a chicken hand (0 natural tai)
}

interface ScoreContext {
  decomposition: Decomposition;
  melds: Meld[];
  seatWind: Wind;
  roundWind: Wind;
  selfDraw: boolean;
  flowerCount: number;
  rules: GameRules;
}

const FEI_TAI: Record<GameRules["feiPayout"], number> = {
  none: 0,
  "1tai": 1,
  "2tai": 2,
};

export function calculateTai(ctx: ScoreContext): TaiResult {
  const { decomposition, melds, seatWind, roundWind, selfDraw, flowerCount, rules } =
    ctx;
  const breakdown: { label: string; tai: number }[] = [];

  const allSets = decomposition.sets;
  const allTiles = [
    ...allSets.flatMap((s) => s.tiles),
    decomposition.pair,
    decomposition.pair,
  ];

  // ---- Honor triplets: seat wind, round wind, dragons ----------------------
  for (const set of allSets) {
    if (set.type !== "triplet") continue;
    const t = set.tiles[0];
    if (t === seatWind) breakdown.push({ label: "Seat wind triplet", tai: 1 });
    if (t === roundWind && roundWind !== seatWind)
      breakdown.push({ label: "Round wind triplet", tai: 1 });
    if (t === roundWind && roundWind === seatWind)
      breakdown.push({ label: "Double wind (seat = round)", tai: 1 });
    if ((DRAGONS as string[]).includes(t)) {
      const name = { zhong: "Red", fa: "Green", bai: "White" }[
        t as "zhong" | "fa" | "bai"
      ];
      breakdown.push({ label: `${name} dragon triplet`, tai: 1 });
    }
  }

  // ---- All triplets (对对胡) ------------------------------------------------
  const allTriplets = allSets.every((s) => s.type === "triplet");
  if (allTriplets) breakdown.push({ label: "All triplets (对对胡)", tai: 3 });

  // ---- All one suit (清一色) — pure, no honors -----------------------------
  const suitTiles = allTiles.filter(isSuit);
  if (suitTiles.length === allTiles.length) {
    const suits = new Set(suitTiles.map((t) => suitOf(t)));
    if (suits.size === 1)
      breakdown.push({ label: "All one suit (清一色)", tai: 3 });
  }

  // ---- Self-draw (自摸) -----------------------------------------------------
  if (selfDraw) breakdown.push({ label: "Self-draw (自摸)", tai: 1 });

  // ---- Kong bonus ----------------------------------------------------------
  if (rules.kongBonus) {
    const kongs = melds.filter((m) => m.type === "kong").length;
    for (let i = 0; i < kongs; i++)
      breakdown.push({ label: "Kong", tai: 1 });
  }

  // ---- Flowers / Seasons ---------------------------------------------------
  if (rules.flowerTiles && flowerCount > 0) {
    const per = FEI_TAI[rules.feiPayout];
    if (per > 0)
      breakdown.push({
        label: `${flowerCount} flower/season`,
        tai: per * flowerCount,
      });
  }

  const rawTai = breakdown.reduce((s, b) => s + b.tai, 0);

  // ---- Chicken hand handling ----------------------------------------------
  let chicken = false;
  let tai = rawTai;
  if (rawTai === 0) {
    if (rules.chickenHand) {
      chicken = true;
      tai = 1;
      breakdown.push({ label: "Chicken hand (鸡胡)", tai: 1 });
    }
  }

  // ---- Limit cap -----------------------------------------------------------
  if (rules.limitHandCap && tai > 8) {
    tai = 8;
    breakdown.push({ label: "Limit cap (8 tai)", tai: 0 });
  }

  return { tai, rawTai, breakdown, chicken };
}

/**
 * Compute per-player dollar payments. Winner collects `tai * rate` from each
 * loser. On a discard win, the discarder pays for everyone (pao-style simplified:
 * here we use the common Singapore rule where the discarder pays double and
 * others pay their share only on self-draw). We model the widely used variant:
 *   - Self-draw: every loser pays winner `tai * rate` (dealer pays double).
 *   - Discard win: the discarder pays the full `3 * tai * rate`; others pay 0.
 * Dealer involvement doubles that player's share.
 */
export function computePayments(opts: {
  playerCount: number;
  winnerIndex: number;
  dealerIndex: number;
  discarderIndex: number | null; // null => self-draw
  tai: number;
  rate: number;
}): number[] {
  const { playerCount, winnerIndex, dealerIndex, discarderIndex, tai, rate } =
    opts;
  const base = tai * rate;
  const payments = new Array(playerCount).fill(0);

  const multiplier = (idx: number) =>
    idx === dealerIndex || winnerIndex === dealerIndex ? 2 : 1;

  if (discarderIndex === null) {
    // Self-draw: everyone pays.
    for (let i = 0; i < playerCount; i++) {
      if (i === winnerIndex) continue;
      const amt = base * multiplier(i);
      payments[i] -= amt;
      payments[winnerIndex] += amt;
    }
  } else {
    // Discard win: discarder pays the table (3 shares).
    const amt = base * 3 * multiplier(discarderIndex);
    payments[discarderIndex] -= amt;
    payments[winnerIndex] += amt;
  }
  return payments.map((p) => Math.round(p * 100) / 100);
}

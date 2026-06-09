import type { GameRules } from "@/types/game";
import type { Meld } from "@/types/game";
import { LIMIT_TAI } from "@/types/game";
import type { TileId, Wind } from "@/types/tiles";
import { ANIMAL_NAME, DRAGONS, WINDS } from "@/types/tiles";
import {
  Decomposition,
  isSevenPairs,
  isThirteenOrphans,
  isTwoSidedSequenceWait,
} from "./handValidator";
import { isAnimal, isFlowerOrSeason, isSuit, suitOf } from "./tiles";

/* ===========================================================================
   Singapore tai (points) scoring, including special / limit hands.
   =========================================================================== */

export interface TaiResult {
  tai: number; // final tai after the limit cap
  rawTai: number; // before cap
  breakdown: { label: string; tai: number }[];
  limit: boolean; // a recognised limit hand was scored
}

interface ScoreContext {
  /** null => the hand is Thirteen Orphans (no standard decomposition). */
  decomposition: Decomposition | null;
  /** Full concealed tiles incl. the winning tile (excludes declared melds). */
  concealedTiles: TileId[];
  /** The tile that completed the hand (drawn or claimed). Null if unknown. */
  winningTile: TileId | null;
  melds: Meld[];
  seatWind: Wind;
  roundWind: Wind;
  selfDraw: boolean;
  robKong: boolean;
  /** Won on the very last available tile (last draw or last discard) — 海底. */
  lastTile: boolean;
  /** Heavenly/Earthly hand (first-turn limit wins), if applicable. */
  firstTurnWin?: "tian" | "di";
  /** The winner's revealed bonus tiles (flowers, seasons and animals). */
  bonusTiles: TileId[];
  rules: GameRules;
}

const FEI_TAI: Record<GameRules["feiPayout"], number> = {
  none: 0,
  "1tai": 1,
  "2tai": 2,
};

/** Seat → flower/season number (a flower scores only if it matches this). */
const SEAT_NUMBER: Record<Wind, number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4,
};

/** Pure Nine Gates shape: one suit, 3x1, 3x9, at least one each of 2–8. */
function isNineGates(tiles: TileId[], melds: Meld[]): boolean {
  if (melds.length > 0 || tiles.length !== 14) return false;
  if (!tiles.every(isSuit)) return false;
  const suits = new Set(tiles.map((t) => suitOf(t)));
  if (suits.size !== 1) return false;
  const suit = [...suits][0]!;
  const c = (r: number) => tiles.filter((t) => t === `${r}${suit}`).length;
  if (c(1) < 3 || c(9) < 3) return false;
  for (let r = 2; r <= 8; r++) if (c(r) < 1) return false;
  return true;
}

export function calculateTai(ctx: ScoreContext): TaiResult {
  const {
    decomposition,
    concealedTiles,
    winningTile,
    melds,
    seatWind,
    roundWind,
    selfDraw,
    robKong,
    lastTile,
    firstTurnWin,
    bonusTiles,
    rules,
  } = ctx;
  const breakdown: { label: string; tai: number }[] = [];
  let limit = false;
  // Holding any flower/season/animal turns a bare win into Chou Ping Hu 臭平胡.
  const hasBonus = bonusTiles.length > 0;

  // Kong bonus and the animal-pair bonus are paid immediately (see gameState),
  // not as winning-hand tai. Self-draw adds NO tai — its reward comes from the
  // payment structure (everyone pays) rather than extra points.
  const addBonus = () => {
    // Fully concealed hand 门清 — no exposed melds (concealed kongs still count
    // as concealed). +1 tai whether won by self-draw or discard.
    if (melds.every((m) => m.concealed))
      breakdown.push({ label: "Fully concealed 门清", tai: 1 });

    // 海底捞月 / 海底捞针 — winning on the very last available tile of the hand
    // (the last wall draw self-drawn, or the last discard ronned). +1 tai.
    if (lastTile)
      breakdown.push({ label: "Last tile 海底捞月", tai: 1 });

    if (rules.robbingKong && robKong)
      breakdown.push({ label: "Robbing the kong 抢杠", tai: 1 });

    // Flowers & seasons — Singapore rule: a flower/season only scores when its
    // NUMBER matches the player's seat (East=1, South=2, West=3, North=4).
    // Non-matching flowers grant a replacement draw but no tai.
    if (rules.flowerTiles) {
      const seatNum = SEAT_NUMBER[seatWind];
      const fs = bonusTiles.filter(isFlowerOrSeason);
      const matching = fs.filter((t) => Number(t[1]) === seatNum);
      const per = FEI_TAI[rules.feiPayout];
      if (per > 0 && matching.length > 0)
        breakdown.push({
          label: `${matching.length} seat flower 正花`,
          tai: per * matching.length,
        });
      // A complete set of all four flowers (or all four seasons) — 一台花.
      const flowerNums = new Set(fs.filter((t) => t[0] === "f").map((t) => t[1]));
      const seasonNums = new Set(fs.filter((t) => t[0] === "s").map((t) => t[1]));
      if (flowerNums.size === 4)
        breakdown.push({ label: "All 4 flowers 一台花", tai: 1 });
      if (seasonNums.size === 4)
        breakdown.push({ label: "All 4 seasons 一台花", tai: 1 });
    }

    // Animals — +1 tai each (paired or not), plus a bonus tai for all four
    // (so 4 animals = 5 tai). The cat+rat / rooster+centipede pair additionally
    // pays out immediately (see applyAnimalPair in gameState).
    if (rules.animalTiles) {
      const animals = bonusTiles.filter(isAnimal);
      for (const a of animals)
        breakdown.push({
          label: `${ANIMAL_NAME[a as keyof typeof ANIMAL_NAME]} ${
            { cat: "猫", rat: "鼠", rooster: "鸡", centipede: "蜈" }[
              a as "cat" | "rat" | "rooster" | "centipede"
            ]
          }`,
          tai: 1,
        });
      if (animals.length === 4)
        breakdown.push({ label: "All animals 四宝", tai: 1 });
    }
  };

  // ---- Heavenly / Earthly hand — both are limit (满台) hands ---------------
  if (firstTurnWin) {
    breakdown.push({
      label: firstTurnWin === "tian" ? "Heavenly Hand 天胡" : "Earthly Hand 地胡",
      tai: 13,
    });
    limit = true;
    addBonus();
    return finalize(breakdown, rules, limit);
  }

  // ---- Special hands with no standard 4-sets-1-pair decomposition ---------
  if (!decomposition) {
    if (isThirteenOrphans(concealedTiles, melds)) {
      breakdown.push({ label: "Thirteen Orphans 十三幺", tai: 13 });
      limit = true;
      addBonus();
    } else if (isSevenPairs(concealedTiles, melds)) {
      // 2 tai off a discard, 4 tai self-draw (zimo already includes self-draw).
      breakdown.push({ label: "Seven Pairs 七对子", tai: selfDraw ? 4 : 2 });
      addBonus();
    } else {
      addBonus();
    }
    return finalize(breakdown, rules, limit);
  }

  const sets = decomposition.sets;
  const triplets = sets.filter((s) => s.type === "triplet");
  const allTiles = [
    ...sets.flatMap((s) => s.tiles),
    decomposition.pair,
    decomposition.pair,
  ];

  // ---- Honor triplets: seat wind, round wind, dragons ---------------------
  for (const set of triplets) {
    const t = set.tiles[0];
    if (t === seatWind) breakdown.push({ label: "Seat wind triplet 自风", tai: 1 });
    if (t === roundWind && roundWind !== seatWind)
      breakdown.push({ label: "Round wind triplet 圈风", tai: 1 });
    if (t === roundWind && roundWind === seatWind)
      breakdown.push({ label: "Double wind 连风", tai: 1 });
    if ((DRAGONS as string[]).includes(t)) {
      const name = { zhong: "Red", fa: "Green", bai: "White" }[
        t as "zhong" | "fa" | "bai"
      ];
      breakdown.push({ label: `${name} dragon 箭刻`, tai: 1 });
    }
  }

  // ---- Special limit hands -----------------------------------------------
  const dragonTriplets = triplets.filter((s) =>
    (DRAGONS as string[]).includes(s.tiles[0])
  ).length;
  const windTriplets = triplets.filter((s) =>
    (WINDS as string[]).includes(s.tiles[0])
  ).length;
  const pairIsDragon = (DRAGONS as string[]).includes(decomposition.pair);
  const pairIsWind = (WINDS as string[]).includes(decomposition.pair);
  const kongCount = melds.filter((m) => m.type === "kong").length;

  if (dragonTriplets === 3) {
    breakdown.push({ label: "Big Three Dragons 大三元", tai: 8 });
    limit = true;
  } else if (dragonTriplets === 2 && pairIsDragon) {
    breakdown.push({ label: "Small Three Dragons 小三元", tai: 5 });
  }

  if (windTriplets === 4) {
    breakdown.push({ label: "Big Four Winds 大四喜", tai: 13 });
    limit = true;
  } else if (windTriplets === 3 && pairIsWind) {
    breakdown.push({ label: "Small Four Winds 小四喜", tai: 8 });
    limit = true;
  }

  if (kongCount === 4) {
    breakdown.push({ label: "Eighteen Arhats 十八罗汉 (4 kongs)", tai: 13 });
    limit = true;
  }

  if (isNineGates(concealedTiles, melds)) {
    breakdown.push({ label: "Nine Gates 九莲宝灯", tai: 10 });
    limit = true;
  }

  // ---- All triplets (对对胡) ----------------------------------------------
  const allTriplets = sets.every((s) => s.type === "triplet");
  if (allTriplets) breakdown.push({ label: "All triplets 对对胡", tai: 2 });

  // ---- All one suit (清一色) — pure, no honors ----------------------------
  const suitTiles = allTiles.filter(isSuit);
  let flush = false;
  if (suitTiles.length === allTiles.length) {
    const suits = new Set(suitTiles.map((t) => suitOf(t)));
    if (suits.size === 1) {
      flush = true;
      breakdown.push({ label: "All one suit 清一色", tai: 4 });
    }
  }

  // ---- Half flush (混一色) — one suit plus honor tiles only ----------------
  if (!flush) {
    const oneSuit = new Set(suitTiles.map((t) => suitOf(t))).size === 1;
    const nonSuit = allTiles.filter((t) => !isSuit(t));
    const honorsOnly = nonSuit.every(
      (t) => (WINDS as string[]).includes(t) || (DRAGONS as string[]).includes(t)
    );
    if (oneSuit && nonSuit.length > 0 && honorsOnly)
      breakdown.push({ label: "Half flush 混一色", tai: 2 });
  }

  // ---- Ping Hu (平胡) — all sequences, plain (non-value) pair, no flush.
  // A clean Ping Hu scores 4 tai (self-draw or discard alike). Holding any
  // flower/season/animal degrades it to Chou Ping Hu 臭平胡 (1 tai). Ping Hu
  // may only be claimed off a discard from a two-sided (两面) wait; a one-sided
  // wait (edge / closed / pair) must be self-drawn to win.
  const pairTile = decomposition.pair;
  const pairIsValue =
    pairTile === seatWind ||
    pairTile === roundWind ||
    (DRAGONS as string[]).includes(pairTile);
  const twoSidedOk =
    selfDraw ||
    (winningTile !== null &&
      isTwoSidedSequenceWait(concealedTiles, melds, winningTile));
  if (sets.every((s) => s.type === "sequence") && !pairIsValue && !flush && twoSidedOk)
    breakdown.push({
      label: hasBonus ? "Chou Ping Hu 臭平胡" : "Ping Hu 平胡",
      tai: hasBonus ? 1 : 4,
    });

  addBonus();
  return finalize(breakdown, rules, limit);
}

function finalize(
  breakdown: { label: string; tai: number }[],
  rules: GameRules,
  limit: boolean
): TaiResult {
  const rawTai = breakdown.reduce((s, b) => s + b.tai, 0);
  let tai = rawTai;
  if (rules.limitHandCap && tai > LIMIT_TAI) {
    tai = LIMIT_TAI;
    breakdown.push({ label: `Limit cap ${LIMIT_TAI}台`, tai: 0 });
  }
  return { tai, rawTai, breakdown, limit };
}

/**
 * Compute per-player dollar payments on a Singapore doubling scale (uniform —
 * the dealer is not doubled).
 *   unit = rate * 2^tai          (e.g. rate $0.20: 1 tai $0.40, 2 tai $0.80…)
 *   - Self-draw: every other player pays `unit`.
 *   - Discard / robbed win: only the feeder pays, and pays `2 * unit`.
 */
export function computePayments(opts: {
  playerCount: number;
  winnerIndex: number;
  dealerIndex: number;
  discarderIndex: number | null; // null => self-draw
  tai: number;
  rate: number;
}): number[] {
  const { playerCount, winnerIndex, discarderIndex, tai, rate } = opts;
  const unit = rate * Math.pow(2, tai);
  const payments = new Array(playerCount).fill(0);
  const round = (x: number) => Math.round(x * 100) / 100;

  if (discarderIndex === null) {
    // Self-draw: every other player pays one unit.
    for (let i = 0; i < playerCount; i++) {
      if (i === winnerIndex) continue;
      const amt = round(unit);
      payments[i] -= amt;
      payments[winnerIndex] += amt;
    }
  } else {
    // Discard / robbed win: only the feeder pays, double a unit.
    const amt = round(2 * unit);
    payments[discarderIndex] -= amt;
    payments[winnerIndex] += amt;
  }
  return payments.map((p) => Math.round(p * 100) / 100);
}

/**
 * Guaranteed tai already visible from a player's revealed bonus tiles: seat
 * flowers/seasons (正花), the complete-set bonuses, and animals. Used to show a
 * live tai indicator on the table.
 */
export function bonusTaiFor(
  flowers: TileId[],
  seatWind: Wind,
  rules: GameRules
): number {
  let t = 0;
  if (rules.flowerTiles) {
    const seatNum = SEAT_NUMBER[seatWind];
    const fs = flowers.filter(isFlowerOrSeason);
    const matching = fs.filter((x) => Number(x[1]) === seatNum);
    t += FEI_TAI[rules.feiPayout] * matching.length;
    const flowerNums = new Set(fs.filter((x) => x[0] === "f").map((x) => x[1]));
    const seasonNums = new Set(fs.filter((x) => x[0] === "s").map((x) => x[1]));
    if (flowerNums.size === 4) t += 1;
    if (seasonNums.size === 4) t += 1;
  }
  // Animals score +1 tai each, +1 bonus for all four (so 4 = 5 tai).
  if (rules.animalTiles) {
    const ac = flowers.filter(isAnimal).length;
    t += ac + (ac === 4 ? 1 : 0);
  }
  // Only ACTUAL scoring tiles count here. A non-matching flower/season is 0 tai
  // — Chou Ping Hu (holding a bonus tile) only matters when you actually win a
  // tai-less hand, so it is NOT shown as a guaranteed in-play tai.
  return t;
}

/** +1 tai for a pong/kong of a dragon, or of the seat or round wind. */
function honorPongTai(tile: TileId, seatWind: Wind, roundWind: Wind): number {
  if ((DRAGONS as string[]).includes(tile)) return 1;
  if (tile === seatWind || tile === roundWind) return 1; // double wind still +1
  return 0;
}

/**
 * Live tai hint for a player: bonus-tile tai plus tai from MELDED honor
 * pongs/kongs (dragons + seat/round wind) that are exposed on the table.
 * Concealed triplets are not counted — they only score once the hand wins.
 */
export function taiHintFor(
  flowers: TileId[],
  melds: Meld[],
  seatWind: Wind,
  roundWind: Wind,
  rules: GameRules
): number {
  let t = bonusTaiFor(flowers, seatWind, rules);
  for (const m of melds)
    if (m.type === "pong" || m.type === "kong")
      t += honorPongTai(m.tiles[0], seatWind, roundWind);
  return t;
}

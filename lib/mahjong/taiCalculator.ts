import type { GameRules } from "@/types/game";
import type { Meld } from "@/types/game";
import { LIMIT_TAI } from "@/types/game";
import type { TileId, Wind } from "@/types/tiles";
import { DRAGONS, WINDS } from "@/types/tiles";
import { Decomposition, isThirteenOrphans } from "./handValidator";
import { isSuit, suitOf } from "./tiles";

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
  melds: Meld[];
  seatWind: Wind;
  roundWind: Wind;
  selfDraw: boolean;
  robKong: boolean;
  flowerCount: number;
  rules: GameRules;
}

const FEI_TAI: Record<GameRules["feiPayout"], number> = {
  none: 0,
  "1tai": 1,
  "2tai": 2,
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
    melds,
    seatWind,
    roundWind,
    selfDraw,
    robKong,
    flowerCount,
    rules,
  } = ctx;
  const breakdown: { label: string; tai: number }[] = [];
  let limit = false;

  // Note: the Kong Bonus is paid immediately when the kong is declared (see
  // applyKongBonus in gameState) — it is NOT extra tai on the winning hand.
  const addBonus = () => {
    if (selfDraw) breakdown.push({ label: "Self-draw 自摸", tai: 1 });
    if (rules.robbingKong && robKong)
      breakdown.push({ label: "Robbing the kong 抢杠", tai: 1 });
    if (rules.flowerTiles && flowerCount > 0) {
      const per = FEI_TAI[rules.feiPayout];
      if (per > 0)
        breakdown.push({
          label: `${flowerCount} flower/season 花`,
          tai: per * flowerCount,
        });
    }
  };

  // ---- Thirteen Orphans (十三幺) — special limit hand ----------------------
  if (!decomposition) {
    if (isThirteenOrphans(concealedTiles, melds)) {
      breakdown.push({ label: "Thirteen Orphans 十三幺", tai: 13 });
      limit = true;
    }
    addBonus();
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
      breakdown.push({ label: "All one suit 清一色", tai: 3 });
    }
  }

  // ---- Ping Hu (平胡) — all sequences, plain (non-value) pair, no flush ----
  const pairTile = decomposition.pair;
  const pairIsValue =
    pairTile === seatWind ||
    pairTile === roundWind ||
    (DRAGONS as string[]).includes(pairTile);
  if (sets.every((s) => s.type === "sequence") && !pairIsValue && !flush)
    breakdown.push({ label: "Ping Hu 平胡", tai: 1 });

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
  // Chou Ping Hu (臭平胡): a tai-less hand still wins, counting as 1 tai.
  if (tai === 0 && rules.chouPingHu) {
    tai = 1;
    breakdown.push({ label: "Chou Ping Hu 臭平胡", tai: 1 });
  }
  if (rules.limitHandCap && tai > LIMIT_TAI) {
    tai = LIMIT_TAI;
    breakdown.push({ label: `Limit cap ${LIMIT_TAI}台`, tai: 0 });
  }
  return { tai, rawTai, breakdown, limit };
}

/**
 * Compute per-player dollar payments. Winner collects `tai * rate` from each
 * loser. On a discard win, the discarder pays for everyone; dealer involvement
 * doubles that player's share.
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
    // Discard / robbed win: the feeder pays the table (3 shares).
    const amt = base * 3 * multiplier(discarderIndex);
    payments[discarderIndex] -= amt;
    payments[winnerIndex] += amt;
  }
  return payments.map((p) => Math.round(p * 100) / 100);
}

import type { TileId } from "@/types/tiles";
import { ORPHAN_TILES } from "./handValidator";
import { isFei } from "./tiles";

/* ===========================================================================
   Shanten (向听) calculator: how many tile exchanges a hand is from ready.
   0 = tenpai, -1 = complete. Fei tiles count as wildcards (as in the
   validator), and seven pairs / thirteen orphans are covered for fully
   concealed hands.

   The standard-hand search maximises how many hand tiles can sit inside a
   final "S sets + 1 pair" structure (S = concealed sets still needed):

     keep = 3·sets + 2·partials + 2·eye + seeds + jokers

   where a partial is a two-tile proto-set, the eye is a reserved pair, and
   each still-empty block can absorb one leftover tile as a seed. Every
   missing tile costs one draw, so shanten = (3S + 1) - keep.
   =========================================================================== */

const SUIT_KEYS = ["wan", "tong", "bam"] as const;
const HONOR_IDS: TileId[] = [
  "east", "south", "west", "north", "zhong", "fa", "bai",
];

/** All 34 tile types, indexed 0-8 wan, 9-17 tong, 18-26 bam, 27-33 honors. */
export const ALL_TILE_TYPES: TileId[] = [
  ...SUIT_KEYS.flatMap((s) =>
    Array.from({ length: 9 }, (_, i) => `${i + 1}${s}` as TileId)
  ),
  ...HONOR_IDS,
];

const TYPE_INDEX = new Map<TileId, number>(
  ALL_TILE_TYPES.map((t, i) => [t, i])
);

function toCounts(tiles: TileId[]): {
  counts: number[];
  jokers: number;
  totalReal: number;
} {
  const counts = new Array<number>(34).fill(0);
  let jokers = 0;
  let totalReal = 0;
  for (const t of tiles) {
    if (isFei(t)) {
      jokers++;
      continue;
    }
    const i = TYPE_INDEX.get(t);
    if (i !== undefined) {
      counts[i]++;
      totalReal++;
    }
  }
  return { counts, jokers, totalReal };
}

/** Max real tiles keepable toward S sets + 1 pair (jokers added by caller). */
function maxKeepStandard(
  counts: number[],
  S: number,
  totalReal: number
): number {
  let best = 0;

  const dfs = (
    i: number,
    c: number, // complete sets taken
    p: number, // partials taken
    eyeTiles: number, // 0 or 2
    used: number
  ): void => {
    // Optimistic bound: every remaining block filled with 3 tiles + the eye.
    const bound = used + 3 * (S - c - p) + (eyeTiles ? 0 : 2);
    if (bound <= best) return;

    if (i >= 34) {
      const leftover = totalReal - used;
      const slots = S - c - p + (eyeTiles ? 0 : 1);
      const keep = used + Math.min(leftover, Math.max(0, slots));
      if (keep > best) best = keep;
      return;
    }
    if (counts[i] === 0) {
      dfs(i + 1, c, p, eyeTiles, used);
      return;
    }

    // Leave tile i (and any remaining copies) as floaters.
    dfs(i + 1, c, p, eyeTiles, used);

    const suited = i < 27;
    const r = i % 9; // 0-8 within suit

    if (c + p < S) {
      if (counts[i] >= 3) {
        counts[i] -= 3;
        dfs(i, c + 1, p, eyeTiles, used + 3);
        counts[i] += 3;
      }
      if (suited && r <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
        counts[i]--; counts[i + 1]--; counts[i + 2]--;
        dfs(i, c + 1, p, eyeTiles, used + 3);
        counts[i]++; counts[i + 1]++; counts[i + 2]++;
      }
      if (counts[i] >= 2) {
        counts[i] -= 2;
        dfs(i, c, p + 1, eyeTiles, used + 2);
        counts[i] += 2;
      }
      if (suited && r <= 7 && counts[i + 1] > 0) {
        counts[i]--; counts[i + 1]--;
        dfs(i, c, p + 1, eyeTiles, used + 2);
        counts[i]++; counts[i + 1]++;
      }
      if (suited && r <= 6 && counts[i + 2] > 0) {
        counts[i]--; counts[i + 2]--;
        dfs(i, c, p + 1, eyeTiles, used + 2);
        counts[i]++; counts[i + 2]++;
      }
    }
    if (!eyeTiles && counts[i] >= 2) {
      counts[i] -= 2;
      dfs(i, c, p, 2, used + 2);
      counts[i] += 2;
    }
  };

  dfs(0, 0, 0, 0, 0);
  return best;
}

/** Seven pairs: keep 2 per pair, seed one tile per missing pair, jokers fill.
    Pairs must be distinct — copies beyond the second of a type are dead. */
function shantenSevenPairs(counts: number[], jokers: number): number {
  let pairs = 0;
  let singles = 0;
  for (const c of counts) {
    if (c >= 2) pairs++;
    else if (c === 1) singles++;
  }
  const P = Math.min(pairs, 7);
  const keep = Math.min(2 * P + Math.min(singles, 7 - P) + jokers, 14);
  return 13 - keep;
}

/** Thirteen orphans — no jokers allowed (matches isThirteenOrphans). */
function shantenOrphans(counts: number[], jokers: number): number {
  if (jokers > 0) return 99;
  let kinds = 0;
  let hasPair = false;
  for (const t of ORPHAN_TILES) {
    const c = counts[TYPE_INDEX.get(t)!];
    if (c > 0) kinds++;
    if (c >= 2) hasPair = true;
  }
  return 13 - kinds - (hasPair ? 1 : 0);
}

/**
 * Shanten of a concealed hand of 3S+1 tiles (between turns) or 3S+2 tiles
 * (after drawing), where S = 4 - meldCount. Special hands are considered
 * only for fully concealed hands (meldCount 0), matching the validator.
 */
export function shanten(concealed: TileId[], meldCount: number): number {
  const S = 4 - meldCount;
  const { counts, jokers, totalReal } = toCounts(concealed);
  let best = 3 * S + 1 - (maxKeepStandard(counts, S, totalReal) + jokers);
  if (meldCount === 0) {
    best = Math.min(best, shantenSevenPairs(counts, jokers));
    best = Math.min(best, shantenOrphans(counts, jokers));
  }
  return Math.max(best, -1);
}

export interface Improvement {
  tile: TileId;
  /** Copies of this tile not yet visible anywhere (0 = dead). */
  live: number;
}

export interface UkeireResult {
  shanten: number;
  /** Tile types whose draw would reduce shanten, with live counts. */
  improvements: Improvement[];
  /** Total live copies across all improving tile types. */
  totalLive: number;
}

/**
 * Which draws advance a 3S+1 hand, and how many of each are still unseen.
 * At shanten 0 the improvements are exactly the winning waits.
 */
export function ukeire(
  concealed: TileId[],
  meldCount: number,
  liveOf: (t: TileId) => number
): UkeireResult {
  const base = shanten(concealed, meldCount);
  const held = new Map<TileId, number>();
  for (const t of concealed) held.set(t, (held.get(t) ?? 0) + 1);

  const improvements: Improvement[] = [];
  let totalLive = 0;
  for (const t of ALL_TILE_TYPES) {
    if ((held.get(t) ?? 0) >= 4) continue; // no fifth copy exists
    if (shanten([...concealed, t], meldCount) < base) {
      const live = Math.max(0, liveOf(t));
      improvements.push({ tile: t, live });
      totalLive += live;
    }
  }
  return { shanten: base, improvements, totalLive };
}

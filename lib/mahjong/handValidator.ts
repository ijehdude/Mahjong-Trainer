import type { TileId } from "@/types/tiles";
import { FEI } from "@/types/tiles";
import type { Meld } from "@/types/game";
import { countTiles, isFei, isSuit, rankOf, sortTiles, suitOf } from "./tiles";

/* ===========================================================================
   Winning-hand validation via recursive decomposition.

   A standard win = 4 sets + 1 pair. Each declared meld counts as one set, so
   the concealed tiles must form (4 - melds.length) sets plus exactly one pair.
   =========================================================================== */

export interface SetGroup {
  type: "sequence" | "triplet" | "pair";
  tiles: TileId[];
  concealed: boolean; // false for declared melds
}

export interface Decomposition {
  sets: SetGroup[]; // 4 set groups (sequences/triplets), excludes the pair
  pair: TileId;
}

/**
 * Try to decompose a counts map into exactly `setsNeeded` sets (no pair),
 * allowing up to `jokers` wildcards (Fei) to fill missing tiles. Wildcards are
 * resolved to the concrete tile they represent so the result scores correctly.
 */
function decomposeSets(
  counts: Map<TileId, number>,
  setsNeeded: number,
  jokers: number,
  acc: SetGroup[]
): SetGroup[] | null {
  if (setsNeeded === 0) {
    for (const v of counts.values()) if (v > 0) return null;
    return jokers === 0 ? acc : null;
  }

  const remaining = sortTiles(
    [...counts.entries()].filter(([, c]) => c > 0).map(([id]) => id)
  );

  // No real tiles left: remaining sets must be made entirely of jokers.
  if (remaining.length === 0) {
    if (jokers !== setsNeeded * 3) return null;
    const extra: SetGroup[] = [];
    for (let i = 0; i < setsNeeded; i++)
      extra.push({ type: "triplet", tiles: [FEI, FEI, FEI], concealed: true });
    return [...acc, ...extra];
  }

  const first = remaining[0];
  const have = counts.get(first) ?? 0;

  // Triplet: use k real copies + (3-k) jokers (k = 3,2,1).
  for (const k of [3, 2, 1]) {
    if (have >= k && jokers >= 3 - k) {
      const next = new Map(counts);
      next.set(first, have - k);
      const res = decomposeSets(next, setsNeeded - 1, jokers - (3 - k), [
        ...acc,
        { type: "triplet", tiles: [first, first, first], concealed: true },
      ]);
      if (res) return res;
    }
  }

  // Sequence (suited): fill any of the three positions with a joker.
  if (isSuit(first)) {
    const suit = suitOf(first)!;
    const rank = rankOf(first)!;
    if (rank <= 7) {
      const t2 = `${rank + 1}${suit}`;
      const t3 = `${rank + 2}${suit}`;
      const need2 = (counts.get(t2) ?? 0) >= 1 ? 0 : 1;
      const need3 = (counts.get(t3) ?? 0) >= 1 ? 0 : 1;
      if (jokers >= need2 + need3) {
        const next = new Map(counts);
        next.set(first, have - 1);
        if (!need2) next.set(t2, (next.get(t2) ?? 0) - 1);
        if (!need3) next.set(t3, (next.get(t3) ?? 0) - 1);
        const res = decomposeSets(
          next,
          setsNeeded - 1,
          jokers - need2 - need3,
          [...acc, { type: "sequence", tiles: [first, t2, t3], concealed: true }]
        );
        if (res) return res;
      }
    }
  }

  return null;
}

/**
 * Decompose concealed `tiles` into (setsNeeded sets + 1 pair). Fei tiles act as
 * wildcards. Returns the first valid decomposition or null.
 */
export function decomposeConcealed(
  tiles: TileId[],
  setsNeeded: number
): Decomposition | null {
  if (tiles.length !== setsNeeded * 3 + 2) return null;
  const jokers = tiles.filter(isFei).length;
  const counts = countTiles(tiles.filter((t) => !isFei(t)));

  // Pair from two real copies.
  for (const [id, c] of counts) {
    if (c >= 2) {
      const next = new Map(counts);
      next.set(id, c - 2);
      const sets = decomposeSets(next, setsNeeded, jokers, []);
      if (sets) return { sets, pair: id };
    }
  }
  // Pair from one real tile + a joker.
  if (jokers >= 1) {
    for (const [id, c] of counts) {
      if (c >= 1) {
        const next = new Map(counts);
        next.set(id, c - 1);
        const sets = decomposeSets(next, setsNeeded, jokers - 1, []);
        if (sets) return { sets, pair: id };
      }
    }
  }
  // Pair from two jokers.
  if (jokers >= 2) {
    const sets = decomposeSets(new Map(counts), setsNeeded, jokers - 2, []);
    if (sets) return { sets, pair: FEI };
  }
  return null;
}

/**
 * Full winning-hand decomposition combining concealed tiles and declared melds.
 * `concealed` includes the winning tile (i.e. the 14-tile / post-claim hand).
 */
export function decomposeWin(
  concealed: TileId[],
  melds: Meld[]
): Decomposition | null {
  const setsNeeded = 4 - melds.length;
  if (setsNeeded < 0) return null;
  const base = decomposeConcealed(concealed, setsNeeded);
  if (!base) return null;
  const meldSets: SetGroup[] = melds.map((m) => ({
    type: m.type === "chi" ? "sequence" : "triplet",
    tiles: m.tiles,
    concealed: false,
  }));
  return { sets: [...base.sets, ...meldSets], pair: base.pair };
}

/** The 13 terminal/honor tiles that make up Thirteen Orphans (十三幺). */
export const ORPHAN_TILES: TileId[] = [
  "1wan", "9wan", "1tong", "9tong", "1bam", "9bam",
  "east", "south", "west", "north", "zhong", "fa", "bai",
];

/**
 * Thirteen Orphans (十三幺): one of each of the 13 terminal/honor tiles plus a
 * duplicate of any one of them. Only valid as a fully concealed hand.
 */
export function isThirteenOrphans(concealed: TileId[], melds: Meld[]): boolean {
  if (melds.length > 0 || concealed.length !== 14) return false;
  const counts = countTiles(concealed);
  // Every tile must be an orphan tile.
  for (const id of counts.keys()) {
    if (!ORPHAN_TILES.includes(id)) return false;
  }
  // All 13 present, exactly one of them doubled.
  let pairs = 0;
  for (const orphan of ORPHAN_TILES) {
    const c = counts.get(orphan) ?? 0;
    if (c === 0) return false;
    if (c === 2) pairs++;
    else if (c !== 1) return false;
  }
  return pairs === 1;
}

/** Is `concealed` + `melds` a complete winning hand (standard or special)? */
export function isWinningHand(concealed: TileId[], melds: Meld[]): boolean {
  if (decomposeWin(concealed, melds) !== null) return true;
  return isThirteenOrphans(concealed, melds);
}

/**
 * Tenpai check: does adding exactly one tile complete the hand?
 * Returns the list of winning tiles (waits). `concealed` is the 13-tile
 * (or 13 - 3*melds) waiting hand.
 */
export function getWaits(concealed: TileId[], melds: Meld[]): TileId[] {
  const waits: TileId[] = [];
  // Candidate tiles: any suited 1-9 or honor present-ish. Test all 34 types.
  const candidates: TileId[] = [];
  for (const suit of ["wan", "tong", "bam"]) {
    for (let r = 1; r <= 9; r++) candidates.push(`${r}${suit}`);
  }
  candidates.push("east", "south", "west", "north", "zhong", "fa", "bai");
  for (const c of candidates) {
    if (isWinningHand([...concealed, c], melds)) waits.push(c);
  }
  return waits;
}

export function isTenpai(concealed: TileId[], melds: Meld[]): boolean {
  return getWaits(concealed, melds).length > 0;
}

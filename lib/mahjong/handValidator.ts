import type { TileId } from "@/types/tiles";
import type { Meld } from "@/types/game";
import { countTiles, isSuit, rankOf, sortTiles, suitOf } from "./tiles";

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

/** Try to decompose a counts map into exactly `setsNeeded` sets (no pair). */
function decomposeSets(
  counts: Map<TileId, number>,
  setsNeeded: number,
  acc: SetGroup[]
): SetGroup[] | null {
  if (setsNeeded === 0) {
    // success only if nothing left
    for (const v of counts.values()) if (v > 0) return null;
    return acc;
  }

  // Find the lowest remaining tile (deterministic ordering).
  const remaining = sortTiles(
    [...counts.entries()].filter(([, c]) => c > 0).map(([id]) => id)
  );
  if (remaining.length === 0) return null;
  const first = remaining[0];

  // Option A: triplet
  if ((counts.get(first) ?? 0) >= 3) {
    const next = new Map(counts);
    next.set(first, next.get(first)! - 3);
    const res = decomposeSets(next, setsNeeded - 1, [
      ...acc,
      { type: "triplet", tiles: [first, first, first], concealed: true },
    ]);
    if (res) return res;
  }

  // Option B: sequence (suited only)
  if (isSuit(first)) {
    const suit = suitOf(first)!;
    const rank = rankOf(first)!;
    if (rank <= 7) {
      const t2 = `${rank + 1}${suit}`;
      const t3 = `${rank + 2}${suit}`;
      if ((counts.get(t2) ?? 0) >= 1 && (counts.get(t3) ?? 0) >= 1) {
        const next = new Map(counts);
        next.set(first, next.get(first)! - 1);
        next.set(t2, next.get(t2)! - 1);
        next.set(t3, next.get(t3)! - 1);
        const res = decomposeSets(next, setsNeeded - 1, [
          ...acc,
          { type: "sequence", tiles: [first, t2, t3], concealed: true },
        ]);
        if (res) return res;
      }
    }
  }

  return null;
}

/**
 * Decompose concealed `tiles` into (setsNeeded sets + 1 pair).
 * Returns the first valid decomposition or null.
 */
export function decomposeConcealed(
  tiles: TileId[],
  setsNeeded: number
): Decomposition | null {
  if (tiles.length !== setsNeeded * 3 + 2) return null;
  const counts = countTiles(tiles);

  // Try each tile with count >= 2 as the pair.
  for (const [id, c] of counts) {
    if (c >= 2) {
      const next = new Map(counts);
      next.set(id, c - 2);
      const sets = decomposeSets(next, setsNeeded, []);
      if (sets) return { sets, pair: id };
    }
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

/** Is `concealed` + `melds` a complete winning hand? */
export function isWinningHand(concealed: TileId[], melds: Meld[]): boolean {
  return decomposeWin(concealed, melds) !== null;
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

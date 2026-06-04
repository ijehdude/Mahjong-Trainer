import type { TileId } from "@/types/tiles";
import { countTiles, isHonor, isSuit, rankOf, suitOf } from "./tiles";

/* ===========================================================================
   Simple bot AI. Bots are props, not strategists — they discard isolated
   tiles and occasionally Pong to produce a realistic table.
   =========================================================================== */

/** How "useful" a tile is to the hand. Lower = more discardable. */
function tileUsefulness(tile: TileId, counts: Map<TileId, number>): number {
  let score = 0;
  const own = counts.get(tile) ?? 0;
  if (own >= 3) score += 100; // already a triplet
  else if (own === 2) score += 40; // pair
  else score += 0;

  if (isSuit(tile)) {
    const suit = suitOf(tile)!;
    const rank = rankOf(tile)!;
    // Neighbours support sequences.
    for (const d of [-2, -1, 1, 2]) {
      const r = rank + d;
      if (r >= 1 && r <= 9) {
        const neigh = counts.get(`${r}${suit}`) ?? 0;
        if (neigh > 0) score += Math.abs(d) === 1 ? 12 : 5;
      }
    }
    // Middle tiles are slightly more flexible than terminals.
    score += rank >= 4 && rank <= 6 ? 3 : 0;
  } else if (isHonor(tile)) {
    // Lone honors are prime discards.
    if (own === 1) score -= 5;
  }
  return score;
}

/** Choose a tile to discard (least useful). */
export function chooseBotDiscard(hand: TileId[]): TileId {
  const counts = countTiles(hand);
  let worst: TileId = hand[0];
  let worstScore = Infinity;
  for (const tile of hand) {
    const s = tileUsefulness(tile, counts);
    if (s < worstScore) {
      worstScore = s;
      worst = tile;
    }
  }
  return worst;
}

/** Bot will Pong ~25% of the time when it holds a matching pair. */
export function botWantsPong(hand: TileId[], discard: TileId): boolean {
  const count = hand.filter((t) => t === discard).length;
  if (count >= 2) return Math.random() < 0.25;
  return false;
}

/** Bot will Kong if it holds three matching tiles (greedy, for bonus). */
export function botWantsKong(hand: TileId[], discard: TileId): boolean {
  const count = hand.filter((t) => t === discard).length;
  return count >= 3 && Math.random() < 0.4;
}

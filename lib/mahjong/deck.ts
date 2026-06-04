import { DRAGONS, FLOWERS, SEASONS, SUITS, WINDS } from "@/types/tiles";
import type { TileId } from "@/types/tiles";
import { isBonus } from "./tiles";

/* ===========================================================================
   Deck construction, shuffle and deal logic.
   136 base tiles (34 types x 4) + 8 bonus tiles when flowers enabled = 144.
   =========================================================================== */

/** Build a full deck. Bonus tiles (flowers/seasons) included only when enabled. */
export function buildDeck(includeFlowers: boolean): TileId[] {
  const deck: TileId[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let copy = 0; copy < 4; copy++) deck.push(`${rank}${suit}`);
    }
  }
  for (const wind of WINDS) for (let c = 0; c < 4; c++) deck.push(wind);
  for (const dragon of DRAGONS) for (let c = 0; c < 4; c++) deck.push(dragon);
  if (includeFlowers) {
    // Flowers and seasons are unique (one of each)
    for (const f of FLOWERS) deck.push(f);
    for (const s of SEASONS) deck.push(s);
  }
  return deck;
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface DealtHands {
  hands: TileId[][]; // concealed hands per player (13 each, dealer's extra handled by first draw)
  bonusPerPlayer: TileId[][]; // revealed flowers/seasons drawn during deal
  wall: TileId[]; // remaining draw pile
}

/**
 * Deal `playerCount` hands of 13 tiles each. Bonus tiles dealt into a hand are
 * immediately revealed and replaced from the back of the wall.
 */
export function deal(deck: TileId[], playerCount: number): DealtHands {
  const wall = [...deck];
  const hands: TileId[][] = Array.from({ length: playerCount }, () => []);
  const bonusPerPlayer: TileId[][] = Array.from(
    { length: playerCount },
    () => []
  );

  const drawReplacement = (playerIdx: number): TileId => {
    // Keep drawing until we get a non-bonus tile; bonuses are revealed.
    // Replacement tiles come from the back of the wall (dead wall).
    let tile = wall.pop()!;
    while (isBonus(tile)) {
      bonusPerPlayer[playerIdx].push(tile);
      tile = wall.pop()!;
    }
    return tile;
  };

  for (let p = 0; p < playerCount; p++) {
    while (hands[p].length < 13) {
      const tile = wall.shift()!;
      if (isBonus(tile)) {
        bonusPerPlayer[p].push(tile);
        hands[p].push(drawReplacement(p));
      } else {
        hands[p].push(tile);
      }
    }
  }

  return { hands, bonusPerPlayer, wall };
}

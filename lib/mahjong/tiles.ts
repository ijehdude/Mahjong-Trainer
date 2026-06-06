import {
  ANIMAL_LABEL,
  ANIMAL_NAME,
  ANIMALS,
  CN_NUMERALS,
  DRAGON_LABEL,
  DRAGONS,
  FLOWER_LABEL,
  FLOWERS,
  SEASON_LABEL,
  SEASONS,
  SUITS,
  WIND_LABEL,
  WIND_NAME,
  WINDS,
} from "@/types/tiles";
import type {
  Dragon,
  Suit,
  Tile,
  TileId,
  Wind,
} from "@/types/tiles";

/* ===========================================================================
   Tile construction, parsing and display helpers.
   =========================================================================== */

const SUIT_COLOR: Record<Suit, Tile["color"]> = {
  wan: "red",
  tong: "blue",
  bam: "green",
};

/** Build the canonical Tile object for a given TileId. */
export function makeTile(id: TileId): Tile {
  // Suited tile: e.g. "3wan"
  const suitMatch = id.match(/^([1-9])(wan|tong|bam)$/);
  if (suitMatch) {
    const rank = Number(suitMatch[1]);
    const suit = suitMatch[2] as Suit;
    return {
      id,
      category: "suit",
      suit,
      rank,
      label: suit === "wan" ? CN_NUMERALS[rank] : String(rank),
      color: SUIT_COLOR[suit],
    };
  }
  if ((WINDS as string[]).includes(id)) {
    return {
      id,
      category: "wind",
      honor: id as Wind,
      label: WIND_LABEL[id as Wind],
      color: "ink",
    };
  }
  if ((DRAGONS as string[]).includes(id)) {
    const d = id as Dragon;
    return {
      id,
      category: "dragon",
      honor: d,
      label: DRAGON_LABEL[d],
      color: d === "zhong" ? "red" : d === "fa" ? "green" : "ink",
    };
  }
  if ((FLOWERS as string[]).includes(id)) {
    return {
      id,
      category: "flower",
      bonus: Number(id[1]),
      label: FLOWER_LABEL[id as keyof typeof FLOWER_LABEL],
      color: "pink",
    };
  }
  if ((SEASONS as string[]).includes(id)) {
    return {
      id,
      category: "season",
      bonus: Number(id[1]),
      label: SEASON_LABEL[id as keyof typeof SEASON_LABEL],
      color: "orange",
    };
  }
  if ((ANIMALS as string[]).includes(id)) {
    return {
      id,
      category: "animal",
      label: ANIMAL_LABEL[id as keyof typeof ANIMAL_LABEL],
      color: "teal",
    };
  }
  if (id === "fei") {
    return { id, category: "fei", label: "飛", color: "red" };
  }
  // Fallback (should never happen)
  return { id, category: "suit", label: "?", color: "ink" };
}

export function isSuit(id: TileId): boolean {
  return /^[1-9](wan|tong|bam)$/.test(id);
}

export function isHonor(id: TileId): boolean {
  return (
    (WINDS as string[]).includes(id) || (DRAGONS as string[]).includes(id)
  );
}

export function isAnimal(id: TileId): boolean {
  return (ANIMALS as string[]).includes(id);
}

export function isFei(id: TileId): boolean {
  return id === "fei";
}

export function isFlowerOrSeason(id: TileId): boolean {
  return (FLOWERS as string[]).includes(id) || (SEASONS as string[]).includes(id);
}

export function isBonus(id: TileId): boolean {
  return isFlowerOrSeason(id) || isAnimal(id);
}

export function suitOf(id: TileId): Suit | null {
  const m = id.match(/^[1-9](wan|tong|bam)$/);
  return m ? (m[1] as Suit) : null;
}

export function rankOf(id: TileId): number | null {
  const m = id.match(/^([1-9])(wan|tong|bam)$/);
  return m ? Number(m[1]) : null;
}

/** Human-readable name, e.g. "3 Characters", "East Wind", "Red Dragon". */
export function tileName(id: TileId): string {
  const t = makeTile(id);
  if (t.category === "suit") {
    const suitName = { wan: "Characters", tong: "Circles", bam: "Bamboo" }[
      t.suit!
    ];
    return `${t.rank} ${suitName}`;
  }
  if (t.category === "wind") return `${WIND_NAME[t.honor as Wind]} Wind`;
  if (t.category === "dragon") {
    return {
      zhong: "Red Dragon",
      fa: "Green Dragon",
      bai: "White Dragon",
    }[t.honor as Dragon];
  }
  if (t.category === "flower") return `Flower ${t.bonus}`;
  if (t.category === "season") return `Season ${t.bonus}`;
  if (t.category === "fei") return "Fei (wildcard)";
  return ANIMAL_NAME[id as keyof typeof ANIMAL_NAME] ?? id;
}

/** Stable sort order for display: wan, tong, bam, winds, dragons, bonus. */
const CATEGORY_ORDER: Record<string, number> = {
  wan: 0,
  tong: 1,
  bam: 2,
  wind: 3,
  dragon: 4,
  flower: 5,
  season: 6,
  animal: 7,
  fei: 8,
};

function sortKey(id: TileId): number {
  const t = makeTile(id);
  if (t.category === "suit") {
    return CATEGORY_ORDER[t.suit!] * 100 + (t.rank ?? 0);
  }
  if (t.category === "wind") {
    return CATEGORY_ORDER.wind * 100 + WINDS.indexOf(t.honor as Wind);
  }
  if (t.category === "dragon") {
    return CATEGORY_ORDER.dragon * 100 + DRAGONS.indexOf(t.honor as Dragon);
  }
  return CATEGORY_ORDER[t.category] * 100 + (t.bonus ?? 0);
}

export function sortTiles(ids: TileId[]): TileId[] {
  return [...ids].sort((a, b) => sortKey(a) - sortKey(b));
}

/** Count occurrences of each tile id. */
export function countTiles(ids: TileId[]): Map<TileId, number> {
  const m = new Map<TileId, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

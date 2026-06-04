/* ===========================================================================
   Tile type definitions for Singapore Mahjong.

   A TileId is a stable string key used everywhere (hand, discards, melds,
   API payloads). Examples: "3wan", "5tong", "1bam", "east", "zhong", "f1".
   Suit tiles take the form `${rank}${suit}` with rank 1–9.
   =========================================================================== */

export type Suit = "wan" | "tong" | "bam"; // 万 Characters / 筒 Circles / 条 Bamboo
export type Wind = "east" | "south" | "west" | "north"; // 东南西北
export type Dragon = "zhong" | "fa" | "bai"; // 中 发 白
export type FlowerId = "f1" | "f2" | "f3" | "f4"; // 梅兰竹菊
export type SeasonId = "s1" | "s2" | "s3" | "s4"; // 春夏秋冬

export type TileCategory =
  | "suit"
  | "wind"
  | "dragon"
  | "flower"
  | "season";

export type TileId = string;

export interface Tile {
  id: TileId;
  category: TileCategory;
  /** Suit for suited tiles. */
  suit?: Suit;
  /** Rank 1–9 for suited tiles. */
  rank?: number;
  /** Wind / dragon honor value. */
  honor?: Wind | Dragon;
  /** Bonus index 1–4 for flowers / seasons. */
  bonus?: number;
  /** Glyph shown on the tile face (Chinese character or pip count handled in UI). */
  label: string;
  /** Color treatment for the face. */
  color: "red" | "green" | "blue" | "ink" | "pink" | "orange";
}

export const SUITS: Suit[] = ["wan", "tong", "bam"];
export const WINDS: Wind[] = ["east", "south", "west", "north"];
export const DRAGONS: Dragon[] = ["zhong", "fa", "bai"];
export const FLOWERS: FlowerId[] = ["f1", "f2", "f3", "f4"];
export const SEASONS: SeasonId[] = ["s1", "s2", "s3", "s4"];

export const WIND_LABEL: Record<Wind, string> = {
  east: "东",
  south: "南",
  west: "西",
  north: "北",
};

export const WIND_NAME: Record<Wind, string> = {
  east: "East",
  south: "South",
  west: "West",
  north: "North",
};

export const DRAGON_LABEL: Record<Dragon, string> = {
  zhong: "中",
  fa: "发",
  bai: "白",
};

export const SUIT_NAME: Record<Suit, string> = {
  wan: "Characters",
  tong: "Circles",
  bam: "Bamboo",
};

/** Chinese numerals used on Characters (万) tiles. */
export const CN_NUMERALS = [
  "",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
];

export const FLOWER_LABEL: Record<FlowerId, string> = {
  f1: "梅",
  f2: "兰",
  f3: "竹",
  f4: "菊",
};

export const SEASON_LABEL: Record<SeasonId, string> = {
  s1: "春",
  s2: "夏",
  s3: "秋",
  s4: "冬",
};

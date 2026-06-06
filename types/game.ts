import type { TileId, Wind } from "./tiles";

/* ===========================================================================
   Game-level types: settings, players, game state.
   =========================================================================== */

export type PlayerCount = 2 | 3 | 4;
export type FeiPayout = "none" | "1tai" | "2tai";
export type MinTai = 1 | 2 | 3 | 4;
export type FeedbackDetail = "brief" | "detailed";
export type CoachEngine = "local" | "ai";

export interface GameRules {
  players: PlayerCount;
  flowerTiles: boolean;
  animalTiles: boolean; // 猫鼠鸡蜈蚣 — four animal bonus tiles
  feiTiles: boolean; // 飛 — four wildcard tiles kept in hand
  feiPayout: FeiPayout;
  minTai: MinTai;
  payoutRate: number; // dollars per tai
  startingStack: number;
  kongBonus: boolean; // immediate payment collected when a kong is declared
  heavenlyHand: boolean;
  earthlyHand: boolean;
  robbingKong: boolean; // 抢杠胡 — win on a tile used to form an added kong
  chouPingHu: boolean; // 臭平胡 — allow a tai-less hand to win (counts as 1 tai)
  limitHandCap: boolean; // cap payout at LIMIT_TAI (5)
  feedbackDetail: FeedbackDetail;
  coachEngine: CoachEngine; // "local" = offline heuristic, "ai" = Claude API
}

/** Tai at which a capped (limit) hand pays out. */
export const LIMIT_TAI = 5;

export const DEFAULT_RULES: GameRules = {
  players: 4,
  flowerTiles: true,
  animalTiles: true,
  feiTiles: false,
  feiPayout: "1tai",
  minTai: 1,
  payoutRate: 0.2,
  startingStack: 100,
  kongBonus: true,
  heavenlyHand: false,
  earthlyHand: false,
  robbingKong: true,
  chouPingHu: false,
  limitHandCap: true,
  feedbackDetail: "brief",
  coachEngine: "local",
};

/** A declared meld (chi/pong/kong) shown face-up. */
export interface Meld {
  type: "chi" | "pong" | "kong";
  tiles: TileId[];
  /** Whether this was a concealed kong (an gang). */
  concealed?: boolean;
}

/** Relative seat position from the human player's point of view. */
export type RelativeSeat = "self" | "right" | "across" | "left";

export interface Player {
  index: number; // 0 = human (South), then clockwise
  name: string; // "YOU", "BOT 1", ...
  seatWind: Wind;
  isHuman: boolean;
  isDealer: boolean;
  hand: TileId[]; // concealed tiles
  melds: Meld[];
  discards: TileId[];
  flowers: TileId[]; // revealed bonus tiles
  stack: number;
}

export type GamePhase =
  | "await-draw" // current player must draw from the wall
  | "await-discard" // current player must discard (no draw, e.g. after a claim)
  | "player-choose" // human's turn: pick a tile to discard / declare win
  | "player-claim" // human may claim the last discard (pong/kong/chi/win)
  | "await-claims" // engine resolves claims on the last discard
  | "hand-over";

export interface ChiOption {
  /** The two tiles from hand that complete the sequence with the discard. */
  tiles: TileId[];
}

export interface ClaimOptions {
  discardTile: TileId;
  discarderIndex: number;
  canWin: boolean;
  canPong: boolean;
  canKong: boolean;
  chiOptions: ChiOption[];
  robKong?: boolean; // this "win" claim is a chance to rob an added kong
}

export interface WinResult {
  winnerIndex: number;
  winningTile: TileId | null; // null if special
  selfDraw: boolean;
  robKong: boolean; // won by robbing an added kong (抢杠)
  tai: number;
  taiBreakdown: { label: string; tai: number }[];
  limit: boolean; // a recognised limit hand was scored
  /** dollars: positive = human gains, negative = human pays */
  payments: number[]; // per player delta in dollars
  handTiles: TileId[]; // winner's full hand for display
  handMelds: Meld[];
  handFlowers: TileId[]; // winner's revealed flowers / seasons
}

/** A kong the human may declare on their turn. */
export interface KongOption {
  type: "concealed" | "added"; // 暗杠 (4 in hand) | 加杠 (upgrade a melded pong)
  tile: TileId;
}

export interface DrawResult {
  exhausted: true;
}

export interface GameState {
  rules: GameRules;
  players: Player[];
  /** Index of the human player (seat is randomised at the start of each game). */
  humanIndex: number;
  wall: TileId[];
  deadWallFlowers: TileId[]; // replacement draws
  roundWind: Wind;
  turnIndex: number; // whose turn
  phase: GamePhase;
  /** All discards in play order, shown as one central pile. */
  discardPile: { playerIndex: number; tile: TileId }[];
  lastDiscard: { playerIndex: number; tile: TileId } | null;
  /** Pending claim options offered to the human (phase === "player-claim"). */
  claim: ClaimOptions | null;
  /** An added kong awaiting a possible robbery before it completes. */
  pendingKong: { konger: number; tile: TileId } | null;
  /** Whether the human's current draw lets them self-draw win. */
  canSelfDrawWin: boolean;
  /** Kongs the human may declare on their turn (concealed or added). */
  kongOptions: KongOption[];
  /** The tile the human just drew (rendered apart on the right of the hand). */
  drawnTile: TileId | null;
  handNumber: number;
  result: WinResult | null;
  exhausted: boolean;
  // session stats
  correctDiscards: number;
  totalDiscards: number;
  pnl: number; // cumulative human profit/loss
  log: string[];
}

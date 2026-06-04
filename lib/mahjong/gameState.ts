import type {
  ChiOption,
  GameRules,
  GameState,
  Meld,
  Player,
  RelativeSeat,
  WinResult,
} from "@/types/game";
import type { TileId, Wind } from "@/types/tiles";
import { buildDeck, deal, shuffle } from "./deck";
import { isWinningHand } from "./handValidator";
import { calculateTai, computePayments } from "./taiCalculator";
import { decomposeWin } from "./handValidator";
import { botWantsKong, botWantsPong, chooseBotDiscard } from "./botAI";
import { isBonus, isSuit, rankOf, suitOf } from "./tiles";

/* ===========================================================================
   Core game engine. Pure transition functions driven by the React component.

   Seating (turn order is clockwise by index): seat 0 = East (always the
   dealer), seat 1 = South, seat 2 = West, seat 3 = North. Play proceeds
   0 -> 1 -> 2 -> 3 -> 0. The human's seat is randomised each game (see
   createGame -> humanIndex), so they may be any wind — including the dealer.
   =========================================================================== */

const SEAT_WINDS: Wind[] = ["east", "south", "west", "north"];

export function createGame(rules: GameRules): GameState {
  const n = rules.players;
  const deck = shuffle(buildDeck(rules.flowerTiles));
  const dealt = deal(deck, n);

  // Randomise which seat the human takes. Dealer is always seat 0 (East), so
  // the human may even be the dealer.
  const humanIndex = Math.floor(Math.random() * n);

  let botCounter = 0;
  const players: Player[] = [];
  for (let i = 0; i < n; i++) {
    const isHuman = i === humanIndex;
    const seatWind = SEAT_WINDS[i];
    players.push({
      index: i,
      name: isHuman ? "YOU" : `BOT ${++botCounter}`,
      seatWind,
      isHuman,
      isDealer: i === 0,
      hand: dealt.hands[i],
      melds: [],
      discards: [],
      flowers: dealt.bonusPerPlayer[i],
      stack: rules.startingStack,
    });
  }

  return {
    rules,
    players,
    humanIndex,
    wall: dealt.wall,
    deadWallFlowers: [],
    roundWind: "east",
    turnIndex: 0, // dealer (East) starts
    phase: "await-draw",
    lastDiscard: null,
    claim: null,
    canSelfDrawWin: false,
    drawnTile: null,
    handNumber: 1,
    result: null,
    exhausted: false,
    correctDiscards: 0,
    totalDiscards: 0,
    pnl: 0,
    log: [
      `Hand 1 — East round. You are ${SEAT_WINDS[humanIndex]}. Dealer is ${players[0].name} (East).`,
    ],
  };
}

/* ---- Relative seat helpers ----------------------------------------------- */

export function relativeSeat(
  state: GameState,
  index: number
): RelativeSeat {
  const n = state.players.length;
  const diff = (index - state.humanIndex + n) % n;
  if (diff === 0) return "self";
  if (diff === 1) return "right"; // downstream (plays after you)
  if (diff === n - 1) return "left"; // upstream (plays before you)
  return "across";
}

export function indexForSeat(
  state: GameState,
  seat: RelativeSeat
): number | null {
  const n = state.players.length;
  for (let i = 0; i < n; i++) if (relativeSeat(state, i) === seat) return i;
  return null;
}

export function humanIndex(state: GameState): number {
  return state.humanIndex;
}

/* ---- Drawing -------------------------------------------------------------- */

/** Draw the next live tile for a player, revealing & replacing any bonuses. */
function drawLiveTile(
  wall: TileId[],
  player: Player
): { tile: TileId | null; wall: TileId[]; flowersAdded: TileId[] } {
  const w = [...wall];
  const flowersAdded: TileId[] = [];
  while (w.length > 0) {
    const tile = w.shift()!;
    if (isBonus(tile)) {
      flowersAdded.push(tile);
      continue;
    }
    return { tile, wall: w, flowersAdded };
  }
  return { tile: null, wall: w, flowersAdded };
}

/* ---- Claim detection ------------------------------------------------------ */

export function canPong(hand: TileId[], tile: TileId): boolean {
  return hand.filter((t) => t === tile).length >= 2;
}

export function canKong(hand: TileId[], tile: TileId): boolean {
  return hand.filter((t) => t === tile).length >= 3;
}

export function chiOptions(hand: TileId[], tile: TileId): ChiOption[] {
  if (!isSuit(tile)) return [];
  const suit = suitOf(tile)!;
  const rank = rankOf(tile)!;
  const has = (r: number) => hand.includes(`${r}${suit}`);
  const opts: ChiOption[] = [];
  // tile is low end: tile, +1, +2
  if (rank <= 7 && has(rank + 1) && has(rank + 2))
    opts.push({ tiles: [`${rank + 1}${suit}`, `${rank + 2}${suit}`] });
  // tile is middle: -1, tile, +1
  if (rank >= 2 && rank <= 8 && has(rank - 1) && has(rank + 1))
    opts.push({ tiles: [`${rank - 1}${suit}`, `${rank + 1}${suit}`] });
  // tile is high end: -2, -1, tile
  if (rank >= 3 && has(rank - 1) && has(rank - 2))
    opts.push({ tiles: [`${rank - 2}${suit}`, `${rank - 1}${suit}`] });
  return opts;
}

/** Can this player declare a win on `tile` (ron)? */
export function canWinOn(player: Player, tile: TileId): boolean {
  return isWinningHand([...player.hand, tile], player.melds);
}

/* ---- Engine advance ------------------------------------------------------- */

/**
 * Perform the next automatic step. Called by the component on a timer whenever
 * phase is "await-draw", "await-discard", or "await-claims". For human-input
 * phases ("player-choose", "player-claim") the engine waits.
 */
export function advance(state: GameState): GameState {
  switch (state.phase) {
    case "await-draw":
      return doDraw(state);
    case "await-discard":
      return doBotDiscard(state);
    case "await-claims":
      return resolveClaims(state, false, false);
    default:
      return state;
  }
}

function doDraw(state: GameState): GameState {
  const player = state.players[state.turnIndex];

  // Wall exhausted -> draw (no winner).
  if (state.wall.length === 0) {
    return endExhausted(state);
  }

  const { tile, wall, flowersAdded } = drawLiveTile(state.wall, player);
  if (tile === null) return endExhausted(state);

  const players = state.players.map((p) => ({ ...p }));
  const me = players[state.turnIndex];
  me.hand = [...me.hand, tile];
  if (flowersAdded.length) me.flowers = [...me.flowers, ...flowersAdded];

  const next: GameState = {
    ...state,
    players,
    wall,
    log:
      flowersAdded.length > 0
        ? [...state.log, `${me.name} reveals ${flowersAdded.length} bonus tile(s).`]
        : state.log,
  };

  if (player.isHuman) {
    // Human draws then chooses; flag self-draw win availability.
    return {
      ...next,
      phase: "player-choose",
      canSelfDrawWin: meetsMinTai(next, state.turnIndex, null),
      drawnTile: tile,
      lastDiscard: null,
    };
  }

  // Bot: check self-draw win, else discard.
  if (meetsMinTai(next, state.turnIndex, null)) {
    return computeWin(next, state.turnIndex, null);
  }
  return doBotDiscardFor(next, state.turnIndex);
}

function doBotDiscard(state: GameState): GameState {
  return doBotDiscardFor(state, state.turnIndex);
}

function doBotDiscardFor(state: GameState, index: number): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const me = players[index];
  const tile = chooseBotDiscard(me.hand);
  const idx = me.hand.indexOf(tile);
  me.hand = [...me.hand.slice(0, idx), ...me.hand.slice(idx + 1)];
  me.discards = [...me.discards, tile];
  return {
    ...state,
    players,
    lastDiscard: { playerIndex: index, tile },
    phase: "await-claims",
    canSelfDrawWin: false,
    log: [...state.log, `${me.name} discards.`],
  };
}

/** Apply the human's discard (called from the component). */
export function humanDiscard(state: GameState, tile: TileId): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const me = players[state.humanIndex];
  const idx = me.hand.indexOf(tile);
  if (idx === -1) return state;
  me.hand = [...me.hand.slice(0, idx), ...me.hand.slice(idx + 1)];
  me.discards = [...me.discards, tile];
  return {
    ...state,
    players,
    lastDiscard: { playerIndex: state.humanIndex, tile },
    phase: "await-claims",
    canSelfDrawWin: false,
    drawnTile: null,
  };
}

/* ---- Claim resolution ----------------------------------------------------- */

function nextTurn(state: GameState): GameState {
  const n = state.players.length;
  return {
    ...state,
    turnIndex: (state.turnIndex + 1) % n,
    phase: "await-draw",
    lastDiscard: null,
    claim: null,
  };
}

/**
 * Resolve claims on the last discard.
 * Priority: WIN (ron) > PONG/KONG > CHI > advance.
 * When the human has an option we pause in "player-claim".
 */
function resolveClaims(
  state: GameState,
  skipHumanWin: boolean,
  skipHumanClaim: boolean
): GameState {
  const ld = state.lastDiscard;
  if (!ld) return nextTurn(state);
  const n = state.players.length;
  const discarder = ld.playerIndex;
  const tile = ld.tile;
  const human = state.players[state.humanIndex];

  // ---- Priority 1: Ron --------------------------------------------------
  // Human ron — offer it.
  if (
    !skipHumanWin &&
    discarder !== state.humanIndex &&
    human &&
    meetsMinTai(state, state.humanIndex, discarder)
  ) {
    return offerHumanClaim(state, tile, discarder, true);
  }
  // Bot ron (first around the table from discarder).
  for (let step = 1; step < n; step++) {
    const i = (discarder + step) % n;
    if (i === state.humanIndex) continue;
    if (meetsMinTai(state, i, discarder)) {
      return computeWin(state, i, discarder);
    }
  }

  // ---- Priority 2: Pong / Kong -----------------------------------------
  const humanCanPong =
    discarder !== state.humanIndex && canPong(human.hand, tile);
  const humanCanKong =
    discarder !== state.humanIndex && canKong(human.hand, tile);
  if (!skipHumanClaim && (humanCanPong || humanCanKong)) {
    return offerHumanClaim(state, tile, discarder, false);
  }
  // Bots pong/kong.
  for (let step = 1; step < n; step++) {
    const i = (discarder + step) % n;
    if (i === state.humanIndex) continue;
    const bot = state.players[i];
    if (botWantsKong(bot.hand, tile)) {
      return applyMeld(state, i, "kong", tile, discarder);
    }
    if (botWantsPong(bot.hand, tile)) {
      return applyMeld(state, i, "pong", tile, discarder);
    }
  }

  // ---- Priority 3: Chi (only by downstream player) ----------------------
  const downstream = (discarder + 1) % n;
  if (
    !skipHumanClaim &&
    downstream === state.humanIndex &&
    chiOptions(human.hand, tile).length > 0
  ) {
    return offerHumanClaim(state, tile, discarder, false);
  }
  // Bots never chi (simplified).

  // ---- Nobody claims: advance ------------------------------------------
  return nextTurn(state);
}

function offerHumanClaim(
  state: GameState,
  tile: TileId,
  discarder: number,
  ronAvailable: boolean
): GameState {
  const human = state.players[state.humanIndex];
  const downstream = (discarder + 1) % state.players.length;
  return {
    ...state,
    phase: "player-claim",
    claim: {
      discardTile: tile,
      discarderIndex: discarder,
      canWin: ronAvailable,
      canPong: discarder !== state.humanIndex && canPong(human.hand, tile),
      canKong: discarder !== state.humanIndex && canKong(human.hand, tile),
      chiOptions:
        downstream === state.humanIndex ? chiOptions(human.hand, tile) : [],
    },
  };
}

/** Human declines all claims on the current discard. */
export function humanPass(state: GameState): GameState {
  return resolveClaims({ ...state, claim: null }, true, true);
}

/** Human claims pong/kong/chi on the last discard, then must discard. */
export function humanClaim(
  state: GameState,
  type: Meld["type"],
  chiTiles?: TileId[]
): GameState {
  const ld = state.lastDiscard;
  if (!ld) return state;
  return applyMeld(state, state.humanIndex, type, ld.tile, ld.playerIndex, chiTiles);
}

/** Form a meld from the claimed discard. The claimer then discards. */
function applyMeld(
  state: GameState,
  claimerIndex: number,
  type: Meld["type"],
  tile: TileId,
  discarderIndex: number,
  chiTiles?: TileId[]
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const claimer = players[claimerIndex];
  let hand = [...claimer.hand];

  let meldTiles: TileId[];
  if (type === "chi") {
    const ts = chiTiles ?? chiOptions(hand, tile)[0]?.tiles ?? [];
    for (const t of ts) hand.splice(hand.indexOf(t), 1);
    meldTiles = [...ts, tile].sort();
  } else if (type === "pong") {
    for (let k = 0; k < 2; k++) hand.splice(hand.indexOf(tile), 1);
    meldTiles = [tile, tile, tile];
  } else {
    // kong
    for (let k = 0; k < 3; k++) hand.splice(hand.indexOf(tile), 1);
    meldTiles = [tile, tile, tile, tile];
  }

  claimer.hand = hand;
  claimer.melds = [...claimer.melds, { type, tiles: meldTiles }];

  // Remove the claimed tile from the discarder's discard pile.
  const disc = players[discarderIndex];
  const di = disc.discards.lastIndexOf(tile);
  if (di !== -1)
    disc.discards = [
      ...disc.discards.slice(0, di),
      ...disc.discards.slice(di + 1),
    ];

  const base: GameState = {
    ...state,
    players,
    turnIndex: claimerIndex,
    lastDiscard: null,
    claim: null,
    log: [
      ...state.log,
      `${claimer.name} declares ${type.toUpperCase()}.`,
    ],
  };

  // A Kong draws a replacement tile before discarding.
  if (type === "kong") {
    if (base.wall.length === 0) return endExhausted(base);
    const { tile: repl, wall, flowersAdded } = drawLiveTile(
      base.wall,
      claimer
    );
    const p2 = base.players.map((p) => ({ ...p }));
    const c2 = p2[claimerIndex];
    if (repl) c2.hand = [...c2.hand, repl];
    if (flowersAdded.length) c2.flowers = [...c2.flowers, ...flowersAdded];
    const afterKong: GameState = { ...base, players: p2, wall };
    // Kong can lead to a self-draw win on the replacement.
    if (repl && !c2.isHuman && meetsMinTai(afterKong, claimerIndex, null)) {
      return computeWin(afterKong, claimerIndex, null);
    }
    if (c2.isHuman) {
      return {
        ...afterKong,
        phase: "player-choose",
        canSelfDrawWin: meetsMinTai(afterKong, claimerIndex, null),
        drawnTile: repl ?? null,
      };
    }
    return doBotDiscardFor(afterKong, claimerIndex);
  }

  if (claimer.isHuman) {
    return {
      ...base,
      phase: "player-choose",
      canSelfDrawWin: false,
      drawnTile: null,
    };
  }
  return doBotDiscardFor(base, claimerIndex);
}

/* ---- Win + scoring -------------------------------------------------------- */

/** Tai a prospective win would score (0 if not a valid hand). */
function prospectiveWinTai(
  state: GameState,
  winnerIndex: number,
  discarderIndex: number | null
): number {
  const winner = state.players[winnerIndex];
  const selfDraw = discarderIndex === null;
  const concealed = selfDraw
    ? winner.hand
    : [...winner.hand, state.lastDiscard?.tile ?? ""];
  const decomposition = decomposeWin(concealed, winner.melds);
  if (!decomposition) return 0;
  return calculateTai({
    decomposition,
    melds: winner.melds,
    seatWind: winner.seatWind,
    roundWind: state.roundWind,
    selfDraw,
    flowerCount: winner.flowers.length,
    rules: state.rules,
  }).tai;
}

/** Is this a complete hand that also meets the minimum-tai requirement? */
export function meetsMinTai(
  state: GameState,
  winnerIndex: number,
  discarderIndex: number | null
): boolean {
  const winner = state.players[winnerIndex];
  const selfDraw = discarderIndex === null;
  const concealed = selfDraw
    ? winner.hand
    : [...winner.hand, state.lastDiscard?.tile ?? ""];
  if (!isWinningHand(concealed, winner.melds)) return false;
  return prospectiveWinTai(state, winnerIndex, discarderIndex) >= state.rules.minTai;
}

/** Human declares a win (self-draw on their turn, or ron on a discard). */
export function humanDeclareWin(state: GameState): GameState {
  if (state.phase === "player-choose" && state.canSelfDrawWin) {
    return computeWin(state, state.humanIndex, null);
  }
  if (state.phase === "player-claim" && state.claim?.canWin) {
    return computeWin(state, state.humanIndex, state.claim.discarderIndex);
  }
  return state;
}

function computeWin(
  state: GameState,
  winnerIndex: number,
  discarderIndex: number | null
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const winner = players[winnerIndex];
  const selfDraw = discarderIndex === null;

  // Build the full 14-tile concealed set for scoring.
  let concealed = [...winner.hand];
  let winningTile: TileId | null = null;
  if (selfDraw) {
    // The just-drawn tile is already in hand.
    winningTile = concealed[concealed.length - 1] ?? null;
  } else {
    winningTile = state.lastDiscard?.tile ?? null;
    if (winningTile) {
      concealed = [...concealed, winningTile];
      // Remove the tile from the discarder's pile (it's now in the win).
      const disc = players[discarderIndex!];
      const di = disc.discards.lastIndexOf(winningTile);
      if (di !== -1)
        disc.discards = [
          ...disc.discards.slice(0, di),
          ...disc.discards.slice(di + 1),
        ];
    }
  }

  const decomposition = decomposeWin(concealed, winner.melds);
  const flowerCount = winner.flowers.length;

  let tai = 0;
  let breakdown: WinResult["taiBreakdown"] = [];
  let chicken = false;
  if (decomposition) {
    const result = calculateTai({
      decomposition,
      melds: winner.melds,
      seatWind: winner.seatWind,
      roundWind: state.roundWind,
      selfDraw,
      flowerCount,
      rules: state.rules,
    });
    tai = result.tai;
    breakdown = result.breakdown;
    chicken = result.chicken;
  }

  const payments = computePayments({
    playerCount: players.length,
    winnerIndex,
    dealerIndex: 0,
    discarderIndex,
    tai,
    rate: state.rules.payoutRate,
  });

  // Apply payments to stacks.
  for (let i = 0; i < players.length; i++) players[i].stack += payments[i];

  const result: WinResult = {
    winnerIndex,
    winningTile,
    selfDraw,
    tai,
    taiBreakdown: breakdown,
    chicken,
    payments,
    handTiles: concealed,
    handMelds: winner.melds,
  };

  const humanDelta = payments[state.humanIndex] ?? 0;
  return {
    ...state,
    players,
    phase: "hand-over",
    result,
    claim: null,
    lastDiscard: null,
    pnl: Math.round((state.pnl + humanDelta) * 100) / 100,
    log: [
      ...state.log,
      `${winner.name} wins ${tai} tai${selfDraw ? " (self-draw)" : ""}.`,
    ],
  };
}

function endExhausted(state: GameState): GameState {
  return {
    ...state,
    phase: "hand-over",
    exhausted: true,
    result: null,
    claim: null,
    lastDiscard: null,
    log: [...state.log, "Wall exhausted — washout (no winner)."],
  };
}

/* ---- Discard accuracy tracking ------------------------------------------- */

export function recordDiscardAccuracy(
  state: GameState,
  wasCorrect: boolean
): GameState {
  return {
    ...state,
    correctDiscards: state.correctDiscards + (wasCorrect ? 1 : 0),
    totalDiscards: state.totalDiscards + 1,
  };
}

/* ---- Next hand ------------------------------------------------------------ */

export function startNextHand(state: GameState): GameState {
  const n = state.rules.players;
  const deck = shuffle(buildDeck(state.rules.flowerTiles));
  const dealt = deal(deck, n);
  const players = state.players.map((p, i) => ({
    ...p,
    hand: dealt.hands[i],
    melds: [],
    discards: [],
    flowers: dealt.bonusPerPlayer[i],
  }));
  return {
    ...state,
    players,
    wall: dealt.wall,
    turnIndex: 0,
    phase: "await-draw",
    lastDiscard: null,
    claim: null,
    canSelfDrawWin: false,
    drawnTile: null,
    handNumber: state.handNumber + 1,
    result: null,
    exhausted: false,
    log: [...state.log, `— Hand ${state.handNumber + 1} —`],
  };
}

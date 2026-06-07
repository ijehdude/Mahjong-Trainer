import type {
  ChiOption,
  GameRules,
  GameState,
  KongOption,
  Meld,
  Player,
  RelativeSeat,
  WinResult,
} from "@/types/game";
import type { TileId, Wind } from "@/types/tiles";
import { buildDeck, deal, shuffle } from "./deck";
import { isSevenPairs, isThirteenOrphans, isWinningHand } from "./handValidator";
import { calculateTai, computePayments } from "./taiCalculator";
import { decomposeWin } from "./handValidator";
import { botWantsKong, botWantsPong, chooseBotDiscard } from "./botAI";
import {
  countTiles,
  isBonus,
  isFlowerOrSeason,
  isSuit,
  rankOf,
  suitOf,
} from "./tiles";

/* ===========================================================================
   Core game engine. Pure transition functions driven by the React component.

   Seating (turn order is clockwise by index): seat 0 = East (always the
   dealer), seat 1 = South, seat 2 = West, seat 3 = North. Play proceeds
   0 -> 1 -> 2 -> 3 -> 0. The human's seat is randomised each game (see
   createGame -> humanIndex), so they may be any wind — including the dealer.
   =========================================================================== */

const SEAT_WINDS: Wind[] = ["east", "south", "west", "north"];

export function createGame(rules: GameRules, seatIndex?: number): GameState {
  const n = rules.players;
  const deck = shuffle(buildDeck(rules.flowerTiles, rules.animalTiles, rules.feiTiles));
  const dealt = deal(deck, n);

  // The human's seat is normally decided by the dice-roll ceremony (seatIndex);
  // fall back to a random seat if none is supplied. Dealer is always seat 0.
  const humanIndex =
    seatIndex !== undefined && seatIndex >= 0 && seatIndex < n
      ? seatIndex
      : Math.floor(Math.random() * n);

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

  let state: GameState = {
    rules,
    players,
    humanIndex,
    wall: dealt.wall,
    deadWallFlowers: [],
    roundWind: "east",
    turnIndex: 0, // dealer (East) starts
    phase: "await-draw",
    discardPile: [],
    lastDiscard: null,
    claim: null,
    pendingKong: null,
    canSelfDrawWin: false,
    kongOptions: [],
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
  // Animal pairs dealt in the opening flowers pay out immediately.
  for (let i = 0; i < players.length; i++)
    state = applyBonusPayments(state, i, state.players[i].flowers);
  return state;
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

  let next: GameState = {
    ...state,
    players,
    wall,
    log:
      flowersAdded.length > 0
        ? [...state.log, `${me.name} reveals ${flowersAdded.length} bonus tile(s).`]
        : state.log,
  };
  if (flowersAdded.length)
    next = applyBonusPayments(next, state.turnIndex, flowersAdded);

  if (player.isHuman) {
    // Human draws then chooses; flag self-draw win + kong availability.
    return {
      ...next,
      phase: "player-choose",
      canSelfDrawWin: meetsMinTai(next, state.turnIndex, null),
      kongOptions: detectKongOptions(me),
      drawnTile: tile,
      lastDiscard: null,
    };
  }

  // Bot: win / kong / discard.
  return botPostDraw(next, state.turnIndex);
}

/** Bot decision after acquiring a tile: self-draw win, maybe kong, else discard. */
function botPostDraw(state: GameState, index: number): GameState {
  if (meetsMinTai(state, index, null)) {
    return computeWin(state, index, null);
  }
  const me = state.players[index];
  const opts = detectKongOptions(me);
  const added = opts.find((o) => o.type === "added");
  const concealed = opts.find((o) => o.type === "concealed");
  if (added && Math.random() < 0.5) return botAttemptAddedKong(state, index, added.tile);
  if (concealed && Math.random() < 0.5)
    return completeConcealedKong(state, index, concealed.tile);
  return doBotDiscardFor(state, index);
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
    discardPile: [...state.discardPile, { playerIndex: index, tile }],
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
    discardPile: [
      ...state.discardPile,
      { playerIndex: state.humanIndex, tile },
    ],
    lastDiscard: { playerIndex: state.humanIndex, tile },
    phase: "await-claims",
    canSelfDrawWin: false,
    kongOptions: [],
    drawnTile: null,
  };
}

/* ---- Kong machinery ------------------------------------------------------- */

/** Kongs the player may declare on their turn (concealed quad or added kong). */
function detectKongOptions(player: Player): KongOption[] {
  const opts: KongOption[] = [];
  for (const [t, c] of countTiles(player.hand)) {
    if (c >= 4) opts.push({ type: "concealed", tile: t });
  }
  for (const m of player.melds) {
    if (m.type === "pong" && player.hand.includes(m.tiles[0]))
      opts.push({ type: "added", tile: m.tiles[0] });
  }
  return opts;
}

/** Remove the most recent matching discard from the central pile. */
function removeFromPile(
  pile: GameState["discardPile"],
  playerIndex: number,
  tile: TileId
): GameState["discardPile"] {
  for (let i = pile.length - 1; i >= 0; i--) {
    if (pile[i].playerIndex === playerIndex && pile[i].tile === tile) {
      return [...pile.slice(0, i), ...pile.slice(i + 1)];
    }
  }
  return pile;
}

function removeCopies(hand: TileId[], tile: TileId, n: number): TileId[] {
  const out = [...hand];
  for (let i = 0; i < n; i++) {
    const idx = out.indexOf(tile);
    if (idx !== -1) out.splice(idx, 1);
  }
  return out;
}

type KongKind = "exposed" | "concealed" | "added";

/**
 * Kong Bonus, paid immediately when the kong is declared (rate = base $/tai):
 *   - exposed (off a discard): the discarder alone pays 3 * rate.
 *   - concealed (silent, self-drawn quad): every other player pays 2 * rate.
 *   - added (drawn 4th onto a melded pong): every other player pays 1 * rate.
 */
function applyKongBonus(
  state: GameState,
  kongerIndex: number,
  kind: KongKind,
  discarderIndex?: number
): GameState {
  if (!state.rules.kongBonus) return state;
  const rate = state.rules.payoutRate;
  const players = state.players.map((p) => ({ ...p }));
  const round = (x: number) => Math.round(x * 100) / 100;
  let collected = 0;

  if (kind === "exposed" && discarderIndex !== undefined) {
    const amt = round(3 * rate);
    players[discarderIndex].stack = round(players[discarderIndex].stack - amt);
    collected = amt;
  } else {
    const per = (kind === "concealed" ? 2 : 1) * rate;
    for (let j = 0; j < players.length; j++) {
      if (j === kongerIndex) continue;
      const amt = round(per);
      players[j].stack = round(players[j].stack - amt);
      collected += amt;
    }
  }
  players[kongerIndex].stack = round(players[kongerIndex].stack + collected);
  const humanDelta =
    players[state.humanIndex].stack - state.players[state.humanIndex].stack;
  return {
    ...state,
    players,
    pnl: round(state.pnl + humanDelta),
    log: [...state.log, `${players[kongerIndex].name} collects the kong bonus.`],
  };
}

/**
 * Animal pair bonus: completing cat+rat or rooster+centipede pays 1 * rate from
 * every other player, immediately, when the second tile is revealed.
 */
function applyAnimalPair(
  state: GameState,
  playerIndex: number,
  added: TileId[]
): GameState {
  if (!state.rules.animalTiles) return state;
  const flowers = state.players[playerIndex].flowers;
  const has = (t: TileId) => flowers.includes(t);
  const pairs: [TileId, TileId][] = [
    ["cat", "rat"],
    ["rooster", "centipede"],
  ];
  let s = state;
  for (const [a, b] of pairs) {
    const justCompleted =
      has(a) && has(b) && (added.includes(a) || added.includes(b));
    if (!justCompleted) continue;
    const rate = s.rules.payoutRate;
    const players = s.players.map((p) => ({ ...p }));
    const round = (x: number) => Math.round(x * 100) / 100;
    let collected = 0;
    for (let j = 0; j < players.length; j++) {
      if (j === playerIndex) continue;
      players[j].stack = round(players[j].stack - rate);
      collected += rate;
    }
    players[playerIndex].stack = round(players[playerIndex].stack + collected);
    const humanDelta =
      players[s.humanIndex].stack - s.players[s.humanIndex].stack;
    s = {
      ...s,
      players,
      pnl: round(s.pnl + humanDelta),
      log: [...s.log, `${players[playerIndex].name} collects an animal pair.`],
    };
  }
  return s;
}

/**
 * Flower/season seat payment. Each flower/season belongs to a seat (East=1 …
 * North=4). When one is revealed:
 *   - if the seat owner holds their own (正花): every other player pays 1*rate;
 *   - otherwise the seat owner alone pays the holder 1*rate.
 */
function applyFlowerPayment(
  state: GameState,
  holderIndex: number,
  added: TileId[]
): GameState {
  if (!state.rules.flowerTiles) return state;
  let s = state;
  const round = (x: number) => Math.round(x * 100) / 100;
  for (const t of added) {
    if (!isFlowerOrSeason(t)) continue;
    const ownerIndex = Number(t[1]) - 1; // E=1→0 … N=4→3
    if (ownerIndex < 0 || ownerIndex >= s.players.length) continue; // no seat
    const rate = s.rules.payoutRate;
    const players = s.players.map((p) => ({ ...p }));
    if (holderIndex === ownerIndex) {
      // 正花 — every other player pays the owner.
      let collected = 0;
      for (let j = 0; j < players.length; j++) {
        if (j === ownerIndex) continue;
        players[j].stack = round(players[j].stack - rate);
        collected += rate;
      }
      players[ownerIndex].stack = round(players[ownerIndex].stack + collected);
    } else {
      // The seat owner alone pays the holder.
      players[ownerIndex].stack = round(players[ownerIndex].stack - rate);
      players[holderIndex].stack = round(players[holderIndex].stack + rate);
    }
    const humanDelta =
      players[s.humanIndex].stack - s.players[s.humanIndex].stack;
    s = { ...s, players, pnl: round(s.pnl + humanDelta) };
  }
  return s;
}

/** Apply all immediate bonus-tile payments (flowers/seasons + animal pairs). */
function applyBonusPayments(
  state: GameState,
  holderIndex: number,
  added: TileId[]
): GameState {
  return applyAnimalPair(
    applyFlowerPayment(state, holderIndex, added),
    holderIndex,
    added
  );
}

/** Draw the kong replacement tile, then continue (win / discard / choose). */
function afterKongDraw(state: GameState, index: number): GameState {
  if (state.wall.length === 0) return endExhausted(state);
  const { tile: repl, wall, flowersAdded } = drawLiveTile(
    state.wall,
    state.players[index]
  );
  if (repl === null) return endExhausted(state);
  const players = state.players.map((p) => ({ ...p }));
  const me = players[index];
  me.hand = [...me.hand, repl];
  if (flowersAdded.length) me.flowers = [...me.flowers, ...flowersAdded];
  let s: GameState = {
    ...state,
    players,
    wall,
    lastDiscard: null,
    claim: null,
    pendingKong: null,
  };
  if (flowersAdded.length) s = applyBonusPayments(s, index, flowersAdded);
  if (me.isHuman) {
    return {
      ...s,
      phase: "player-choose",
      canSelfDrawWin: meetsMinTai(s, index, null),
      kongOptions: detectKongOptions(me),
      drawnTile: repl,
    };
  }
  return botPostDraw(s, index);
}

function completeConcealedKong(
  state: GameState,
  index: number,
  tile: TileId
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const me = players[index];
  me.hand = removeCopies(me.hand, tile, 4);
  me.melds = [
    ...me.melds,
    { type: "kong", tiles: [tile, tile, tile, tile], concealed: true },
  ];
  const withBonus = applyKongBonus(
    {
      ...state,
      players,
      kongOptions: [],
      log: [...state.log, `${me.name} declares a concealed KONG.`],
    },
    index,
    "concealed"
  );
  return afterKongDraw(withBonus, index);
}

/** Upgrade a melded pong to a kong, then draw replacement. */
function completeAddedKong(
  state: GameState,
  index: number,
  tile: TileId
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const me = players[index];
  me.hand = removeCopies(me.hand, tile, 1);
  me.melds = me.melds.map((m) =>
    m.type === "pong" && m.tiles[0] === tile
      ? { type: "kong", tiles: [tile, tile, tile, tile] }
      : m
  );
  const withBonus = applyKongBonus(
    {
      ...state,
      players,
      kongOptions: [],
      log: [...state.log, `${me.name} declares an added KONG.`],
    },
    index,
    "added"
  );
  return afterKongDraw(withBonus, index);
}

/** Bot declares an added kong; players may rob it (抢杠) if enabled. */
function botAttemptAddedKong(
  state: GameState,
  index: number,
  tile: TileId
): GameState {
  if (state.rules.robbingKong) {
    const probe: GameState = {
      ...state,
      lastDiscard: { playerIndex: index, tile },
    };
    const n = state.players.length;
    // Offer the human first if they can rob.
    if (
      index !== state.humanIndex &&
      meetsMinTai(probe, state.humanIndex, index)
    ) {
      return {
        ...probe,
        phase: "player-claim",
        pendingKong: { konger: index, tile },
        claim: {
          discardTile: tile,
          discarderIndex: index,
          canWin: true,
          canPong: false,
          canKong: false,
          chiOptions: [],
          robKong: true,
        },
      };
    }
    // Otherwise a bot robs if it can.
    for (let step = 1; step < n; step++) {
      const j = (index + step) % n;
      if (j === state.humanIndex) continue;
      if (meetsMinTai(probe, j, index))
        return computeWin(probe, j, index, { robKong: true, winningTile: tile });
    }
  }
  return completeAddedKong(state, index, tile);
}

/** Human declares an added kong; bots may rob it. */
function humanAttemptAddedKong(
  state: GameState,
  tile: TileId
): GameState {
  const index = state.humanIndex;
  if (state.rules.robbingKong) {
    const probe: GameState = {
      ...state,
      lastDiscard: { playerIndex: index, tile },
    };
    const n = state.players.length;
    for (let step = 1; step < n; step++) {
      const j = (index + step) % n;
      if (meetsMinTai(probe, j, index))
        return computeWin(probe, j, index, { robKong: true, winningTile: tile });
    }
  }
  return completeAddedKong(state, index, tile);
}

/** Human declares a kong from their turn (concealed or added). */
export function humanKong(state: GameState, opt: KongOption): GameState {
  if (state.phase !== "player-choose") return state;
  if (opt.type === "concealed")
    return completeConcealedKong(state, state.humanIndex, opt.tile);
  return humanAttemptAddedKong(state, opt.tile);
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
    pendingKong: null,
    kongOptions: [],
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

  // A discarded Fei wildcard cannot be claimed or won on.
  if (tile === "fei") return nextTurn(state);

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

/** Human declines all claims on the current discard (or a kong-rob chance). */
export function humanPass(state: GameState): GameState {
  // Passing on a robbing-the-kong chance: let the added kong complete.
  if (state.pendingKong) {
    const { konger, tile } = state.pendingKong;
    return completeAddedKong(
      { ...state, claim: null, pendingKong: null },
      konger,
      tile
    );
  }
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
    discardPile: removeFromPile(state.discardPile, discarderIndex, tile),
    turnIndex: claimerIndex,
    lastDiscard: null,
    claim: null,
    log: [
      ...state.log,
      `${claimer.name} declares ${type.toUpperCase()}.`,
    ],
  };

  // An exposed Kong off a discard: the discarder pays the bonus.
  if (type === "kong") {
    return afterKongDraw(
      applyKongBonus(base, claimerIndex, "exposed", discarderIndex),
      claimerIndex
    );
  }

  if (claimer.isHuman) {
    return {
      ...base,
      phase: "player-choose",
      canSelfDrawWin: false,
      kongOptions: [],
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
  if (
    !decomposition &&
    !isThirteenOrphans(concealed, winner.melds) &&
    !isSevenPairs(concealed, winner.melds)
  )
    return 0;
  return calculateTai({
    decomposition,
    concealedTiles: concealed,
    melds: winner.melds,
    seatWind: winner.seatWind,
    roundWind: state.roundWind,
    selfDraw,
    robKong: false,
    bonusTiles: winner.flowers,
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

/** Human declares a win (self-draw, ron on a discard, or robbing a kong). */
export function humanDeclareWin(state: GameState): GameState {
  if (state.phase === "player-choose" && state.canSelfDrawWin) {
    return computeWin(state, state.humanIndex, null);
  }
  if (state.phase === "player-claim" && state.claim?.canWin) {
    const c = state.claim;
    if (c.robKong)
      return computeWin(state, state.humanIndex, c.discarderIndex, {
        robKong: true,
        winningTile: c.discardTile,
      });
    return computeWin(state, state.humanIndex, c.discarderIndex);
  }
  return state;
}

function computeWin(
  state: GameState,
  winnerIndex: number,
  discarderIndex: number | null,
  opts?: { robKong?: boolean; winningTile?: TileId }
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const winner = players[winnerIndex];
  const selfDraw = discarderIndex === null;
  const robKong = opts?.robKong ?? false;

  // Build the full 14-tile concealed set for scoring.
  let concealed = [...winner.hand];
  let winningTile: TileId | null = null;
  if (selfDraw) {
    // The just-drawn tile is already in hand.
    winningTile = concealed[concealed.length - 1] ?? null;
  } else {
    winningTile = opts?.winningTile ?? state.lastDiscard?.tile ?? null;
    if (winningTile) {
      concealed = [...concealed, winningTile];
      // On a normal ron, the tile leaves the discarder's pile. A robbed kong
      // tile was never discarded, so there is nothing to remove.
      if (!robKong) {
        const disc = players[discarderIndex!];
        const di = disc.discards.lastIndexOf(winningTile);
        if (di !== -1)
          disc.discards = [
            ...disc.discards.slice(0, di),
            ...disc.discards.slice(di + 1),
          ];
      }
    }
  }

  const decomposition = decomposeWin(concealed, winner.melds);
  const result0 = calculateTai({
    decomposition,
    concealedTiles: concealed,
    melds: winner.melds,
    seatWind: winner.seatWind,
    roundWind: state.roundWind,
    selfDraw,
    robKong,
    bonusTiles: winner.flowers,
    rules: state.rules,
  });
  const tai = result0.tai;

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
    robKong,
    tai,
    taiBreakdown: result0.breakdown,
    limit: result0.limit,
    payments,
    handTiles: concealed,
    handMelds: winner.melds,
    handFlowers: winner.flowers,
  };

  const humanDelta = payments[state.humanIndex] ?? 0;
  // On a normal ron, the won tile leaves the central pile too.
  const discardPile =
    !selfDraw && !robKong && winningTile
      ? removeFromPile(state.discardPile, discarderIndex!, winningTile)
      : state.discardPile;
  return {
    ...state,
    players,
    discardPile,
    phase: "hand-over",
    result,
    claim: null,
    lastDiscard: null,
    pendingKong: null,
    kongOptions: [],
    pnl: Math.round((state.pnl + humanDelta) * 100) / 100,
    log: [
      ...state.log,
      `${winner.name} wins ${tai} tai${
        selfDraw ? " (self-draw)" : robKong ? " (robbing the kong)" : ""
      }.`,
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
    pendingKong: null,
    kongOptions: [],
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
  const deck = shuffle(buildDeck(state.rules.flowerTiles, state.rules.animalTiles, state.rules.feiTiles));
  const dealt = deal(deck, n);
  const players = state.players.map((p, i) => ({
    ...p,
    hand: dealt.hands[i],
    melds: [],
    discards: [],
    flowers: dealt.bonusPerPlayer[i],
  }));
  let next: GameState = {
    ...state,
    players,
    wall: dealt.wall,
    turnIndex: 0,
    phase: "await-draw",
    discardPile: [],
    lastDiscard: null,
    claim: null,
    pendingKong: null,
    canSelfDrawWin: false,
    kongOptions: [],
    drawnTile: null,
    handNumber: state.handNumber + 1,
    result: null,
    exhausted: false,
    log: [...state.log, `— Hand ${state.handNumber + 1} —`],
  };
  for (let i = 0; i < players.length; i++)
    next = applyBonusPayments(next, i, next.players[i].flowers);
  return next;
}

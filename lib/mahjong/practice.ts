import type { GameState, Player } from "@/types/game";
import type { Suit, TileId, Wind } from "@/types/tiles";
import { DEFAULT_RULES, type GameRules } from "@/types/game";
import { FLOWERS, SEASONS, SUIT_NAME } from "@/types/tiles";
import { buildDeck, shuffle } from "./deck";
import { ORPHAN_TILES } from "./handValidator";
import { ukeire } from "./shanten";
import { dangerScores, evaluateDiscardLocal } from "./localStrategy";
import { countTiles, isHonor, isSuit, rankOf, suitOf, tileName } from "./tiles";

/* ===========================================================================
   Practice-mode question generator.

   Every question is ANSWER-VERIFIED: a random frozen scenario is evaluated by
   the offline strategy engine (shanten/ukeire, tai direction, safety model)
   and accepted only when the top answer beats the runner-up by a meaningful
   margin — strictly lower shanten, clearly more live improving tiles, or a
   clearly better strategy/safety score. Near-ties are regenerated. The
   engine's analysis is stored with the question so the explanation always
   matches the scoring.
   =========================================================================== */

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type QuestionType = "discard" | "strategy" | "safety";

export interface PracticeOption {
  id: string;
  label: string;
  /** Set when the option is a tile (safety questions). */
  tile?: TileId;
}

export interface PracticeQuestion {
  type: QuestionType;
  prompt: string;
  /** The frozen scenario, rendered with the normal table components. */
  state: GameState;
  /** Choice buttons; null means "tap a tile in your hand". */
  options: PracticeOption[] | null;
  /** Accepted answers (tile ids or option ids) — ties are all accepted. */
  correct: string[];
  /** 2–3 line explanation derived from the stored engine analysis. */
  explanation: string;
}

/** Acceptance margins between best and runner-up, per difficulty. */
const MARGINS: Record<
  Difficulty,
  { live: number; strat: number; danger: number; discards: [number, number]; melds: number }
> = {
  beginner: { live: 6, strat: 4, danger: 9, discards: [6, 14], melds: 0 },
  intermediate: { live: 4, strat: 2.5, danger: 6, discards: [14, 30], melds: 1 },
  advanced: { live: 2, strat: 1.5, danger: 4, discards: [22, 44], melds: 2 },
};

const SEAT_WINDS: Wind[] = ["east", "south", "west", "north"];

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

function take(deck: TileId[], tile: TileId): boolean {
  const i = deck.indexOf(tile);
  if (i === -1) return false;
  deck.splice(i, 1);
  return true;
}

/* ---- Scenario construction -------------------------------------------------- */

/**
 * A random but plausible frozen table: a semi-structured 14-tile hand for the
 * human, hidden bot hands, optional bot melds, and a shared discard history.
 */
function buildScenario(difficulty: Difficulty): GameState {
  const m = MARGINS[difficulty];
  const deck = shuffle(buildDeck(false, false, false));

  // Semi-structured hand: seed tiles pull in neighbours/pairs so the hand has
  // real shapes plus genuine junk (which is what discard questions test).
  const hand: TileId[] = [];
  while (hand.length < 14) {
    const seed = deck[rand(deck.length)];
    take(deck, seed);
    hand.push(seed);
    if (hand.length >= 14) break;
    const roll = Math.random();
    if (isSuit(seed)) {
      const suit = suitOf(seed)!;
      const r = rankOf(seed)!;
      if (roll < 0.4 && r <= 8 && take(deck, `${r + 1}${suit}`)) {
        hand.push(`${r + 1}${suit}`);
        if (hand.length < 14 && roll < 0.18 && r <= 7 && take(deck, `${r + 2}${suit}`))
          hand.push(`${r + 2}${suit}`);
      } else if (roll >= 0.4 && roll < 0.58 && take(deck, seed)) {
        hand.push(seed);
      }
    } else if (roll < 0.35 && take(deck, seed)) {
      hand.push(seed);
    }
  }

  const humanIndex = rand(4);
  // Occasionally deal the human a flower/season — this gives bonus tai and
  // makes Chou Ping Hu (臭平胡) a genuinely viable strategy to reason about.
  const bonusPool = shuffle([...FLOWERS, ...SEASONS]);
  const humanFlowers =
    Math.random() < 0.35 ? bonusPool.slice(0, 1 + rand(2)) : [];
  let botCounter = 0;
  const players: Player[] = [];
  for (let i = 0; i < 4; i++) {
    const isHuman = i === humanIndex;
    players.push({
      index: i,
      name: isHuman ? "YOU" : `BOT ${++botCounter}`,
      seatWind: SEAT_WINDS[i],
      isHuman,
      isDealer: i === 0,
      hand: isHuman ? hand : deck.splice(0, 13),
      melds: [],
      discards: [],
      flowers: isHuman ? humanFlowers : [],
      stack: DEFAULT_RULES.startingStack,
    });
  }

  // Optional bot melds (more table context to read at higher difficulty).
  const meldCount = rand(m.melds + 1);
  for (let k = 0; k < meldCount; k++) {
    const bot = players[(humanIndex + 1 + rand(3)) % 4];
    if (bot.isHuman) continue;
    const t = deck.find((x) => deck.filter((y) => y === x).length >= 3);
    if (!t) continue;
    for (let c = 0; c < 3; c++) take(deck, t);
    bot.melds = [...bot.melds, { type: "pong", tiles: [t, t, t] }];
  }

  // Shared discard history.
  const discardPile: GameState["discardPile"] = [];
  const nDiscards = m.discards[0] + rand(m.discards[1] - m.discards[0] + 1);
  for (let k = 0; k < nDiscards && deck.length > 30; k++) {
    const idx = k % 4;
    const tile = deck.shift()!;
    players[idx].discards = [...players[idx].discards, tile];
    discardPile.push({ playerIndex: idx, tile });
  }

  const rules: GameRules = { ...DEFAULT_RULES, coachEngine: "local" };
  return {
    rules,
    players,
    humanIndex,
    wall: deck.slice(0, 30 + rand(40)),
    deadWallFlowers: [],
    payAnim: null,
    payEvents: [],
    bubbles: [],
    roundWind: Math.random() < 0.5 ? "east" : "south",
    dealerIndex: 0,
    turnIndex: humanIndex,
    phase: "player-choose",
    discardPile,
    lastDiscard: null,
    claim: null,
    pendingKong: null,
    canSelfDrawWin: false,
    kongOptions: [],
    drawnTile: hand[hand.length - 1],
    replacementDraw: null,
    pendingBonus: null,
    handNumber: 1,
    result: null,
    exhausted: false,
    correctDiscards: 0,
    totalDiscards: 0,
    pnl: 0,
    log: [],
  };
}

/** Copies of each tile visible to the human (own hand + discards + melds). */
function visibleCounts(state: GameState): Map<TileId, number> {
  const v = new Map<TileId, number>();
  const bump = (t: TileId) => v.set(t, (v.get(t) ?? 0) + 1);
  for (const p of state.players) {
    for (const t of p.discards) bump(t);
    for (const meld of p.melds) for (const t of meld.tiles) bump(t);
    if (p.isHuman) for (const t of p.hand) bump(t);
  }
  return v;
}

/* ---- Question type A: best discard ------------------------------------------ */

function tryDiscardQuestion(
  state: GameState,
  liveMargin: number
): PracticeQuestion | null {
  const human = state.players[state.humanIndex];
  const visible = visibleCounts(state);
  const liveOf = (t: TileId) => Math.max(0, 4 - (visible.get(t) ?? 0));

  const cands = [...new Set(human.hand)]
    .map((tile) => {
      const rest = [...human.hand];
      rest.splice(rest.indexOf(tile), 1);
      const u = ukeire(rest, 0, liveOf);
      return { tile, sh: u.shanten, live: u.totalLive };
    })
    .sort((a, b) => a.sh - b.sh || b.live - a.live);

  const best = cands[0];
  if (best.sh > 4) return null; // hopeless hands make poor questions
  const ties = cands.filter((c) => c.sh === best.sh && c.live === best.live);
  const runner = cands.find((c) => c.sh !== best.sh || c.live !== best.live);
  if (!runner) return null;

  const clear =
    best.sh < runner.sh || (best.sh === runner.sh && best.live >= runner.live + liveMargin);
  if (!clear) return null;

  // The in-game coach's read of the verified best discard.
  const coach = evaluateDiscardLocal(state, best.tile);
  const runnerNote =
    runner.sh > best.sh
      ? `${tileName(runner.tile)} would leave you ${runner.sh} from ready instead of ${best.sh}.`
      : `Next best, ${tileName(runner.tile)}, keeps only ${runner.live} useful draws vs ${best.live}.`;

  return {
    type: "discard",
    prompt: "打哪张？Which tile do you discard?",
    state,
    options: null,
    correct: ties.map((c) => c.tile),
    explanation: `${coach.text} ${runnerNote}`,
  };
}

/* ---- Question type B: strategy multiple choice ------------------------------- */

interface StratEval {
  id: string;
  cn: string; // Chinese name
  en: string; // English name
  tai: number; // house-rule tai value (for display + ranking)
  fit: number; // tiles of the 14 already serving the strategy (0–14)
  special: boolean; // 七对 / 十三幺 — only correct when the hand truly leans
  viable: boolean; // can legally be the intended answer for THIS hand
  rank: number; // distance-to-win weighted by tai (computed below)
}

const SUITS3: Suit[] = ["wan", "tong", "bam"];

/** Greedy count of tiles participating in runs (×3) or run-partials (×2). */
function sequenceFit(hand: TileId[]): number {
  let fit = 0;
  for (const suit of SUITS3) {
    const counts = new Array<number>(10).fill(0);
    for (const t of hand) if (suitOf(t) === suit) counts[rankOf(t)!]++;
    for (let r = 1; r <= 7; r++)
      while (counts[r] > 0 && counts[r + 1] > 0 && counts[r + 2] > 0) {
        counts[r]--; counts[r + 1]--; counts[r + 2]--;
        fit += 3;
      }
    for (let r = 1; r <= 8; r++)
      while (counts[r] > 0 && counts[r + 1] > 0) {
        counts[r]--; counts[r + 1]--;
        fit += 2;
      }
    for (let r = 1; r <= 7; r++)
      while (counts[r] > 0 && counts[r + 2] > 0) {
        counts[r]--; counts[r + 2]--;
        fit += 2;
      }
  }
  return fit;
}

/** Tiles serving Thirteen Orphans: distinct terminal/honor types (+1 a pair). */
function orphanFit(counts: Map<TileId, number>): number {
  let distinct = 0;
  let hasPair = false;
  for (const t of ORPHAN_TILES) {
    const c = counts.get(t) ?? 0;
    if (c >= 1) distinct++;
    if (c >= 2) hasPair = true;
  }
  return distinct + (hasPair ? 1 : 0);
}

/** Build the full strategy pool, each scored against the hand. */
function evaluateStrategies(hand: TileId[], hasBonus: boolean): StratEval[] {
  const counts = countTiles(hand);
  const honors = hand.filter(isHonor).length;
  const suitCount: Record<Suit, number> = { wan: 0, tong: 0, bam: 0 };
  for (const t of hand) {
    const s = suitOf(t);
    if (s) suitCount[s]++;
  }

  let pphFit = 0;
  for (const c of counts.values()) pphFit += c >= 2 ? Math.min(c, 3) : 0;
  let pairs = 0;
  for (const c of counts.values()) pairs += Math.floor(c / 2);

  const seqFit = sequenceFit(hand);

  const pool: StratEval[] = [
    // Ping Hu vs Chou Ping Hu are mutually exclusive: holding a bonus tile
    // downgrades a sequence hand to Chou Ping Hu, so only one is "viable".
    {
      id: "pinghu", cn: "平胡", en: "Ping Hu", tai: 4,
      fit: seqFit, special: false, viable: !hasBonus, rank: 0,
    },
    {
      id: "choupinghu", cn: "臭平胡", en: "Chou Ping Hu", tai: 1,
      fit: seqFit, special: false, viable: hasBonus, rank: 0,
    },
    {
      id: "pph", cn: "对对胡", en: "Pong Pong Hu", tai: 2,
      fit: pphFit, special: false, viable: true, rank: 0,
    },
    {
      id: "sevenpairs", cn: "七对", en: "Seven Pairs", tai: 2,
      fit: pairs * 2, special: true, viable: true, rank: 0,
    },
    {
      id: "orphans", cn: "十三幺", en: "Thirteen Wonders", tai: 13,
      fit: orphanFit(counts), special: true, viable: true, rank: 0,
    },
  ];
  for (const s of SUITS3) {
    pool.push({
      id: `half-${s}`, cn: "混一色",
      en: `Half Flush (${SUIT_NAME[s]})`, tai: 2,
      fit: suitCount[s] + honors, special: false, viable: true, rank: 0,
    });
    pool.push({
      id: `full-${s}`, cn: "清一色",
      en: `Full Flush (${SUIT_NAME[s]})`, tai: 4,
      fit: suitCount[s], special: false, viable: true, rank: 0,
    });
  }

  // Distance-to-win dominates (more fitting tiles = closer); tai is a capped
  // tiebreaker so a huge-tai longshot never outranks a much closer hand.
  for (const e of pool) e.rank = e.fit * 2 + Math.min(e.tai, 5);
  return pool;
}

function optionLabel(e: StratEval): string {
  return `${e.cn} ${e.en} · ${e.tai}台`;
}

function tryStrategyQuestion(
  state: GameState,
  stratMargin: number,
  difficulty: Difficulty
): PracticeQuestion | null {
  const human = state.players[state.humanIndex];
  const hand = human.hand;
  const hasBonus = human.flowers.length > 0;
  const pool = evaluateStrategies(hand, hasBonus);

  // Best legal answer = highest-ranked viable strategy.
  const viable = pool.filter((e) => e.viable).sort((a, b) => b.rank - a.rank);
  const best = viable[0];
  const runner = viable[1];
  if (!best || !runner) return null;

  // The hand must genuinely favour a direction, and beat the runner-up clearly.
  if (best.fit < 9) return null;
  if (best.rank - runner.rank < stratMargin) return null;
  // Special hands (七对 / 十三幺) may only be the ANSWER when the hand really
  // leans that way; otherwise they stay distractors.
  if (best.special && best.fit < 11) return null;

  // Distractors: prefer plausible ones (share tiles with the hand). At Beginner
  // an occasional absurd option (no overlap) is allowed for contrast.
  const rest = pool.filter((e) => e.id !== best.id);
  const plausible = shuffle(rest.filter((e) => e.fit >= 4));
  const absurd = shuffle(rest.filter((e) => e.fit < 4));
  const distractors: StratEval[] = [];
  if (difficulty === "beginner" && absurd.length && Math.random() < 0.5)
    distractors.push(absurd.shift()!);
  for (const e of plausible) {
    if (distractors.length >= 3) break;
    distractors.push(e);
  }
  for (const e of [...absurd, ...plausible]) {
    if (distractors.length >= 3) break;
    if (!distractors.includes(e)) distractors.push(e);
  }
  if (distractors.length < 3) return null;

  const options = shuffle(
    [best, ...distractors.slice(0, 3)].map((e) => ({
      id: e.id,
      label: optionLabel(e),
    }))
  );

  const explanation =
    `${best.cn} ${best.en} fits this hand best: ${best.fit} of your 14 tiles already serve it, ` +
    `worth ${best.tai} tai. Next closest, ${runner.cn} ${runner.en}, fits only ${runner.fit} tiles` +
    `${runner.tai > best.tai ? ` — higher value but measurably slower` : ""}. ` +
    `Count which tiles you'd have to replace before committing to a shape.`;

  return {
    type: "strategy",
    prompt: "这手牌应该做什么牌型？Which strategy should you aim for?",
    state,
    options,
    correct: [best.id],
    explanation,
  };
}

/* ---- Question type C: safest discard ----------------------------------------- */

function trySafetyQuestion(
  state: GameState,
  dangerMargin: number
): PracticeQuestion | null {
  const hand = state.players[state.humanIndex].hand;
  if (state.discardPile.length < 10) return null; // needs reads to exist
  const distinct = [...new Set(hand)];
  if (distinct.length < 4) return null;
  const candTiles = shuffle(distinct).slice(0, 4);

  const scored = dangerScores(state, candTiles).sort((a, b) => a.danger - b.danger);
  const [best, runner] = scored;
  if (runner.danger - best.danger < dangerMargin) return null;

  const worst = scored[scored.length - 1];
  const visible = visibleCounts(state).get(best.tile) ?? 0;
  const bestWhy =
    best.note ??
    `${visible > 1 ? `${visible} copies are already visible and ` : ""}nobody at the table is collecting around it`;
  const explanation =
    `${tileName(best.tile)} is the safest of the four — ${bestWhy}. ` +
    `${tileName(worst.tile)} is the most dangerous${worst.note ? `: ${worst.note}` : " here"}. ` +
    `Safety is counted, not guessed: check every discard pile and meld before releasing a tile.`;

  return {
    type: "safety",
    prompt: "哪张最安全？Which of these tiles is safest to discard?",
    state,
    options: scored
      .map((s) => ({ id: s.tile, label: tileName(s.tile), tile: s.tile }))
      .sort(() => Math.random() - 0.5),
    correct: scored
      .filter((s) => s.danger - best.danger < 0.5)
      .map((s) => s.tile),
    explanation,
  };
}

/* ---- Public generator --------------------------------------------------------- */

/**
 * Generate one verified question. Tries the rolled question type against fresh
 * scenarios; if the margin can't be met it relaxes gradually and finally falls
 * back to the most reliably generable type (discard), so it always returns.
 */
export function generatePracticeQuestion(
  difficulty: Difficulty
): PracticeQuestion {
  const m = MARGINS[difficulty];
  const roll = Math.random();
  const preferred: QuestionType =
    roll < 0.5 ? "discard" : roll < 0.8 ? "strategy" : "safety";

  for (const relax of [1, 1, 0.7, 0.5]) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const state = buildScenario(difficulty);
      const q =
        preferred === "strategy"
          ? tryStrategyQuestion(state, m.strat * relax, difficulty)
          : preferred === "safety"
            ? trySafetyQuestion(state, m.danger * relax)
            : tryDiscardQuestion(state, Math.max(1, Math.round(m.live * relax)));
      if (q) return q;
    }
  }
  // Fallback: a discard question with the minimum meaningful margin.
  for (;;) {
    const q = tryDiscardQuestion(buildScenario(difficulty), 1);
    if (q) return q;
  }
}

import type { GameRules, GameState, Meld } from "@/types/game";
import type { Suit, TileId, Wind } from "@/types/tiles";
import type { Verdict } from "@/lib/claude/strategyFeedback";
import { DRAGONS, SUIT_NAME, WIND_NAME } from "@/types/tiles";
import { decomposeWin } from "./handValidator";
import { shanten, ukeire, type Improvement } from "./shanten";
import { calculateTai, taiHintFor } from "./taiCalculator";
import {
  countTiles,
  isFei,
  isHonor,
  isSuit,
  rankOf,
  suitOf,
  tileName,
} from "./tiles";

/* ===========================================================================
   Offline strategy coach.

   For every tile the player could throw, it computes the hand AFTER that
   discard: shanten (tiles from ready), which draws improve it, and how many
   of those are still unseen ("live"). The proposed discard is judged against
   the best alternative on three axes:

     shape  — never give back shanten; prefer more live improving tiles.
     tai    — Singapore hands must reach the minimum tai to win at all, so
              the coach tracks scoring direction (flush, value honors, ping
              hu, all-triplets) and warns when a hand is going "chicken".
     safety — per-opponent threat (melds, late wall) times tile danger.
              No furiten here: a tile an opponent discarded earlier is a
              weaker read, not a guaranteed safe one.

   Mirrors the {verdict, text} shape of the AI coach.
   =========================================================================== */

interface OppRead {
  label: string;
  meldCount: number;
  ownDiscards: Set<TileId>;
  meldedSuits: Map<Suit, number>;
  threat: number; // ~0.3 quiet … ~1.5 visibly close to winning
}

interface Ctx {
  hand: TileId[];
  handCount: Map<TileId, number>;
  melds: Meld[];
  flowers: TileId[];
  seatWind: Wind;
  roundWind: Wind;
  visible: Map<TileId, number>;
  opps: OppRead[];
  wallRemaining: number;
  rules: GameRules;
}

interface WaitDetail extends Improvement {
  ronTai: number; // tai if won off a discard (0 = cannot Hu on a discard)
  zimoTai: number; // tai if self-drawn
}

interface Candidate {
  tile: TileId;
  sh: number;
  improvements: Improvement[];
  totalLive: number;
  /** Only set at tenpai: each wait scored with the real tai calculator. */
  waits: WaitDetail[] | null;
  /** Tenpai win value: live tiles weighted by payout (2^tai), ron-dead
      waits discounted to a self-draw-only chance. */
  winValue: number;
  danger: number;
  taiBias: number;
  utility: number;
}

interface TaiRead {
  guaranteed: number; // bonus tiles + melded honor pongs (taiHintFor)
  menqing: boolean; // no exposed melds — 门清 +1 stays possible
  valueHonorPairs: TileId[]; // concealed pairs of seat/round wind or dragons
  flushSuit: Suit | null;
  flushRatio: number; // dominant suit + honors share (half-flush read)
  pureRatio: number; // dominant suit share (full-flush read)
  estMax: number; // optimistic ceiling for this hand's tai
}

function isValueHonor(tile: TileId, ctx: Ctx): boolean {
  return (
    tile === ctx.seatWind ||
    tile === ctx.roundWind ||
    (DRAGONS as string[]).includes(tile)
  );
}

/* ---- Context --------------------------------------------------------------- */

function threatOf(meldCount: number, taiHint: number, wall: number): number {
  let t = 0.3 + 0.22 * meldCount;
  if (wall < 24) t += 0.15;
  if (wall < 12) t += 0.25;
  if (taiHint >= 2) t += 0.15;
  return Math.min(t, 1.5);
}

function buildContext(state: GameState): Ctx {
  const human = state.players[state.humanIndex];
  const visible = new Map<TileId, number>();
  const bump = (t: TileId) => visible.set(t, (visible.get(t) ?? 0) + 1);

  const opps: OppRead[] = [];
  for (const p of state.players) {
    for (const t of p.discards) bump(t);
    for (const m of p.melds) for (const t of m.tiles) bump(t);
    if (p.isHuman) {
      for (const t of p.hand) bump(t);
      continue;
    }
    const meldedSuits = new Map<Suit, number>();
    for (const m of p.melds) {
      const s = suitOf(m.tiles[0]);
      if (s) meldedSuits.set(s, (meldedSuits.get(s) ?? 0) + 1);
    }
    const taiHint = taiHintFor(
      p.flowers,
      p.melds,
      p.seatWind,
      state.roundWind,
      state.rules
    );
    opps.push({
      label: `${WIND_NAME[p.seatWind]} (${p.name})`,
      meldCount: p.melds.length,
      ownDiscards: new Set(p.discards),
      meldedSuits,
      threat: threatOf(p.melds.length, taiHint, state.wall.length),
    });
  }

  return {
    hand: human.hand,
    handCount: countTiles(human.hand),
    melds: human.melds,
    flowers: human.flowers,
    seatWind: human.seatWind,
    roundWind: state.roundWind,
    visible,
    opps,
    wallRemaining: state.wall.length,
    rules: state.rules,
  };
}

/* ---- Safety ---------------------------------------------------------------- */

function dangerFor(tile: TileId, ctx: Ctx): number {
  const unseen = Math.max(0, 4 - (ctx.visible.get(tile) ?? 0));
  let total = 0;
  for (const opp of ctx.opps) {
    let d: number;
    if (isHonor(tile)) {
      // Honors only deal in as pongs/pairs — they need unseen copies to hold.
      const base = isValueHonor(tile, ctx) ? 6 : 4;
      d = base * (unseen >= 2 ? 1 : unseen === 1 ? 0.4 : 0);
    } else {
      const r = rankOf(tile)!;
      // Sequence danger doesn't depend on this tile's own count; pair/pong
      // danger does.
      const run = r >= 3 && r <= 7 ? 8 : r === 2 || r === 8 ? 6 : 4;
      d = run + 3 * (unseen / 3);
      const sm = opp.meldedSuits.get(suitOf(tile)!) ?? 0;
      if (sm > 0) d += sm >= 2 ? 9 : 5;
    }
    // They threw one earlier themselves — they can still win on it (no
    // furiten rule), but it suggests they aren't collecting around it.
    if (opp.ownDiscards.has(tile)) d *= 0.45;
    total += d * opp.threat;
  }
  return total;
}

/* ---- Tai direction ---------------------------------------------------------- */

function readTai(ctx: Ctx): TaiRead {
  const structural = [...ctx.hand, ...ctx.melds.flatMap((m) => m.tiles)];
  const bySuit = new Map<Suit, number>();
  let honors = 0;
  let jokers = 0;
  for (const t of structural) {
    if (isFei(t)) jokers++;
    else if (isHonor(t)) honors++;
    else {
      const s = suitOf(t);
      if (s) bySuit.set(s, (bySuit.get(s) ?? 0) + 1);
    }
  }
  let flushSuit: Suit | null = null;
  let domCount = 0;
  for (const [s, n] of bySuit) {
    if (n > domCount) {
      domCount = n;
      flushSuit = s;
    }
  }
  const total = Math.max(1, structural.length);
  const flushRatio = (domCount + honors + jokers) / total;
  const pureRatio = (domCount + jokers) / total;

  const valueHonorPairs: TileId[] = [];
  for (const [t, c] of ctx.handCount) {
    if (c >= 2 && isValueHonor(t, ctx)) valueHonorPairs.push(t);
  }

  const guaranteed = taiHintFor(
    ctx.flowers,
    ctx.melds,
    ctx.seatWind,
    ctx.roundWind,
    ctx.rules
  );
  const menqing = ctx.melds.every((m) => m.concealed);
  const hasPongMeld = ctx.melds.some((m) => m.type !== "chi");
  const hasChiMeld = ctx.melds.some((m) => m.type === "chi");
  const hasBonus = ctx.flowers.length > 0;

  // Optimistic ceiling: what could this hand still plausibly score?
  let estMax = guaranteed;
  if (menqing) estMax += 1; // 门清 — self-draw only (house rule), but reachable
  estMax += valueHonorPairs.length; // each could become a scoring triplet
  if (flushRatio >= 0.8) estMax += pureRatio >= 0.8 ? 4 : 2; // flush in reach
  if (!hasPongMeld) estMax += hasBonus ? 1 : 4; // (chou) ping hu path alive
  if (!hasChiMeld) estMax += 2; // all-triplets path alive

  return {
    guaranteed,
    menqing,
    valueHonorPairs,
    flushSuit,
    flushRatio,
    pureRatio,
    estMax,
  };
}

function taiBiasFor(tile: TileId, ctx: Ctx, tai: TaiRead): number {
  let b = 0;
  if (tai.flushRatio >= 0.7 && tai.flushSuit) {
    const s = suitOf(tile);
    if (s && s !== tai.flushSuit) b += 7; // shedding off-suit feeds the flush
    else if (s === tai.flushSuit) b -= 5;
  }
  if (tai.valueHonorPairs.includes(tile)) b -= 12; // breaking a tai pair
  return b;
}

/** Discarding `tile` would leave the hand unable to reach the minimum tai. */
function killsLastTai(tile: TileId, ctx: Ctx, tai: TaiRead): boolean {
  if ((ctx.handCount.get(tile) ?? 0) !== 2) return false;
  if (!tai.valueHonorPairs.includes(tile)) return false;
  return tai.estMax >= ctx.rules.minTai && tai.estMax - 1 < ctx.rules.minTai;
}

/* ---- Candidates -------------------------------------------------------------- */

/** Score a tenpai hand's win on `winTile` with the real tai calculator. */
function winTaiFor(
  rest: TileId[],
  winTile: TileId,
  ctx: Ctx,
  selfDraw: boolean
): number {
  const concealedWin = [...rest, winTile];
  return calculateTai({
    decomposition: decomposeWin(concealedWin, ctx.melds),
    concealedTiles: concealedWin,
    winningTile: winTile,
    melds: ctx.melds,
    seatWind: ctx.seatWind,
    roundWind: ctx.roundWind,
    selfDraw,
    robKong: false,
    lastTile: false,
    replacement: null,
    bonusTiles: ctx.flowers,
    rules: ctx.rules,
  }).tai;
}

function evaluateCandidates(ctx: Ctx, tai: TaiRead): Candidate[] {
  const liveOf = (t: TileId) => Math.max(0, 4 - (ctx.visible.get(t) ?? 0));
  const minTai = ctx.rules.minTai;
  const out: Candidate[] = [];
  for (const tile of new Set(ctx.hand)) {
    const rest = [...ctx.hand];
    rest.splice(rest.indexOf(tile), 1);
    const u = ukeire(rest, ctx.melds.length, liveOf);

    // At tenpai, waits are not equal: a two-sided wait may keep ping hu while
    // a shanpon kills it, and a sub-minimum ron means self-draw only. Score
    // each wait with the actual tai calculator (payout doubles per tai).
    let waits: WaitDetail[] | null = null;
    let winValue = 0;
    if (u.shanten === 0) {
      waits = u.improvements.map((imp) => ({
        ...imp,
        ronTai: winTaiFor(rest, imp.tile, ctx, false),
        zimoTai: winTaiFor(rest, imp.tile, ctx, true),
      }));
      for (const w of waits) {
        if (w.ronTai >= minTai) winValue += w.live * 2 ** Math.min(w.ronTai, 5);
        else if (w.zimoTai >= minTai)
          winValue += w.live * 0.35 * 2 ** Math.min(w.zimoTai, 5);
      }
    }

    out.push({
      tile,
      sh: u.shanten,
      improvements: u.improvements,
      totalLive: u.totalLive,
      waits,
      winValue,
      danger: dangerFor(tile, ctx),
      taiBias: taiBiasFor(tile, ctx, tai),
      utility: 0,
    });
  }
  return out;
}

/* ---- Text helpers -------------------------------------------------------------- */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function waitList(imps: Improvement[], max = 4): string {
  const sorted = [...imps].sort((a, b) => b.live - a.live);
  const shown = sorted.slice(0, max).map((i) => tileName(i.tile));
  const extra = sorted.length - shown.length;
  return shown.join(", ") + (extra > 0 ? ` (+${extra} more)` : "");
}

/** ", worth N tai on a win" — or a self-draw-only warning for ron-dead waits. */
function waitTaiNote(c: Candidate, minTai: number): string {
  if (!c.waits) return "";
  const winnable = c.waits.filter((w) => w.live > 0);
  if (winnable.length === 0) return "";
  const ronable = winnable.filter((w) => w.ronTai >= minTai);
  if (ronable.length === 0) {
    return winnable.some((w) => w.zimoTai >= minTai)
      ? ` — but a discard win would fall below the ${minTai}-tai minimum, so you can only Hu by self-draw`
      : "";
  }
  const tais = ronable.map((w) => w.ronTai);
  const lo = Math.min(...tais);
  const hi = Math.max(...tais);
  return lo === hi
    ? `, worth ${lo} tai on a win`
    : `, worth ${lo}–${hi} tai depending on the winning tile`;
}

function shapePhrase(c: Candidate, minTai: number): string {
  if (c.sh <= 0) {
    const thin = c.totalLive <= 2 ? " — a thin wait" : "";
    return `you'd be ready, waiting on ${waitList(c.improvements)} (${c.totalLive} winning tile${
      c.totalLive === 1 ? "" : "s"
    } unseen${thin})${waitTaiNote(c, minTai)}`;
  }
  if (c.sh === 1)
    return `you'd be one tile from ready, with ${c.totalLive} useful draws still unseen`;
  return `you'd be ${c.sh} steps from ready (${c.totalLive} useful draws unseen)`;
}

function shortShape(c: Candidate, minTai: number): string {
  if (c.sh <= 0)
    return `keeps you ready on ${waitList(c.improvements, 3)} (${c.totalLive} live${waitTaiNote(c, minTai)})`;
  if (c.sh === 1) return `keeps you one from ready with ${c.totalLive} live draws`;
  return `keeps you ${c.sh} away with ${c.totalLive} live draws`;
}

interface SafetyNote {
  text: string;
  warning: boolean;
}

function safetyPhrase(tile: TileId, ctx: Ctx): SafetyNote | null {
  const name = tileName(tile);
  const visible = ctx.visible.get(tile) ?? 0;
  for (const opp of ctx.opps) {
    const s = suitOf(tile);
    if (s && (opp.meldedSuits.get(s) ?? 0) >= 2)
      return {
        text: `${opp.label} is clearly collecting ${SUIT_NAME[s]} — this feeds their hand`,
        warning: true,
      };
  }
  if (isHonor(tile)) {
    if (visible >= 2)
      return {
        text: `${name} can no longer be ponged, so it's a safe release`,
        warning: false,
      };
    if (visible === 0 && isValueHonor(tile, ctx) && ctx.wallRemaining < 40)
      return {
        text: `no ${name} has appeared yet — someone may be sitting on a pair`,
        warning: true,
      };
    return null;
  }
  const r = rankOf(tile)!;
  for (const opp of ctx.opps) {
    const s = suitOf(tile)!;
    if ((opp.meldedSuits.get(s) ?? 0) === 1 && opp.threat >= 0.6)
      return {
        text: `${opp.label} has melded ${SUIT_NAME[s]} — feeding that suit is risky`,
        warning: true,
      };
  }
  if (visible >= 3)
    return {
      text: `nearly every ${name} is already visible, so it's low risk`,
      warning: false,
    };
  if (r >= 3 && r <= 7 && ctx.wallRemaining < 24)
    return {
      text: `a live middle tile this late can feed a waiting hand`,
      warning: true,
    };
  return null;
}

/* ---- Public API -------------------------------------------------------------- */

export function evaluateDiscardLocal(
  state: GameState,
  proposed: TileId
): { verdict: Verdict; text: string } {
  const ctx = buildContext(state);
  const detailed = state.rules.feedbackDetail === "detailed";
  const minTai = ctx.rules.minTai;

  // The hand is already complete and declarable — say so before anything else.
  if (state.canSelfDrawWin) {
    return {
      verdict: "mistake",
      text: "Your hand is complete — declare the self-draw win instead of discarding! Only break it up if you are deliberately fishing for a bigger hand.",
    };
  }

  const tai = readTai(ctx);
  const candidates = evaluateCandidates(ctx, tai);
  const byTile = new Map(candidates.map((c) => [c.tile, c]));
  const me = byTile.get(proposed)!;

  const peers = candidates.filter((c) => !isFei(c.tile));
  const minSh = Math.min(...peers.map((c) => c.sh));
  const dw =
    minSh <= 0 ? 0.5
    : minSh === 1 ? 0.8
    : minSh === 2 ? 1.2
    : ctx.wallRemaining < 16 ? 2.2
    : 1.4;
  for (const c of candidates)
    c.utility =
      (c.sh === 0 ? c.winValue * 3 : c.totalLive * 3) +
      c.taiBias -
      c.danger * dw;

  const sameSh = peers
    .filter((c) => c.sh === minSh)
    .sort((a, b) => b.utility - a.utility);
  const best = sameSh[0];
  const maxLive = Math.max(...sameSh.map((c) => c.totalLive));
  const foldMode = minSh >= 3 && ctx.wallRemaining < 16;
  const safest = [...peers].sort((a, b) => a.danger - b.danger)[0];

  // ---- Verdict ----------------------------------------------------------
  let verdict: Verdict;
  let lead: string;
  const suggest = best.tile !== proposed
    ? `${tileName(best.tile)} ${shortShape(best, minTai)}.`
    : null;

  if (isFei(proposed)) {
    verdict = "mistake";
    lead = `The Fei wildcard can complete any set or pair — almost never let it go.${
      suggest ? ` ${capitalize(suggest)}` : ""
    }`;
  } else if (foldMode) {
    // Hand is too far back with the wall almost gone: judge purely on safety.
    const gap = me.danger - safest.danger;
    const why = safetyPhrase(proposed, ctx);
    const fallback = `With your hand still ${minSh} from ready and only ${ctx.wallRemaining} tiles left, winning is unlikely — play defence.`;
    if (gap <= 3) {
      verdict = "best";
      lead = `Good defence: ${
        why && !why.warning ? why.text : `this is among the safest tiles you hold`
      }. ${fallback}`;
    } else {
      verdict = gap >= 12 || (why?.warning ?? false) ? "mistake" : "risky";
      const safer = safetyPhrase(safest.tile, ctx);
      lead = `${capitalize(
        why?.warning ? why.text : `there are safer tiles than ${tileName(proposed)}`
      )}. ${fallback} ${capitalize(
        `${tileName(safest.tile)} is the safest throw${safer && !safer.warning ? ` (${safer.text})` : ""}.`
      )}`;
    }
  } else if (killsLastTai(proposed, ctx, tai)) {
    verdict = "mistake";
    lead = `The ${tileName(proposed)} pair is your only tai source — break it and this hand can't reach the ${minTai}-tai minimum even when complete. Keep it.${
      suggest ? ` ${capitalize(suggest)}` : ""
    }`;
  } else if (me.sh > minSh) {
    if (minSh === 0) {
      verdict = "mistake";
      lead = `That drops you out of ready — keep ${tileName(proposed)}. ${capitalize(
        suggest ?? ""
      )}`;
    } else {
      verdict = "mistake";
      lead = `That sets your hand back: ${shapePhrase(me, minTai)}.${
        suggest ? ` Better: ${suggest}` : ""
      }`;
    }
  } else if (minSh === 0 && me.totalLive === 0 && maxLive > 0) {
    verdict = "mistake";
    lead = `You'd be ready, but every tile of your wait is already visible — a dead hand. ${capitalize(
      suggest ?? ""
    )}`;
  } else {
    const utilGap = best.utility - me.utility;
    const liveGap = maxLive - me.totalLive;
    const dangerous =
      me.danger * dw >= 18 && best.danger * dw <= me.danger * dw - 8;
    // At tenpai, compare candidates by win value (outs × payout), which
    // captures wait width AND tai differences (e.g. two-sided keeps ping hu,
    // shanpon kills it). Off tenpai, fall back to the utility margin.
    const valueRatio =
      minSh === 0 && best.winValue > 0 ? me.winValue / best.winValue : null;
    const shapeFine = valueRatio !== null ? valueRatio >= 0.75 : utilGap <= 9;
    const pairDead =
      (ctx.handCount.get(proposed) ?? 0) === 2 &&
      Math.max(0, 4 - (ctx.visible.get(proposed) ?? 0)) === 0;
    const pairDeadNote = pairDead
      ? ` Both other ${tileName(proposed)} are visible, so that pair could never have completed.`
      : "";
    if (proposed === best.tile) {
      verdict = "best";
      lead = `${capitalize(shapePhrase(me, minTai))}.${pairDeadNote}`;
    } else if (dangerous) {
      // Keeps the hand's speed but feeds danger.
      verdict = me.danger * dw >= 28 ? "mistake" : "risky";
      const why = safetyPhrase(proposed, ctx);
      lead = `${capitalize(why?.text ?? `${tileName(proposed)} is a risky release right now`)}. ${capitalize(
        suggest ?? "A safer tile does the same job."
      )}`;
    } else if (shapeFine) {
      verdict = "fine";
      lead = `${capitalize(shapePhrase(me, minTai))}.${pairDeadNote}${
        suggest ? ` Slightly better: ${suggest}` : ""
      }`;
    } else if (valueRatio !== null) {
      verdict = valueRatio < 0.35 ? "risky" : "fine";
      lead = `You'd still be ready, but ${tileName(best.tile)} is the stronger wait: it ${shortShape(
        best,
        minTai
      )}. This discard waits on ${waitList(me.improvements, 3)} (${me.totalLive} live${waitTaiNote(
        me,
        minTai
      )}).`;
    } else if (liveGap >= 6) {
      verdict = "fine";
      lead = `Workable, but ${tileName(best.tile)} is better shape — it ${shortShape(
        best,
        minTai
      )}, versus ${me.totalLive} if you throw ${tileName(proposed)}.`;
    } else {
      verdict = "fine";
      lead = `Fine — ${shapePhrase(me, minTai)}. ${
        suggest ? `Slightly better: ${suggest}` : ""
      }`;
    }
  }

  // ---- Extra coaching lines ----------------------------------------------
  const extras: string[] = [];

  // A hand that can no longer reach the minimum tai must be flagged loudly.
  if (tai.estMax < minTai) {
    extras.push(
      `Warning: this hand has no remaining path to ${minTai} tai — it cannot win as built. Steer back toward a flush, value-honor triplets, or all triplets.`
    );
  } else if (detailed && !foldMode) {
    if (tai.guaranteed === 0 && !tai.menqing && tai.valueHonorPairs.length > 0)
      extras.push(
        `Tai check: your ${tai.valueHonorPairs
          .map(tileName)
          .join(" and ")} pair is what keeps this hand able to score — protect it.`
      );
    else if (tai.flushRatio >= 0.75 && tai.flushSuit)
      extras.push(
        `Tai check: your hand leans ${SUIT_NAME[tai.flushSuit]} — keep shedding off-suit tiles and the ${
          tai.pureRatio >= 0.75 ? "full flush (+4 tai)" : "half flush (+2 tai)"
        } stays alive.`
      );
  }

  if (detailed && (verdict === "best" || verdict === "fine") && !foldMode) {
    const why = safetyPhrase(proposed, ctx);
    if (why)
      extras.push(
        why.warning
          ? `Watch it though: ${why.text} — no alternative keeps your shape, so stay alert.`
          : `${capitalize(why.text)}.`
      );
    if (suggest && best.totalLive > me.totalLive + 2)
      extras.push(`Slightly better still: ${suggest}`);
  }
  const text = [lead.trim(), ...extras].filter(Boolean).join(" ");
  return { verdict, text };
}

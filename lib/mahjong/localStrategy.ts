import type { GameState } from "@/types/game";
import type { TileId } from "@/types/tiles";
import type { Verdict } from "@/lib/claude/strategyFeedback";
import { WIND_NAME } from "@/types/tiles";
import {
  countTiles,
  isHonor,
  isSuit,
  rankOf,
  suitOf,
  tileName,
} from "./tiles";

/* ===========================================================================
   Offline strategy coach. A deterministic heuristic that scores every tile in
   the hand and judges the proposed discard against the best available one —
   no API call required. Mirrors the {verdict, text} shape of the AI coach.

   Each tile gets two scores:
     usefulness — how much it helps YOUR hand (pairs, triplets, runs, tai).
     danger     — how risky it is to throw (deal-in potential vs the table).
   The best discard minimises (usefulness + danger). The verdict compares the
   proposed discard to that optimum.
   =========================================================================== */

const DANGER_WEIGHT = 2.5;

interface Scored {
  tile: TileId;
  usefulness: number;
  danger: number;
  score: number;
}

interface Ctx {
  hand: TileId[];
  handCount: Map<TileId, number>;
  seatWind: TileId;
  roundWind: TileId;
  /** copies of each tile visible anywhere (hand + all discards + all melds). */
  visible: Map<TileId, number>;
  /** tiles sitting in opponents' discard piles (genbutsu = safe). */
  oppDiscards: Set<TileId>;
  /** suits an opponent has melded, with the seat label collecting them. */
  oppSuits: { suit: string; label: string; melds: number }[];
  wallRemaining: number;
}

function isValueHonor(tile: TileId, ctx: Ctx): boolean {
  return (
    tile === ctx.seatWind ||
    tile === ctx.roundWind ||
    tile === "zhong" ||
    tile === "fa" ||
    tile === "bai"
  );
}

function usefulness(tile: TileId, ctx: Ctx): number {
  let u = 0;
  const own = ctx.handCount.get(tile) ?? 0;
  if (own >= 3) u += 120;
  else if (own === 2) {
    u += 42;
    if (isValueHonor(tile, ctx)) u += 22;
  }

  if (isSuit(tile)) {
    const suit = suitOf(tile)!;
    const rank = rankOf(tile)!;
    const has = (r: number) => (ctx.handCount.get(`${r}${suit}`) ?? 0) > 0;
    const adj = (has(rank - 1) ? 1 : 0) + (has(rank + 1) ? 1 : 0);
    const gap = (has(rank - 2) ? 1 : 0) + (has(rank + 2) ? 1 : 0);
    u += adj * 13 + gap * 5;
    if (rank >= 4 && rank <= 6) u += 3;
  } else if (isHonor(tile) && own === 1) {
    u += isValueHonor(tile, ctx) ? 9 : 1;
  }
  return u;
}

function danger(tile: TileId, ctx: Ctx): number {
  // Genbutsu: an opponent already discarded it -> they can't ron it.
  if (ctx.oppDiscards.has(tile)) return 0;

  const visible = ctx.visible.get(tile) ?? 0;
  const unseen = Math.max(0, 4 - visible);
  if (unseen === 0) return 0; // every copy accounted for

  let base: number;
  if (isHonor(tile)) {
    base = isValueHonor(tile, ctx) ? 5 : 4;
  } else {
    const rank = rankOf(tile)!;
    if (rank === 1 || rank === 9) base = 5;
    else if (rank === 2 || rank === 8) base = 8;
    else base = 12; // live middle tiles are the most dangerous
  }

  // Fewer unseen copies -> safer (harder for an opponent to be waiting on it).
  let d = base * (unseen / 3);

  // Feeding an opponent's flush / melded suit.
  if (isSuit(tile)) {
    const suit = suitOf(tile)!;
    for (const o of ctx.oppSuits) {
      if (o.suit === suit) d += o.melds >= 2 ? 10 : 6;
    }
  }

  // Late game: live tiles get more dangerous as hands near completion.
  if (ctx.wallRemaining < 20) d *= 1.3;

  return d;
}

function buildContext(state: GameState): Ctx {
  const human = state.players[state.humanIndex];
  const handCount = countTiles(human.hand);

  const visible = new Map<TileId, number>();
  const bump = (t: TileId) => visible.set(t, (visible.get(t) ?? 0) + 1);
  const oppDiscards = new Set<TileId>();
  const oppSuitMap = new Map<string, { label: string; melds: number }>();

  for (const p of state.players) {
    for (const t of p.hand) if (p.isHuman) bump(t);
    for (const t of p.discards) {
      bump(t);
      if (!p.isHuman) oppDiscards.add(t);
    }
    for (const m of p.melds) {
      for (const t of m.tiles) bump(t);
      if (!p.isHuman && isSuit(m.tiles[0])) {
        const suit = suitOf(m.tiles[0])!;
        const label = `${WIND_NAME[p.seatWind]} (${p.name})`;
        const cur = oppSuitMap.get(`${p.index}:${suit}`);
        oppSuitMap.set(`${p.index}:${suit}`, {
          label,
          melds: (cur?.melds ?? 0) + 1,
        });
      }
    }
  }

  const oppSuits = [...oppSuitMap.entries()].map(([key, v]) => ({
    suit: key.split(":")[1],
    label: v.label,
    melds: v.melds,
  }));

  return {
    hand: human.hand,
    handCount,
    seatWind: human.seatWind,
    roundWind: state.roundWind,
    visible,
    oppDiscards,
    oppSuits,
    wallRemaining: state.wall.length,
  };
}

function scoreAll(ctx: Ctx): Map<TileId, Scored> {
  const map = new Map<TileId, Scored>();
  for (const tile of new Set(ctx.hand)) {
    const u = usefulness(tile, ctx);
    const d = danger(tile, ctx);
    map.set(tile, { tile, usefulness: u, danger: d, score: u + d * DANGER_WEIGHT });
  }
  return map;
}

/* ---- Explanation builders ------------------------------------------------- */

function shapeReason(tile: TileId, ctx: Ctx): string {
  const own = ctx.handCount.get(tile) ?? 0;
  const name = tileName(tile);
  if (own >= 3) return `you already hold three ${name} — throwing it breaks a triplet`;
  if (own === 2) {
    return isValueHonor(tile, ctx)
      ? `you hold a pair of ${name}, a step toward a scoring triplet`
      : `you hold a pair of ${name} that could become a triplet`;
  }
  if (isSuit(tile)) {
    const suit = suitOf(tile)!;
    const rank = rankOf(tile)!;
    const has = (r: number) => (ctx.handCount.get(`${r}${suit}`) ?? 0) > 0;
    if (has(rank - 1) || has(rank + 1))
      return `it links with neighbouring ${tileName(tile).split(" ")[1]} tiles for a sequence`;
    if (has(rank - 2) || has(rank + 2))
      return `it has a one-gap partner for a possible sequence`;
    return `it is an isolated tile with no pair or run`;
  }
  if (isValueHonor(tile, ctx))
    return `it is a value honor — pairing it could score tai`;
  return `it is a lone honor with no pair`;
}

function safetyReason(tile: TileId, ctx: Ctx): string {
  const name = tileName(tile);
  if (ctx.oppDiscards.has(tile))
    return `${name} is already in an opponent's discards, so it can't deal in`;
  const visible = ctx.visible.get(tile) ?? 0;
  if (visible >= 3) return `most copies of ${name} are already out, so it's low risk`;
  if (isSuit(tile)) {
    const rank = rankOf(tile)!;
    if (rank >= 3 && rank <= 7)
      return `${name} is a live middle tile and could feed a waiting hand`;
    return `${name} is a terminal and relatively safe to release`;
  }
  return `${name} is a fairly safe tile to release`;
}

function opponentReason(tile: TileId, ctx: Ctx): string | null {
  if (!isSuit(tile)) return null;
  const suit = suitOf(tile)!;
  const hit = ctx.oppSuits.find((o) => o.suit === suit);
  if (!hit) return null;
  const suitWord = tileName(tile).split(" ")[1];
  return `${hit.label} has melded ${suitWord} — feeding that suit is risky`;
}

/* ---- Public API ----------------------------------------------------------- */

export function evaluateDiscardLocal(
  state: GameState,
  proposed: TileId
): { verdict: Verdict; text: string } {
  const ctx = buildContext(state);
  const scores = scoreAll(ctx);
  const me = scores.get(proposed)!;

  const sorted = [...scores.values()].sort((a, b) => a.score - b.score);
  const best = sorted[0];
  const gap = me.score - best.score;
  const detailed = state.rules.feedbackDetail === "detailed";

  // ---- Verdict ----------------------------------------------------------
  let verdict: Verdict;
  const brokeShape = me.usefulness >= 40; // breaking a pair/triplet
  const hasShape = me.usefulness >= 12; // part of a run/connected
  const muchBetterShape = best.usefulness < me.usefulness - 15;
  const proposedDanger = me.danger * DANGER_WEIGHT;
  const saferAltExists =
    best.danger * DANGER_WEIGHT <= proposedDanger - 12 &&
    best.usefulness <= me.usefulness + 6;

  if (best.tile === proposed || gap <= 6) {
    verdict = "good"; // optimal or all-but-tied with it
  } else if (brokeShape && muchBetterShape) {
    verdict = "risky"; // throwing away strong shape
  } else if (proposedDanger >= 25 && saferAltExists) {
    verdict = "risky"; // dangerous with a clearly safer option
  } else if (gap <= 24) {
    verdict = "okay";
  } else {
    // A large gap, but it's neither dangerous nor breaking shape: only "risky"
    // if the tile carries real shape value worth keeping; otherwise it's fine.
    verdict = hasShape ? "risky" : "okay";
  }

  // ---- Explanation ------------------------------------------------------
  const oppR = opponentReason(proposed, ctx);
  const shapeR = shapeReason(proposed, ctx);
  const safeR = safetyReason(proposed, ctx);
  const betterName = best.tile !== proposed ? tileName(best.tile) : null;
  const suggestion = betterName ? `${betterName} is the safer release here` : null;

  let text: string;
  if (verdict === "good") {
    text = detailed
      ? `${capitalize(safeR)}. Also, ${shapeR}, so letting it go costs you little.`
      : `${capitalize(safeR)}.`;
  } else if (verdict === "risky") {
    // Risk is driven by shape, danger, or feeding an opponent — lead with that.
    if (brokeShape || hasShape) {
      const tail = suggestion ? ` ${capitalize(suggestion)}.` : "";
      text = detailed
        ? `${capitalize(shapeR)} — keep it.${tail} Shed a more isolated tile instead.`
        : `${capitalize(shapeR)} — keep it.${tail}`;
    } else {
      const lead = oppR ? capitalize(oppR) : capitalize(safeR);
      const tail = suggestion
        ? ` ${capitalize(suggestion)}.`
        : " A safer tile is the better throw here.";
      text = `${lead}.${tail}`;
    }
  } else {
    // okay
    const lead = hasShape ? capitalize(shapeR) : capitalize(safeR);
    const extra = oppR ? ` ${capitalize(oppR)}.` : "";
    const tail = suggestion ? ` ${capitalize(suggestion)}.` : "";
    text = detailed ? `${lead}.${extra}${tail}` : `${lead}.${tail}`;
  }

  return { verdict, text };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

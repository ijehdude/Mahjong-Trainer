import type { GameState } from "@/types/game";
import type { TileId } from "@/types/tiles";
import type { StrategyRequest } from "@/app/api/strategy/prompt";
import { WIND_NAME } from "@/types/tiles";
import { indexForSeat } from "@/lib/mahjong/gameState";

/* ===========================================================================
   Client helper: build the strategy payload from game state and stream the
   coach's response from /api/strategy.
   =========================================================================== */

export type Verdict = "good" | "risky" | "okay";

export interface StrategyFeedback {
  verdict: Verdict;
  text: string; // explanation with the verdict token stripped
}

/** Map a game state + proposed discard into the API request payload. */
export function buildStrategyRequest(
  state: GameState,
  proposedDiscard: TileId
): StrategyRequest {
  const human = state.players.find((p) => p.isHuman)!;

  const discardsFor = (seat: "left" | "across" | "right" | "self") => {
    const idx = indexForSeat(state, seat);
    return idx === null ? [] : state.players[idx].discards;
  };
  const meldsFor = (seat: "left" | "across" | "right") => {
    const idx = indexForSeat(state, seat);
    return idx === null ? [] : state.players[idx].melds.map((m) => m.tiles);
  };

  return {
    playerHand: human.hand,
    proposedDiscard,
    playerMelds: human.melds.map((m) => m.tiles),
    discardPiles: {
      self: discardsFor("self"),
      left: discardsFor("left"),
      across: discardsFor("across"),
      right: discardsFor("right"),
    },
    visibleMelds: {
      left: meldsFor("left"),
      across: meldsFor("across"),
      right: meldsFor("right"),
    },
    roundWind: WIND_NAME[state.roundWind],
    seatWind: WIND_NAME[human.seatWind],
    wallRemaining: state.wall.length,
    feedbackDetail: state.rules.feedbackDetail,
    rules: {
      minTai: state.rules.minTai,
      flowerTiles: state.rules.flowerTiles,
    },
  };
}

function parseVerdict(raw: string): Verdict {
  const head = raw.trimStart().slice(0, 8).toUpperCase();
  if (head.startsWith("GOOD")) return "good";
  if (head.startsWith("RISKY")) return "risky";
  if (head.startsWith("OKAY")) return "okay";
  return "okay";
}

/** Strip the leading verdict token from the streamed text. */
function stripVerdict(raw: string): string {
  return raw.replace(/^\s*(GOOD|RISKY|OKAY)\b[\s:.\-—]*/i, "").trimStart();
}

/**
 * Stream feedback from the API. Calls `onUpdate` with the running
 * (verdict, partialText) as chunks arrive. Resolves with the final feedback.
 */
export async function streamStrategyFeedback(
  request: StrategyRequest,
  onUpdate: (partial: StrategyFeedback) => void,
  signal?: AbortSignal
): Promise<StrategyFeedback> {
  const res = await fetch("/api/strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.body) {
    const text = await res.text();
    const fb = { verdict: parseVerdict(text), text: stripVerdict(text) };
    onUpdate(fb);
    return fb;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
    onUpdate({ verdict: parseVerdict(raw), text: stripVerdict(raw) });
  }
  return { verdict: parseVerdict(raw), text: stripVerdict(raw) };
}

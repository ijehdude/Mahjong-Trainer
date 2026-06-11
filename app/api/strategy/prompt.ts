import type { GameRules } from "@/types/game";
import type { TileId } from "@/types/tiles";
import { tileName } from "@/lib/mahjong/tiles";

/* ===========================================================================
   Prompt builder for the strategy-feedback endpoint.
   =========================================================================== */

export interface StrategyRequest {
  playerHand: TileId[];
  proposedDiscard: TileId;
  playerMelds: TileId[][];
  discardPiles: {
    self: TileId[];
    left: TileId[];
    across: TileId[];
    right: TileId[];
  };
  visibleMelds: {
    left: TileId[][];
    across: TileId[][];
    right: TileId[][];
  };
  roundWind: string;
  seatWind: string;
  wallRemaining: number;
  feedbackDetail: "brief" | "detailed";
  rules: Pick<GameRules, "minTai" | "flowerTiles">;
}

export const SYSTEM_PROMPT = `You are a Singapore Mahjong strategy coach. Analyze the player's hand and proposed discard.

Begin your reply with EXACTLY ONE verdict token on its own line, chosen from:
BEST — optimal or tied-optimal discard.
FINE — keeps the hand at the same speed; waits or value only slightly worse than the best choice.
RISKY — speeds the hand up but feeds danger, OR is safe but slows the hand down (state which one).
MISTAKE — breaks a set, kills the hand's tai, or feeds an obvious opponent hand.
Most discards in real play are not clearly good or bad — use FINE and RISKY frequently; do NOT stamp everything BEST. Whenever a slightly better discard existed, name it and why in one short clause (e.g. "Fine, but 8万 was one wait wider.").

After the token, write 2–4 SHORT lines, plain text only (no markdown, no bullets):

LINE 1 — verdict + hand impact, in plain language with no jargon. State concretely what this discard does to the hand, naming the tiles and shapes involved. Good example: "Good discard — 5筒 doesn't connect to anything. You're building 2-3-4万 and a bamboo run." Bad-move example: "Keep this — 5筒 links your 4筒 and 6筒. Throwing it breaks a near-complete set."

LINE 2 — what you're waiting for: name the specific useful tiles, never just a count, e.g. "Draw a 6条 or 9条 next and you'll be ready (听牌) — waiting to win." Count remaining copies against the visible discards and melds, e.g. "Useful next draws: 6条 ×3 left, 9条 ×4 left." — this teaches the player to count tiles.

LINE 3 — safety note, ONLY when relevant; omit this line entirely when the tile is clearly safe and nothing notable is happening. Danger example: "⚠ 5筒 is risky — North has ponged 筒 twice and is collecting circles." Notable-safe example: "Safe — three 5筒 are already discarded, nobody can pong it."

Jargon policy: the first time a term appears in your reply, gloss it in plain language — "ready (听牌 — one tile from winning)" — then use the term alone. NEVER use Japanese terms like "shanten" or "tenpai"; use Singapore-friendly phrasing such as "X tiles from ready".

Tai awareness: when relevant, state the tai consequence of the current hand shape, e.g. "Note: winning this shape is choupinghu with 0 tai — you'll need your flower bonus to make it a valid win." A complete hand below the minimum tai cannot win.

Table facts: count copies already visible in discards/melds. There is NO furiten rule — a player CAN win on a tile they discarded earlier; prior discards make a tile safer, never fully safe. House scoring: fully concealed (men qing) +1 tai counts ONLY on a self-drawn win — a concealed hand may still Hu on a discard, it just doesn't get the men qing tai, so the completed hand must reach the minimum tai on its own merits (tai created by the winning tile itself count, e.g. a discard completing a dragon triplet). Self-draw itself adds no tai (its reward is that all players pay).

Do not repeat the proposed tile's name as the very first word after the verdict token.`;

const BRIEF_HINT =
  "Keep it to 2 lines (hand impact + what you're waiting for); add the safety line only on a real read. Be terse and decisive.";
const DETAILED_HINT =
  "Use up to 4 short lines: hand impact, the tiles you're waiting for with live counts, a safety note when relevant, and a tai note when relevant.";

function names(ids: TileId[]): string {
  return ids.length ? ids.map(tileName).join(", ") : "(none)";
}

function meldList(melds: TileId[][]): string {
  if (!melds.length) return "(none)";
  return melds.map((m) => `[${m.map(tileName).join(" ")}]`).join("  ");
}

export function buildUserPrompt(req: StrategyRequest): string {
  const lines: string[] = [];
  lines.push(
    `Player seat wind: ${req.seatWind}. Round wind: ${req.roundWind}. Tiles left in wall: ${req.wallRemaining}.`
  );
  lines.push(
    `Rules: minimum ${req.rules.minTai} tai to win; flower tiles ${
      req.rules.flowerTiles ? "ON" : "OFF"
    }.`
  );
  lines.push("");
  lines.push(`PLAYER HAND (${req.playerHand.length} tiles): ${names(req.playerHand)}`);
  if (req.playerMelds.length)
    lines.push(`Your declared melds: ${meldList(req.playerMelds)}`);
  lines.push("");
  lines.push(`PROPOSED DISCARD: ${tileName(req.proposedDiscard)}`);
  lines.push("");
  lines.push("DISCARD PILES (what's already out — safe-tile reads):");
  lines.push(`  You: ${names(req.discardPiles.self)}`);
  lines.push(`  Left opponent (plays before you): ${names(req.discardPiles.left)}`);
  if (req.discardPiles.across.length || req.visibleMelds.across.length)
    lines.push(`  Across opponent: ${names(req.discardPiles.across)}`);
  lines.push(`  Right opponent (plays after you): ${names(req.discardPiles.right)}`);
  lines.push("");
  lines.push("OPPONENT VISIBLE MELDS (suits/honors they're collecting):");
  lines.push(`  Left: ${meldList(req.visibleMelds.left)}`);
  lines.push(`  Across: ${meldList(req.visibleMelds.across)}`);
  lines.push(`  Right: ${meldList(req.visibleMelds.right)}`);
  lines.push("");
  lines.push(
    req.feedbackDetail === "detailed" ? DETAILED_HINT : BRIEF_HINT
  );
  return lines.join("\n");
}

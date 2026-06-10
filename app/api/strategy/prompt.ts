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
Give a SHORT, direct verdict. Focus on: tile safety (how many copies are already visible in discards/melds — note there is NO furiten rule, so a player CAN win on a tile they discarded earlier; prior discards make a tile safer, never fully safe), hand shape (the sequences/triplets and pairs being built, and how close the hand is to ready), opponents' visible melds (which suits or honors to avoid feeding), and tai potential (does keeping/discarding help reach the minimum tai? A complete hand below the minimum tai cannot win).
House scoring rules: fully concealed (men qing) +1 tai counts ONLY on a self-drawn win — a concealed hand may still Hu on a discard, it just doesn't get the men qing tai, so the completed hand must reach the minimum tai on its own merits (tai created by the winning tile itself count, e.g. a discard completing a dragon triplet). Self-draw itself adds no tai (its reward is that all players pay).

Always begin your reply with EXACTLY ONE verdict token on its own, chosen from:
GOOD — the discard is optimal or clearly fine.
RISKY — the player should probably keep this tile; discarding is dangerous or wastes shape.
OKAY — reasonable but situational; there may be a better choice.

After the verdict token, continue with the explanation. Do not repeat the proposed tile's name as the very first word of the explanation. Be specific about the concrete reason (name the tiles, the shape, or the opponent meld). Respond in plain text only — no markdown, no bullet points, no headers.`;

const BRIEF_HINT =
  "Keep the explanation to 1–2 sentences. Be terse and decisive.";
const DETAILED_HINT =
  "Give 3–4 sentences: state the verdict reason, the hand shape you see, the main safety/danger read from the table, and one concrete suggestion for what to build toward.";

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

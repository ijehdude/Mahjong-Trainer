import { createGame } from "@/lib/mahjong/gameState";
import { evaluateDiscardLocal } from "@/lib/mahjong/localStrategy";
import { DEFAULT_RULES } from "@/types/game";
import type { GameState, Meld } from "@/types/game";
import type { TileId } from "@/types/tiles";

/* Throwaway eyeball harness: force specific hands/table states and print the
   coach's feedback for chosen discards. */

function scenario(
  label: string,
  mutate: (s: GameState) => void,
  proposals: TileId[],
  detail: "brief" | "detailed" = "brief"
) {
  const s = createGame({ ...DEFAULT_RULES, feedbackDetail: detail });
  const me = s.players[s.humanIndex];
  me.melds = [];
  me.flowers = [];
  me.discards = [];
  s.phase = "player-choose";
  s.canSelfDrawWin = false;
  mutate(s);
  console.log(`\n=== ${label} (hand: ${s.players[s.humanIndex].hand.join(" ")})`);
  for (const p of proposals) {
    const fb = evaluateDiscardLocal(s, p);
    console.log(`  discard ${p.padEnd(6)} -> [${fb.verdict.toUpperCase()}] ${fb.text}`);
  }
}

const chi = (a: TileId, b: TileId, c: TileId): Meld => ({ type: "chi", tiles: [a, b, c] });
const pong = (t: TileId): Meld => ({ type: "pong", tiles: [t, t, t] });

// 1. Tenpai: 123wan 456wan 789wan 12tong 55bam — waiting on 3tong.
scenario(
  "tenpai, don't break it",
  (s) => {
    s.players[s.humanIndex].hand = [
      "1wan","2wan","3wan","4wan","5wan","6wan","7wan","8wan","9wan",
      "1tong","2tong","5bam","5bam","9bam",
    ];
  },
  ["9bam", "2tong", "5bam"]
);

// 2. Dead pair: pair of 7wan with both other copies visible in discards.
scenario(
  "dead pair is a fine discard",
  (s) => {
    s.players[s.humanIndex].hand = [
      "1wan","2wan","3wan","4wan","5wan","6wan","7tong","8tong","9tong",
      "2bam","3bam","7wan","7wan","east",
    ];
    const opp = s.players.find((p) => !p.isHuman)!;
    opp.discards.push("7wan", "7wan");
  },
  ["7wan", "east", "2bam"],
  "detailed"
);

// 3. Chicken hand: chi + pong melded, zero tai sources left.
scenario(
  "chicken hand warning",
  (s) => {
    const me = s.players[s.humanIndex];
    me.melds = [chi("1tong", "2tong", "3tong"), pong("5bam")];
    me.hand = ["2wan","3wan","4wan","6wan","7wan","3tong","4tong","9bam"];
  },
  ["9bam"]
);

// 4. Only tai source is a dragon pair.
scenario(
  "discarding the only tai source",
  (s) => {
    const me = s.players[s.humanIndex];
    me.melds = [chi("1tong", "2tong", "3tong"), pong("5bam")];
    me.hand = ["2wan","3wan","4wan","6wan","7wan","zhong","zhong","9bam"];
  },
  ["zhong", "9bam"]
);

// 5. Flush lean: mostly bamboo + honors, detailed mode.
scenario(
  "half-flush direction",
  (s) => {
    s.players[s.humanIndex].hand = [
      "1bam","2bam","3bam","4bam","5bam","6bam","7bam","8bam","8bam",
      "east","east","9tong","5wan","2bam",
    ];
  },
  ["9tong", "8bam"],
  "detailed"
);

// 6. Feeding an opponent's visible flush.
scenario(
  "feeding a melded suit",
  (s) => {
    const me = s.players[s.humanIndex];
    me.hand = [
      "1wan","2wan","3wan","4wan","5wan","6wan","7tong","8tong","9tong",
      "2bam","6bam","east","east","9bam",
    ];
    const opp = s.players.find((p) => !p.isHuman)!;
    opp.melds = [chi("3bam", "4bam", "5bam"), pong("7bam")];
    s.wall.length = 20;
  },
  ["6bam", "9bam", "2bam"],
  "detailed"
);

// 7. Fold mode: hopeless hand, wall nearly empty.
scenario(
  "fold mode late game",
  (s) => {
    s.players[s.humanIndex].hand = [
      "1wan","4wan","9wan","2tong","5tong","9tong","1bam","5bam","9bam",
      "east","west","zhong","fa","north",
    ];
    s.wall.length = 10;
    const opp = s.players.find((p) => !p.isHuman)!;
    opp.melds = [pong("6tong"), chi("1tong", "2tong", "3tong")];
    opp.discards.push("north", "1wan");
  },
  ["north", "5tong", "fa"]
);

// 8b. Wait quality (user-reported): 678wan + 2,3,3,5,5 bam, two chi melds, cat.
// Discarding 3bam -> two-sided 1/4 bam wait, keeps chou ping hu (2 tai with cat).
// Discarding 2bam -> 3/5 bam shanpon, triplet win kills ping hu (1 tai).
scenario(
  "wait quality: two-sided vs shanpon",
  (s) => {
    const me = s.players[s.humanIndex];
    me.melds = [chi("6bam", "7bam", "8bam"), chi("3wan", "4wan", "5wan")];
    me.flowers = ["cat"];
    me.hand = ["6wan","7wan","8wan","2bam","3bam","3bam","5bam","5bam"];
    s.wall.length = 59;
  },
  ["3bam", "2bam", "5bam"]
);

// 8. Fei wildcard discard.
scenario(
  "never throw the fei",
  (s) => {
    s.players[s.humanIndex].hand = [
      "1wan","2wan","3wan","4wan","5wan","6wan","7tong","8tong","9tong",
      "2bam","3bam","east","fei","9bam",
    ];
  },
  ["fei", "east"]
);

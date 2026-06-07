import {
  advance,
  createGame,
  humanDiscard,
  humanPass,
  startNextHand,
} from "@/lib/mahjong/gameState";
import { DEFAULT_RULES } from "@/types/game";
import type { GameState } from "@/types/game";
import { sortTiles } from "@/lib/mahjong/tiles";

/* Headless driver: human always discards its first sorted tile, passes claims,
   and starts the next hand. Validates the engine never throws or hangs. */

function run(seedLabel: string, rulesOverride = {}) {
  let s: GameState = createGame({ ...DEFAULT_RULES, ...rulesOverride });
  let steps = 0;
  let hands = 0;
  let wins = 0;
  let washouts = 0;
  const MAX_STEPS = 200000;

  while (steps < MAX_STEPS) {
    steps++;
    switch (s.phase) {
      case "await-draw":
      case "await-discard":
      case "await-claims":
      case "bonus-reveal":
        s = advance(s);
        break;
      case "player-choose": {
        const human = s.players.find((p) => p.isHuman)!;
        const tile = sortTiles(human.hand)[0];
        s = humanDiscard(s, tile);
        break;
      }
      case "player-claim":
        s = humanPass(s);
        break;
      case "hand-over":
        hands++;
        if (s.result) wins++;
        else washouts++;
        if (hands >= 40) {
          console.log(
            `[${seedLabel}] ok — ${hands} hands, ${wins} wins, ${washouts} washouts, ${steps} steps`
          );
          // sanity: payments net to ~0
          if (s.result) {
            const net = s.result.payments.reduce((a, b) => a + b, 0);
            if (Math.abs(net) > 0.001)
              throw new Error(`payments don't net to zero: ${net}`);
          }
          return;
        }
        s = startNextHand(s);
        break;
    }
  }
  throw new Error(`[${seedLabel}] did not terminate within ${MAX_STEPS} steps`);
}

run("4P default");
run("4P no-flowers min2", { flowerTiles: false, minTai: 2 });
run("4P robbing-kong off", { robbingKong: false });
run("4P no-cap", { limitHandCap: false });
run("3P", { players: 3 });
run("2P", { players: 2 });
console.log("ALL SMOKE TESTS PASSED");

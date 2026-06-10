import { ALL_TILE_TYPES, shanten, ukeire } from "@/lib/mahjong/shanten";
import { getWaits, isWinningHand } from "@/lib/mahjong/handValidator";
import type { TileId } from "@/types/tiles";

/* Validates the shanten engine against the existing hand validator:
   - fixed hands with known shanten values
   - random hands: shanten === -1  ⇔  isWinningHand (14 tiles)
   -               shanten === 0   ⇔  getWaits non-empty (13 tiles)
   -               at shanten 0 the improvement set equals the wait set     */

let failures = 0;

function expect(label: string, actual: number, want: number) {
  if (actual !== want) {
    failures++;
    console.error(`FAIL ${label}: got ${actual}, want ${want}`);
  }
}

// ---- Fixed cases ----------------------------------------------------------
expect(
  "complete standard",
  shanten(
    ["1wan","2wan","3wan","4wan","5wan","6wan","7wan","8wan","9wan","1tong","2tong","3tong","5bam","5bam"],
    0
  ),
  -1
);
expect(
  "tenpai closed wait",
  shanten(
    ["1wan","2wan","3wan","4wan","5wan","6wan","7wan","8wan","9wan","1tong","2tong","5bam","5bam"],
    0
  ),
  0
);
expect(
  "disconnected 13 (orphan-ish)",
  shanten(
    ["1wan","4wan","7wan","1tong","4tong","7tong","1bam","4bam","7bam","east","south","west","north"],
    0
  ),
  6
);
expect(
  "seven pairs: six pairs + single",
  shanten(
    ["1wan","1wan","3wan","3wan","5tong","5tong","7tong","7tong","9bam","9bam","east","east","zhong"],
    0
  ),
  0
);
expect(
  "joker completes the pair",
  shanten(
    ["1wan","2wan","3wan","4wan","5wan","6wan","7wan","8wan","9wan","5tong","5tong","9bam","fei"],
    0
  ),
  0
);
expect(
  "two melds, two-sided wait",
  shanten(["5wan","5wan","6tong","7tong","8tong","2bam","3bam","9bam"], 2),
  0
);
expect(
  "complete with melds",
  shanten(["5wan","5wan","6tong","7tong","8tong","2bam","3bam","4bam"], 2),
  -1
);

// joker-heavy: 4 sets done, lone fei must pair up => tenpai on anything
const feiTanki: TileId[] = [
  "1wan","2wan","3wan","4wan","5wan","6wan","7wan","8wan","9wan","1tong","1tong","1tong","fei",
];
expect("fei tanki", shanten(feiTanki, 0), 0);
{
  const u = ukeire(feiTanki, 0, () => 4);
  if (u.improvements.length !== 34) {
    failures++;
    console.error(`FAIL fei tanki ukeire: ${u.improvements.length} improvements, want 34`);
  }
}

// ---- Randomised cross-check against the validator --------------------------
function buildDeck(withFei: boolean): TileId[] {
  const deck: TileId[] = [];
  for (const t of ALL_TILE_TYPES) deck.push(t, t, t, t);
  if (withFei) deck.push("fei", "fei", "fei", "fei");
  return deck;
}

let rngState = 12345;
function rng(): number {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}

function drawHand(deck: TileId[], n: number): TileId[] {
  const pool = [...deck];
  const hand: TileId[] = [];
  for (let i = 0; i < n; i++) {
    const j = Math.floor(rng() * pool.length);
    hand.push(pool.splice(j, 1)[0]);
  }
  return hand;
}

/** Bias some hands toward completion so the win branch actually gets hit. */
function nearWinHand(deck: TileId[]): TileId[] {
  const hand: TileId[] = [];
  const pool = [...deck];
  while (hand.length < 12) {
    const j = Math.floor(rng() * pool.length);
    const t = pool[j];
    // grab runs/triplets greedily
    const triplet = pool.filter((x) => x === t).slice(0, 3);
    if (triplet.length === 3 && hand.length <= 9) {
      for (const x of triplet) pool.splice(pool.indexOf(x), 1);
      hand.push(...triplet);
    } else {
      pool.splice(j, 1);
      hand.push(t);
    }
  }
  while (hand.length < 14) {
    const j = Math.floor(rng() * pool.length);
    hand.push(pool.splice(j, 1)[0]);
  }
  return hand;
}

const ITER = 1500;
for (const withFei of [false, true]) {
  const deck = buildDeck(withFei);
  for (let i = 0; i < ITER; i++) {
    // 14-tile: win check
    const h14 = i % 3 === 0 ? nearWinHand(deck) : drawHand(deck, 14);
    const sh14 = shanten(h14, 0);
    const win = isWinningHand(h14, []);
    if ((sh14 === -1) !== win) {
      failures++;
      console.error(
        `FAIL win mismatch (fei=${withFei}): shanten=${sh14} isWinningHand=${win} hand=${h14.join(",")}`
      );
    }

    // 13-tile: tenpai + waits check
    const h13 = drawHand(deck, 13);
    const sh13 = shanten(h13, 0);
    const waits = getWaits(h13, []);
    if ((sh13 === 0) !== (waits.length > 0)) {
      failures++;
      console.error(
        `FAIL tenpai mismatch (fei=${withFei}): shanten=${sh13} waits=${waits.length} hand=${h13.join(",")}`
      );
    }
    if (sh13 === 0) {
      const imp = ukeire(h13, 0, () => 1).improvements.map((x) => x.tile).sort();
      const ws = [...waits].sort();
      if (imp.join("|") !== ws.join("|")) {
        failures++;
        console.error(
          `FAIL waits mismatch (fei=${withFei}): ukeire=${imp.join(",")} getWaits=${ws.join(",")} hand=${h13.join(",")}`
        );
      }
    }
  }
}

// ---- Timing sanity ---------------------------------------------------------
const deck = buildDeck(true);
const hands: TileId[][] = Array.from({ length: 50 }, () => drawHand(deck, 14));
const t0 = performance.now();
for (const h of hands) {
  for (const t of new Set(h)) {
    const rest = [...h];
    rest.splice(rest.indexOf(t), 1);
    ukeire(rest, 0, () => 4);
  }
}
const ms = performance.now() - t0;
console.log(
  `timing: 50 full discard evaluations in ${ms.toFixed(0)}ms (${(ms / 50).toFixed(1)}ms each)`
);

if (failures > 0) {
  console.error(`${failures} FAILURES`);
  process.exit(1);
}
console.log("ALL SHANTEN TESTS PASSED");

# Singapore Mahjong Strategy Trainer

A web-based trainer that teaches Singapore Mahjong through real-time strategy
coaching. You play against bots from a **randomly assigned seat** each game (East,
South, West, or North — you may even be the dealer); every time you pre-select a
tile to discard, a strategy coach gives a verdict and explanation **before** you
commit — the learning moment.

The coach has two interchangeable engines, chosen on the setup screen:

- **Local (offline)** — a deterministic heuristic that runs entirely in the
  browser. **No API key, no network, no cost.** This is the default.
- **AI (Claude)** — streams richer, table-aware advice from the Anthropic API
  via a server-side route. Optional; needs a key.

Tiles are drawn as crisp SVG faces (traditional dot patterns for Circles,
segmented bamboo with the 1-bamboo bird, numeral + 萬 Characters, and proper
honor/flower/season faces) — no images, so they stay sharp at any size.

Built with Next.js (App Router) + TypeScript + Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev   # http://localhost:3000 — works fully offline with the Local coach
```

That's it — the **Local** coach needs no configuration. To use the **AI** coach,
copy `.env.example` to `.env.local`, set `ANTHROPIC_API_KEY`, and pick "AI (Claude)"
on the setup screen. Optionally override the model with `ANTHROPIC_MODEL` (defaults
to `claude-sonnet-4-6`). The key is read server-side only and never reaches the
client; if AI is selected without a key, the route returns a safe fallback tip.

## How it plays

1. **Setup screen** (`/`) — choose players (2P/3P/4P), flower/season rules &
   payout, minimum tai, payout rate, starting stack, special rules, and feedback
   detail. Tap **Deal Me In**.
2. **Game screen** (`/game`) — the felt table shows all discard pools, opponents'
   melds, the wall count, and your hand. On your turn you draw, then **tap a tile**
   to pre-select it. The Strategy Panel slides up with a ✓ / ✗ / ~ verdict from the
   selected coach. Confirm with **Discard**, or pick a different tile. Claim windows
   (Pong / Kong / Chi / Win) appear when available.
3. **Hand result** — winning hand, tai breakdown, payment, running P&L, and a
   verdict on your last discard. **Next Hand** to continue.

## Architecture

```
app/
  page.tsx                 Setup / landing screen
  game/page.tsx            Game screen — engine loop + feedback streaming
  api/strategy/route.ts    Claude streaming endpoint (server-side)
  api/strategy/prompt.ts   System + user prompt builder
components/
  setup/                   SegmentedControl, ToggleRow, SettingsCard
  game/                    GameTable, PlayerHand, TileComponent, DiscardPool,
                           MeldedSets, StrategyPanel, ActionButtons, ScoreHeader,
                           HandResult, StrategyGuide
  shared/                  Button, Toggle
lib/
  mahjong/                 tiles, deck, handValidator, taiCalculator, botAI,
                           gameState (pure engine + state machine),
                           localStrategy (offline heuristic coach)
  claude/                  strategyFeedback (client payload + streaming)
types/                     tiles.ts, game.ts
scripts/smoke.ts           Headless engine driver (npx tsx scripts/smoke.ts)
```

### Offline coach

`lib/mahjong/localStrategy.ts` scores every tile in the hand on two axes —
**usefulness** (pairs, triplets, runs, tai-bearing honors) and **danger**
(deal-in risk read from the discards, opponents' melded suits, and how many
copies are still unseen). The best discard minimises `usefulness + danger`, and
the proposed tile is judged against that optimum to produce the ✓/✗/~ verdict and
a plain-language reason. It is pure and synchronous — no network involved.

The engine in `lib/mahjong/gameState.ts` is a set of pure transition functions
driven by a small state machine (`await-draw → player-choose / await-claims → …`).
The React page advances bot/claim phases on a timer and waits for input on human
phases. `npx tsx scripts/smoke.ts` plays 160 headless hands across rule variants
to guard against crashes and verify payments net to zero.

## Implemented

- All 42 tile types rendered as CSS components (no images/emoji)
- Deal → draw → discard → bot turns loop, flower reveal + replacement draws
- Pong / Kong / Chi claims (human + bot pong), self-draw & ron wins
- Winning-hand validation, Singapore tai scoring, minimum-tai gating, payments
- Two coach engines: offline heuristic (default) and streaming Claude (optional,
  with prompt caching), both producing ✓/✗/~ verdicts
- Stack / P&L / discard-accuracy tracking, hand-result overlay, strategy guide

## Deploy

Push to GitHub and import into Vercel. No environment variables are required for
the Local coach. To enable the AI coach, set `ANTHROPIC_API_KEY` (and optionally
`ANTHROPIC_MODEL`) in the Vercel project's environment variables.

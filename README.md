# Singapore Mahjong Strategy Trainer

A web-based trainer that teaches Singapore Mahjong through real-time, AI-powered
coaching. You play the South seat against three bots; every time you pre-select a
tile to discard, a Claude-powered strategy coach streams a verdict and explanation
**before** you commit — the learning moment.

Built with Next.js (App Router) + TypeScript + Tailwind CSS v4. AI feedback runs
through a server-side route so the API key is never exposed to the client.

## Getting started

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

The app works **without** an API key — the strategy panel falls back to a static
tip — but live coaching needs `ANTHROPIC_API_KEY` set. Optionally override the
model with `ANTHROPIC_MODEL` (defaults to `claude-sonnet-4-6`).

## How it plays

1. **Setup screen** (`/`) — choose players (2P/3P/4P), flower/season rules &
   payout, minimum tai, payout rate, starting stack, special rules, and feedback
   detail. Tap **Deal Me In**.
2. **Game screen** (`/game`) — the felt table shows all discard pools, opponents'
   melds, the wall count, and your hand. On your turn you draw, then **tap a tile**
   to pre-select it. The Strategy Panel slides up with a ✓ / ✗ / ~ verdict streamed
   from Claude. Confirm with **Discard**, or pick a different tile. Claim windows
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
                           gameState (pure engine + state machine)
  claude/                  strategyFeedback (client payload + streaming)
types/                     tiles.ts, game.ts
scripts/smoke.ts           Headless engine driver (npx tsx scripts/smoke.ts)
```

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
- Streaming Claude strategy feedback with ✓/✗/~ verdicts and prompt caching
- Stack / P&L / discard-accuracy tracking, hand-result overlay, strategy guide

## Deploy

Push to GitHub and import into Vercel. Set `ANTHROPIC_API_KEY` (and optionally
`ANTHROPIC_MODEL`) in the Vercel project's environment variables.

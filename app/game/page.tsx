"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChiOption, GameRules, GameState, KongOption } from "@/types/game";
import type { TileId } from "@/types/tiles";
import { DEFAULT_RULES } from "@/types/game";
import { RULES_STORAGE_KEY } from "@/lib/storage";
import {
  advance,
  createGame,
  humanClaim,
  humanDeclareWin,
  humanDiscard,
  humanKong,
  humanPass,
  recordDiscardAccuracy,
  startNextHand,
} from "@/lib/mahjong/gameState";
import {
  buildStrategyRequest,
  streamStrategyFeedback,
  type Verdict,
} from "@/lib/claude/strategyFeedback";
import { evaluateDiscardLocal } from "@/lib/mahjong/localStrategy";
import { taiHintFor } from "@/lib/mahjong/taiCalculator";
import { tileName } from "@/lib/mahjong/tiles";
import ScoreHeader from "@/components/game/ScoreHeader";
import GameTable from "@/components/game/GameTable";
import PlayerHand from "@/components/game/PlayerHand";
import StrategyPanel from "@/components/game/StrategyPanel";
import ActionButtons from "@/components/game/ActionButtons";
import HandResult from "@/components/game/HandResult";
import SeatCeremony from "@/components/game/SeatCeremony";

interface Feedback {
  loading: boolean;
  verdict: Verdict | null;
  text: string;
}

const EMPTY_FEEDBACK: Feedback = { loading: false, verdict: null, text: "" };

export default function GamePage() {
  const router = useRouter();
  const [rules, setRules] = useState<GameRules>(DEFAULT_RULES);
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<TileId | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(EMPTY_FEEDBACK);
  const [lastDiscardFeedback, setLastDiscardFeedback] = useState<{
    tile: TileId;
    verdict: Verdict | null;
    text: string;
  } | null>(null);
  const [taiHint, setTaiHint] = useState(true);
  // Show the dice-roll seat ceremony before each new game.
  const [ceremony, setCeremony] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  // ---- Bootstrap: load rules (game is created after the seat ceremony) ----
  useEffect(() => {
    let loaded = DEFAULT_RULES;
    try {
      const raw = sessionStorage.getItem(RULES_STORAGE_KEY);
      if (raw) loaded = { ...DEFAULT_RULES, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    setRules(loaded);
  }, []);

  // Called by the ceremony once the player's seat is drawn.
  const handleSeated = (seatIndex: number) => {
    setState(createGame(rules, seatIndex));
    setCeremony(false);
  };

  // ---- Engine driver: auto-advance bot/claim phases ---------------------
  useEffect(() => {
    if (!state) return;
    const auto =
      state.phase === "await-draw" ||
      state.phase === "await-discard" ||
      state.phase === "await-claims" ||
      state.phase === "bonus-reveal";
    if (!auto) return;

    const isHumanDraw =
      state.phase === "await-draw" && state.players[state.turnIndex].isHuman;
    const delay =
      state.phase === "bonus-reveal"
        ? 750 // let the bonus tile show in hand before it moves to the table
        : state.phase === "await-claims"
          ? 650
          : isHumanDraw
            ? 320
            : 600;

    const id = setTimeout(() => {
      setState((s) => (s ? advance(s) : s));
    }, delay);
    return () => clearTimeout(id);
  }, [state]);

  // ---- Strategy feedback on pre-select (local = instant, AI = streamed) --
  useEffect(() => {
    if (!state || state.phase !== "player-choose" || !selected) {
      return;
    }

    // Offline heuristic coach — synchronous, no network.
    if (rules.coachEngine === "local") {
      const fb = evaluateDiscardLocal(state, selected);
      setFeedback({ loading: false, verdict: fb.verdict, text: fb.text });
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setFeedback({ loading: true, verdict: null, text: "" });

    const request = buildStrategyRequest(state, selected);
    streamStrategyFeedback(
      request,
      (partial) =>
        setFeedback({
          loading: true,
          verdict: partial.verdict,
          text: partial.text,
        }),
      controller.signal
    )
      .then((fb) =>
        setFeedback({ loading: false, verdict: fb.verdict, text: fb.text })
      )
      .catch(() => {
        /* aborted or failed */
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, state?.phase]);

  if (ceremony) {
    return <SeatCeremony rules={rules} onSeated={handleSeated} />;
  }

  if (!state) {
    return (
      <main className="felt-glow flex min-h-dvh items-center justify-center bg-[var(--bg-felt)]">
        <span className="animate-pulse text-sm uppercase tracking-widest text-[var(--text-muted)]">
          Shuffling tiles…
        </span>
      </main>
    );
  }

  const human = state.players.find((p) => p.isHuman)!;

  // ---- Handlers ---------------------------------------------------------
  const handleSelect = (tile: TileId) => {
    if (state.phase !== "player-choose") return;
    setSelected((cur) => (cur === tile ? null : tile));
    if (selected === tile) setFeedback(EMPTY_FEEDBACK);
  };

  const handleDiscard = () => {
    if (!selected) return;
    abortRef.current?.abort();
    // "risky" counts as a wrong discard; "good"/"okay" count as correct.
    const wasCorrect = feedback.verdict !== "risky";
    setLastDiscardFeedback({
      tile: selected,
      verdict: feedback.verdict,
      text: feedback.text,
    });
    let next = recordDiscardAccuracy(state, wasCorrect);
    next = humanDiscard(next, selected);
    setSelected(null);
    setFeedback(EMPTY_FEEDBACK);
    setState(next);
  };

  const handleWin = () => {
    abortRef.current?.abort();
    setSelected(null);
    setFeedback(EMPTY_FEEDBACK);
    setState(humanDeclareWin(state));
  };

  const handleClaim = (type: "pong" | "kong" | "chi", chi?: ChiOption) => {
    setSelected(null);
    setFeedback(EMPTY_FEEDBACK);
    setState(humanClaim(state, type, chi?.tiles));
  };

  const handleSelfKong = (opt: KongOption) => {
    abortRef.current?.abort();
    setSelected(null);
    setFeedback(EMPTY_FEEDBACK);
    setState(humanKong(state, opt));
  };

  const handlePass = () => setState(humanPass(state));

  const handleNextHand = () => {
    setLastDiscardFeedback(null);
    setSelected(null);
    setFeedback(EMPTY_FEEDBACK);
    setState(startNextHand(state));
  };

  const handleRestart = () => {
    // New game → re-roll for seats via the ceremony.
    abortRef.current?.abort();
    setLastDiscardFeedback(null);
    setSelected(null);
    setFeedback(EMPTY_FEEDBACK);
    setState(null);
    setCeremony(true);
  };

  const handleHome = () => router.push("/");

  // ---- Bottom area state ------------------------------------------------
  const isPlayerChoose = state.phase === "player-choose";
  const isPlayerClaim = state.phase === "player-claim";
  const waitingLabel =
    state.phase === "await-claims"
      ? "结算中… Resolving…"
      : !state.players[state.turnIndex]?.isHuman
        ? `${state.players[state.turnIndex]?.name} 思考中… thinking`
        : "轮到你了 Your turn";

  return (
    <main className="flex h-dvh flex-col bg-[var(--bg-felt)]">
      <ScoreHeader
        stack={human.stack}
        pnl={state.pnl}
        correct={state.correctDiscards}
        total={state.totalDiscards}
        wall={state.wall.length}
        roundWind={state.roundWind}
        seatWind={human.seatWind}
        handNumber={state.handNumber}
        taiHint={taiHint}
        onToggleTaiHint={() => setTaiHint((t) => !t)}
        onHome={handleHome}
        onRestart={handleRestart}
      />

      {/* Table — fills the space between header and hand, no scrolling */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2">
        <GameTable state={state} />
      </div>

      {/* Bottom: feedback + actions + hand */}
      <div className="sticky bottom-0 z-20 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(15,30,23,0.96)] px-3 pb-4 pt-3 backdrop-blur-md">
        {/* Strategy feedback panel (pre-select) */}
        {isPlayerChoose && selected && (
          <div className="mb-3">
            <StrategyPanel
              proposedDiscard={selected}
              loading={feedback.loading}
              verdict={feedback.verdict}
              text={feedback.text}
            />
          </div>
        )}

        {/* Claim prompt */}
        {isPlayerClaim && state.claim && (
          <div className="mb-3 rounded-2xl border border-[var(--accent-gold)] bg-[var(--bg-surface)]/95 px-4 py-3">
            <span className="text-sm font-semibold text-[var(--accent-gold)]">
              {state.claim.robKong
                ? `${state.players[state.claim.discarderIndex].name} 加杠 ${tileName(
                    state.claim.discardTile
                  )} — 抢杠胡？(Rob the kong?)`
                : `${state.players[state.claim.discarderIndex].name} 打出 ${tileName(
                    state.claim.discardTile
                  )} — 要吗？(claim?)`}
            </span>
          </div>
        )}

        {/* Action buttons */}
        {isPlayerChoose && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[11px] tracking-wider text-[var(--text-muted)]">
              {selected
                ? `打出 ${tileName(selected)}?`
                : "点击牌张预选 Tap a tile"}
            </span>
            <ActionButtons
              mode="discard"
              canDiscard={!!selected}
              canWin={state.canSelfDrawWin}
              selfKongOptions={state.kongOptions}
              onDiscard={handleDiscard}
              onWin={handleWin}
              onSelfKong={handleSelfKong}
            />
          </div>
        )}

        {isPlayerClaim && state.claim && (
          <div className="mb-3">
            <ActionButtons
              mode="claim"
              canWin={state.claim.canWin}
              canPong={state.claim.canPong}
              canKong={state.claim.canKong}
              chiOptions={state.claim.chiOptions}
              discardTile={state.claim.discardTile}
              onWin={handleWin}
              onPong={() => handleClaim("pong")}
              onKong={() => handleClaim("kong")}
              onChi={(opt) => handleClaim("chi", opt)}
              onPass={handlePass}
            />
          </div>
        )}

        {!isPlayerChoose && !isPlayerClaim && state.phase !== "hand-over" && (
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-gold)]" />
            {waitingLabel}
          </div>
        )}

        <PlayerHand
          hand={human.hand}
          melds={human.melds}
          flowers={human.flowers}
          drawnTile={state.drawnTile}
          pendingBonus={state.pendingBonus}
          selected={selected}
          interactive={isPlayerChoose}
          onSelect={handleSelect}
          seatLabel={human.seatWind.toUpperCase()}
          bonusTai={taiHintFor(
            human.flowers,
            human.melds,
            human.seatWind,
            state.roundWind,
            rules
          )}
        />
      </div>

      {/* Hand-over overlay */}
      {state.phase === "hand-over" && (
        <HandResult
          state={state}
          lastDiscard={lastDiscardFeedback}
          onNext={handleNextHand}
          onHome={handleHome}
        />
      )}
    </main>
  );
}

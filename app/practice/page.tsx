"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TileId } from "@/types/tiles";
import { WIND_NAME } from "@/types/tiles";
import {
  generatePracticeQuestion,
  type Difficulty,
  type PracticeQuestion,
} from "@/lib/mahjong/practice";
import { evaluateDiscardLocal } from "@/lib/mahjong/localStrategy";
import { tileName } from "@/lib/mahjong/tiles";
import Button from "@/components/shared/Button";
import MeldedSets from "@/components/game/MeldedSets";
import PlayerHand from "@/components/game/PlayerHand";
import TileComponent from "@/components/game/TileComponent";

/* ===========================================================================
   练习 Practice mode: 10 verified questions per set. Every scenario was
   accepted only after the offline engine found a clear best answer, and the
   explanation comes from that same stored analysis.
   =========================================================================== */

const TOTAL = 10;

interface WrongEntry {
  n: number;
  prompt: string;
  your: string;
  correct: string;
}

export default function PracticePage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [stage, setStage] = useState<"setup" | "quiz" | "summary">("setup");
  const [qIndex, setQIndex] = useState(0);
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [extraNote, setExtraNote] = useState<string>("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wrong, setWrong] = useState<WrongEntry[]>([]);

  // Questions are generated client-side only (Math.random ≠ SSR-safe).
  useEffect(() => {
    if (stage !== "quiz" || !difficulty) return;
    setQuestion(generatePracticeQuestion(difficulty));
    setAnswer(null);
    setExtraNote("");
  }, [stage, qIndex, difficulty]);

  const start = (d: Difficulty) => {
    setDifficulty(d);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setWrong([]);
    setQIndex(0);
    setQuestion(null);
    setStage("quiz");
  };

  const labelFor = (q: PracticeQuestion, id: string): string =>
    q.options
      ? (q.options.find((o) => o.id === id)?.label ?? id)
      : tileName(id);

  const handleAnswer = (id: string) => {
    if (!question || answer) return;
    const isCorrect = question.correct.includes(id);
    setAnswer(id);
    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
      setWrong((w) => [
        ...w,
        {
          n: qIndex + 1,
          prompt: question.prompt,
          your: labelFor(question, id),
          correct: question.correct.map((c) => labelFor(question, c)).join(" / "),
        },
      ]);
      // For discard questions, also show the coach's read of THEIR tile.
      if (question.type === "discard")
        setExtraNote(evaluateDiscardLocal(question.state, id).text);
    }
  };

  const next = () => {
    if (qIndex + 1 >= TOTAL) setStage("summary");
    else setQIndex((i) => i + 1);
  };

  /* ---- Setup: difficulty selector --------------------------------------- */
  if (stage === "setup") {
    return (
      <main className="felt-glow flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-felt)] p-6">
        <div className="w-full max-w-[420px] rounded-3xl border border-[rgba(201,168,76,0.3)] bg-[var(--bg-surface)] p-6 shadow-2xl">
          <h1 className="font-display text-center text-2xl font-black text-[var(--accent-gold)]">
            练习 PRACTICE
          </h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-[var(--text-muted)]">
            {TOTAL} 道题 · every question is engine-verified to have one clearly
            best answer. Pick a difficulty:
          </p>
          <div className="mt-5 space-y-2">
            {(
              [
                ["beginner", "初级 Beginner", "Obvious isolated-tile discards, big margins."],
                ["intermediate", "中级 Intermediate", "Tighter margins, some table reads."],
                ["advanced", "高级 Advanced", "Close calls, melds and deeper context to read."],
              ] as [Difficulty, string, string][]
            ).map(([d, label, sub]) => (
              <button
                key={d}
                onClick={() => start(d)}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.2)] px-4 py-3 text-left transition-colors hover:border-[var(--accent-gold)]"
              >
                <div className="text-sm font-bold text-[var(--text-primary)]">{label}</div>
                <div className="text-[11px] text-[var(--text-muted)]">{sub}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => router.push("/")}
            className="mt-5 w-full text-center text-[11px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent-gold)]"
          >
            ← 返回 Home
          </button>
        </div>
      </main>
    );
  }

  /* ---- Summary ----------------------------------------------------------- */
  if (stage === "summary") {
    const pct = Math.round((score / TOTAL) * 100);
    return (
      <main className="felt-glow flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-felt)] p-6">
        <div className="w-full max-w-[440px] rounded-3xl border border-[rgba(201,168,76,0.3)] bg-[var(--bg-surface)] p-6 shadow-2xl">
          <h1 className="font-display text-center text-2xl font-black text-[var(--accent-gold)]">
            成绩 RESULTS
          </h1>
          <div className="mt-4 flex items-center justify-around rounded-xl bg-[rgba(0,0,0,0.2)] px-4 py-3 text-center">
            <div>
              <div className="text-2xl font-black text-[var(--text-primary)]">
                {score}/{TOTAL}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">得分 Score</div>
            </div>
            <div>
              <div
                className={`text-2xl font-black ${
                  pct >= 70 ? "text-[var(--feedback-correct)]" : "text-[var(--accent-gold)]"
                }`}
              >
                {pct}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">准确率 Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--text-primary)]">{bestStreak}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">最长连对 Streak</div>
            </div>
          </div>

          {wrong.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                复盘 Review — questions you missed
              </div>
              <div className="mt-2 max-h-[34vh] space-y-2 overflow-y-auto">
                {wrong.map((w) => (
                  <div
                    key={w.n}
                    className="rounded-lg border border-[rgba(231,76,60,0.3)] bg-[rgba(231,76,60,0.08)] p-2.5 text-[11px]"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">
                      Q{w.n} · {w.prompt}
                    </div>
                    <div className="mt-0.5 text-[var(--feedback-wrong)]">你的答案 {w.your}</div>
                    <div className="text-[var(--feedback-correct)]">正确答案 {w.correct}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {wrong.length === 0 && (
            <p className="mt-4 text-center text-sm text-[var(--feedback-correct)]">
              全对！Perfect set — 厉害!
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <Button variant="gold" fullWidth onClick={() => start(difficulty!)}>
              再来一组 · AGAIN
            </Button>
            <Button fullWidth onClick={() => setStage("setup")}>
              换难度 · DIFFICULTY
            </Button>
          </div>
          <button
            onClick={() => router.push("/")}
            className="mt-4 w-full text-center text-[11px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent-gold)]"
          >
            ← 返回 Home
          </button>
        </div>
      </main>
    );
  }

  /* ---- Quiz --------------------------------------------------------------- */
  if (!question) {
    return (
      <main className="felt-glow flex min-h-dvh items-center justify-center bg-[var(--bg-felt)]">
        <span className="animate-pulse text-sm uppercase tracking-widest text-[var(--text-muted)]">
          出题中… Generating question
        </span>
      </main>
    );
  }

  const st = question.state;
  const human = st.players[st.humanIndex];
  const bots = st.players.filter((p) => !p.isHuman);
  const answered = answer !== null;
  const wasCorrect = answered && question.correct.includes(answer);
  const isDiscardQ = question.options === null;

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--bg-felt)]">
      {/* Header: counter / score / streak */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] bg-[rgba(15,30,23,0.96)] px-4 py-2.5">
        <button
          onClick={() => setStage("setup")}
          className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent-gold)]"
        >
          ← 练习 Practice
        </button>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-[var(--text-primary)]">
            {qIndex + 1}/{TOTAL}
          </span>
          <span className="text-[var(--accent-gold)]">得分 {score}</span>
          <span className={streak >= 3 ? "text-[var(--feedback-correct)]" : "text-[var(--text-muted)]"}>
            🔥 {streak}
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-3 p-3">
        {/* Frozen scenario */}
        <div className="felt-glow rounded-2xl border border-[rgba(255,255,255,0.05)] p-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <span className="rounded bg-[rgba(201,168,76,0.15)] px-1.5 py-0.5 font-bold text-[var(--accent-gold)]">
              {WIND_NAME[st.roundWind]} round
            </span>
            <span className="rounded bg-[rgba(201,168,76,0.15)] px-1.5 py-0.5 font-bold text-[var(--accent-gold)]">
              你是 {WIND_NAME[human.seatWind]}
            </span>
            <span>牌墙 wall ×{st.wall.length}</span>
          </div>

          {/* Opponents: melds give the table read */}
          <div className="mt-2 flex flex-wrap items-start gap-4">
            {bots.map((b) => (
              <div key={b.index} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {WIND_NAME[b.seatWind]} · {b.name}
                </span>
                {b.melds.length > 0 ? (
                  <MeldedSets melds={b.melds} size="mini" />
                ) : (
                  <span className="text-[10px] italic text-[var(--text-muted)]/60">无副露 no melds</span>
                )}
              </div>
            ))}
          </div>

          {/* Shared discard pile */}
          <div className="mt-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.18)] p-2">
            <div className="mb-1 text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
              弃牌区 discards ({st.discardPile.length})
            </div>
            <div className="flex flex-wrap gap-0.5">
              {st.discardPile.map((d, i) => (
                <TileComponent key={i} tileId={d.tile} size="mini" />
              ))}
              {st.discardPile.length === 0 && (
                <span className="text-[10px] italic text-[var(--text-muted)]/50">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div className="rounded-2xl border border-[var(--accent-gold)] bg-[var(--bg-surface)]/95 px-4 py-2.5 text-sm font-semibold text-[var(--accent-gold)]">
          {question.prompt}
        </div>

        {/* Hand (tap to answer for discard questions) */}
        <PlayerHand
          hand={human.hand}
          drawnTile={st.drawnTile}
          pendingBonus={null}
          selected={isDiscardQ ? answer : null}
          interactive={isDiscardQ && !answered}
          onSelect={handleAnswer}
          seatLabel={human.seatWind.toUpperCase()}
        />

        {/* Options for strategy / safety questions */}
        {question.options && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.options.map((o) => {
              const isPicked = answer === o.id;
              const isRight = question.correct.includes(o.id);
              const after = answered
                ? isRight
                  ? "border-[var(--feedback-correct)] bg-[rgba(39,174,96,0.12)]"
                  : isPicked
                    ? "border-[var(--feedback-wrong)] bg-[rgba(231,76,60,0.12)]"
                    : "border-[rgba(255,255,255,0.08)] opacity-60"
                : "border-[rgba(255,255,255,0.1)] hover:border-[var(--accent-gold)]";
              return (
                <button
                  key={o.id}
                  disabled={answered}
                  onClick={() => handleAnswer(o.id)}
                  className={`flex items-center gap-2 rounded-xl border bg-[rgba(0,0,0,0.2)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--text-primary)] transition-colors ${after}`}
                >
                  {o.tile && <TileComponent tileId={o.tile} size="meld" />}
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Verdict + explanation */}
        {answered && (
          <div
            className="animate-slide-up rounded-2xl border bg-[var(--bg-surface)]/95 shadow-2xl"
            style={{
              borderColor: wasCorrect ? "var(--feedback-correct)" : "var(--feedback-wrong)",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{
                background: wasCorrect ? "rgba(39,174,96,0.12)" : "rgba(231,76,60,0.12)",
              }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-black text-[var(--bg-dark)]"
                style={{
                  background: wasCorrect ? "var(--feedback-correct)" : "var(--feedback-wrong)",
                }}
              >
                {wasCorrect ? "✓" : "✗"}
              </span>
              <span
                className="text-sm font-bold uppercase tracking-wide"
                style={{
                  color: wasCorrect ? "var(--feedback-correct)" : "var(--feedback-wrong)",
                }}
              >
                {wasCorrect ? "答对了 CORRECT" : "答错了 WRONG"}
              </span>
            </div>
            <div className="space-y-2 px-4 py-3">
              {isDiscardQ && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    正确答案 Correct:
                  </span>
                  {question.correct.map((t) => (
                    <TileComponent key={t} tileId={t} size="meld" />
                  ))}
                </div>
              )}
              {!wasCorrect && extraNote && (
                <p className="text-sm leading-relaxed text-[var(--feedback-wrong)]/90">
                  你的选择 — {extraNote}
                </p>
              )}
              <p className="text-sm leading-relaxed text-[var(--text-primary)]/90">
                {question.explanation}
              </p>
              <Button variant="gold" fullWidth onClick={next} className="mt-1">
                {qIndex + 1 >= TOTAL ? "看成绩 · RESULTS" : "下一题 · NEXT QUESTION"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import type { Verdict } from "@/lib/claude/strategyFeedback";
import { tileName } from "@/lib/mahjong/tiles";
import type { TileId } from "@/types/tiles";

/* ===========================================================================
   Strategy Feedback Panel — the core learning surface. Slides up when the
   player pre-selects a discard, before they confirm.
   =========================================================================== */

interface Props {
  proposedDiscard: TileId;
  loading: boolean;
  verdict: Verdict | null;
  text: string;
}

const VERDICT_META: Record<
  Verdict,
  { icon: string; title: (t: string) => string; color: string; bg: string }
> = {
  good: {
    icon: "✓",
    title: (t) => `打 ${t} 是好选择 · Good discard`,
    color: "var(--feedback-correct)",
    bg: "rgba(39,174,96,0.12)",
  },
  risky: {
    icon: "✗",
    title: (t) => `有风险 · 考虑留下 ${t}`,
    color: "var(--feedback-wrong)",
    bg: "rgba(231,76,60,0.12)",
  },
  okay: {
    icon: "~",
    title: () => `尚可，但可考虑… · Reasonable, but…`,
    color: "var(--feedback-neutral)",
    bg: "rgba(201,168,76,0.12)",
  },
};

export default function StrategyPanel({
  proposedDiscard,
  loading,
  verdict,
  text,
}: Props) {
  const name = tileName(proposedDiscard);
  const meta = verdict ? VERDICT_META[verdict] : null;
  const accent = meta?.color ?? "var(--accent-gold)";

  return (
    <div
      className="animate-slide-up overflow-hidden rounded-2xl border bg-[var(--bg-surface)]/95 shadow-2xl backdrop-blur"
      style={{ borderColor: accent, boxShadow: `0 0 22px ${accent}33` }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: meta?.bg ?? "rgba(201,168,76,0.1)" }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-black"
          style={{ background: accent, color: "var(--bg-dark)" }}
        >
          {loading ? "…" : (meta?.icon ?? "~")}
        </span>
        <span
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: accent }}
        >
          {loading
            ? `分析中 Analyzing ${name}…`
            : (meta?.title(name) ?? `打 ${name}`)}
        </span>
      </div>

      <div className="px-4 py-3">
        {loading && !text ? (
          <div className="space-y-2">
            <div className="shimmer h-3 w-full rounded" />
            <div className="shimmer h-3 w-4/5 rounded" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--text-primary)]/90">
            {text}
            {loading && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-[var(--accent-gold)] align-middle" />
            )}
          </p>
        )}
      </div>
    </div>
  );
}

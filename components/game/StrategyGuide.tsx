"use client";

import TileComponent from "./TileComponent";

/* ===========================================================================
   Quick Singapore Mahjong strategy guide (drawer/modal).
   =========================================================================== */

interface Props {
  open: boolean;
  onClose: () => void;
}

const TAI_TABLE: { feature: string; tai: string }[] = [
  { feature: "Seat wind triplet", tai: "+1" },
  { feature: "Round wind triplet", tai: "+1" },
  { feature: "Dragon triplet (中/发/白)", tai: "+1 each" },
  { feature: "All one suit (清一色)", tai: "+3" },
  { feature: "All triplets (对对胡)", tai: "+3" },
  { feature: "Self-draw (自摸)", tai: "+1" },
  { feature: "Flower / Season", tai: "+1 each" },
  { feature: "Kong declaration", tai: "+1 each" },
  { feature: "Limit hand", tai: "8 tai cap" },
];

export default function StrategyGuide({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-slide-up max-h-[88dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border border-[rgba(201,168,76,0.25)] bg-[var(--bg-surface)] p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-[var(--accent-gold)]">
            Strategy Guide
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕ Close
          </button>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Basic Hand Structure
          </h3>
          <p className="mb-3 text-sm text-[var(--text-primary)]/90">
            A winning hand = <strong>4 sets + 1 pair</strong>. A set is either a
            run of three (e.g. 4-5-6) or a triplet (three identical tiles).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {["1tong", "2tong", "3tong"].map((t) => (
              <TileComponent key={t} tileId={t} size="meld" />
            ))}
            {["5bam", "5bam", "5bam"].map((t, i) => (
              <TileComponent key={`b${i}`} tileId={t} size="meld" />
            ))}
            {["zhong", "zhong"].map((t, i) => (
              <TileComponent key={`z${i}`} tileId={t} size="meld" />
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Discard Priority
          </h3>
          <ul className="space-y-1.5 text-sm text-[var(--text-primary)]/90">
            <li>
              <span className="text-[var(--feedback-correct)]">Keep:</span>{" "}
              near-complete sets, suit runs, and winds/dragons you hold a pair of.
            </li>
            <li>
              <span className="text-[var(--feedback-wrong)]">Throw:</span>{" "}
              isolated tiles, lone honors, and duplicate suits with no run
              potential.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Reading the Table
          </h3>
          <ul className="space-y-1.5 text-sm text-[var(--text-primary)]/90">
            <li>
              Count the discards — a tile already discarded several times is
              usually <strong>safe</strong> to throw.
            </li>
            <li>
              Watch opponents&apos; melds — avoid feeding the suit or honors they
              are collecting.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Tai Reference
          </h3>
          <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)]">
            {TAI_TABLE.map((row, i) => (
              <div
                key={row.feature}
                className={`flex items-center justify-between px-4 py-2 text-sm ${
                  i % 2 ? "bg-[rgba(255,255,255,0.02)]" : ""
                }`}
              >
                <span className="text-[var(--text-primary)]/90">
                  {row.feature}
                </span>
                <span className="font-semibold text-[var(--accent-gold)]">
                  {row.tai}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Singapore-Specific
          </h3>
          <p className="text-sm text-[var(--text-primary)]/90">
            Fei (flower/season) tiles score bonus tai and draw replacements. A
            minimum tai is required to collect — set it on the home screen.
            Chicken hand, when enabled, lets a tai-less hand still win for 1 tai.
          </p>
        </section>
      </div>
    </div>
  );
}

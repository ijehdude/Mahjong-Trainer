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
  { feature: "平胡 Ping Hu (all sequences)", tai: "+1" },
  { feature: "对对胡 All triplets", tai: "+2" },
  { feature: "清一色 All one suit", tai: "+3" },
  { feature: "自风刻 Seat wind triplet", tai: "+1" },
  { feature: "圈风刻 Round wind triplet", tai: "+1" },
  { feature: "箭刻 Dragon triplet (中/发/白)", tai: "+1 每" },
  { feature: "自摸 Self-draw", tai: "+1" },
  { feature: "抢杠 Robbing the kong", tai: "+1" },
  { feature: "花 / 季 Flower / Season", tai: "+1 每" },
  { feature: "杠 Kong", tai: "即时赔付 bonus" },
  { feature: "封顶 Limit cap", tai: "5 台" },
];

const SPECIAL_TABLE: { feature: string; tai: string }[] = [
  { feature: "十三幺 Thirteen Orphans", tai: "限制番" },
  { feature: "九莲宝灯 Nine Gates", tai: "限制番" },
  { feature: "大三元 Big Three Dragons", tai: "限制番" },
  { feature: "小三元 Small Three Dragons", tai: "5 台" },
  { feature: "大四喜 Big Four Winds", tai: "限制番" },
  { feature: "小四喜 Small Four Winds", tai: "限制番" },
  { feature: "十八罗汉 Eighteen Arhats (4 kongs)", tai: "限制番" },
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
            麻将攻略 Strategy Guide
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕ 关闭
          </button>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            基本牌型 Basic Hand Structure
          </h3>
          <p className="mb-3 text-sm text-[var(--text-primary)]/90">
            胡牌 = <strong>4 副面子 + 1 对将</strong>。面子可以是顺子（如
            4-5-6）或刻子（三张相同）。 A winning hand is 4 sets + 1 pair.
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
            打牌优先级 Discard Priority
          </h3>
          <ul className="space-y-1.5 text-sm text-[var(--text-primary)]/90">
            <li>
              <span className="text-[var(--feedback-correct)]">留 Keep:</span>{" "}
              接近成型的面子、顺子搭子，以及成对的风/箭牌。
            </li>
            <li>
              <span className="text-[var(--feedback-wrong)]">打 Throw:</span>{" "}
              孤张、单张字牌，以及没有顺子潜力的重复牌。
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            读牌 Reading the Table
          </h3>
          <ul className="space-y-1.5 text-sm text-[var(--text-primary)]/90">
            <li>
              数牌河 — 已经被打过多次的牌通常<strong>安全</strong>。
            </li>
            <li>
              留意对手的副露 — 避免喂他们正在收集的花色或字牌。
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            台数参考 Tai Reference
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

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            特殊牌型 Special Hands
          </h3>
          <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)]">
            {SPECIAL_TABLE.map((row, i) => (
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
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            限制番封顶 5 台（可在首页关闭）· Limit hands cap at 5 tai (toggle on
            the home screen).
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            新加坡规则 Singapore-Specific
          </h3>
          <p className="text-sm text-[var(--text-primary)]/90">
            花牌（花 / 季）计额外台数并补牌。胡牌需达到最低台数 — 在首页设置。
            抢杠胡：可胡别人加杠的那张牌（+1 台）。
          </p>
        </section>
      </div>
    </div>
  );
}

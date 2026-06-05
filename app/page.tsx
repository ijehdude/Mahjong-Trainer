"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsCard from "@/components/setup/SettingsCard";
import SegmentedControl from "@/components/setup/SegmentedControl";
import ToggleRow from "@/components/setup/ToggleRow";
import Button from "@/components/shared/Button";
import TileComponent from "@/components/game/TileComponent";
import StrategyGuide from "@/components/game/StrategyGuide";
import { DEFAULT_RULES } from "@/types/game";
import type {
  CoachEngine,
  FeiPayout,
  GameRules,
  MinTai,
  PlayerCount,
} from "@/types/game";
import { RULES_STORAGE_KEY } from "@/lib/storage";

export default function SetupPage() {
  const router = useRouter();
  const [rules, setRules] = useState<GameRules>(DEFAULT_RULES);
  const [guideOpen, setGuideOpen] = useState(false);

  const update = <K extends keyof GameRules>(key: K, value: GameRules[K]) =>
    setRules((r) => ({ ...r, [key]: value }));

  const dealMeIn = () => {
    sessionStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    router.push("/game");
  };

  const ruleSummary = [
    "新加坡规则",
    `${rules.players}人`,
    `最低${rules.minTai}台`,
    `$${rules.payoutRate.toFixed(2)}/台`,
    rules.flowerTiles ? "有花" : "无花",
  ].join(" · ");

  return (
    <main className="tile-texture min-h-dvh w-full bg-[var(--bg-dark)]">
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-10 pt-8">
        {/* Header row */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setGuideOpen(true)}
            className="rounded-full border border-[rgba(255,255,255,0.1)] px-4 py-1.5 text-xs font-semibold tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent-gold)]"
          >
            📖 攻略 Guide
          </button>
        </div>

        <header className="mt-6 flex flex-col items-center text-center">
          <div className="rotate-3 transition-transform hover:rotate-0">
            <TileComponent tileId="zhong" size="hand" />
          </div>
          <h1 className="mt-5 font-display text-4xl font-black tracking-[0.12em] text-[var(--accent-gold)]">
            麻将策略训练器
          </h1>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.34em] text-[var(--text-muted)]">
            Mahjong Strategy Trainer
          </p>
        </header>

        <div className="mt-9 space-y-7">
          <SettingsCard title="玩家人数" en="Players">
            <SegmentedControl<PlayerCount>
              options={[
                { label: "2人", value: 2 },
                { label: "3人", value: 3 },
                { label: "4人", value: 4 },
              ]}
              value={rules.players}
              onChange={(v) => update("players", v)}
            />
            <p className="text-xs text-[var(--text-muted)]">
              新加坡规则以 4 人为标准；3 人去掉北风。
            </p>
          </SettingsCard>

          <SettingsCard title="花牌（花 / 季）" en="Flowers & Seasons">
            <ToggleRow
              label="花牌与季牌"
              description="Flower & season tiles — 8 bonus tiles, revealed with a replacement draw."
              checked={rules.flowerTiles}
              onChange={(v) => update("flowerTiles", v)}
            />
            {rules.flowerTiles && (
              <div className="pl-1">
                <p className="mb-2 text-xs text-[var(--text-muted)]">
                  花牌台数 Fei Payout
                </p>
                <SegmentedControl<FeiPayout>
                  options={[
                    { label: "无 None", value: "none" },
                    { label: "+1台", value: "1tai" },
                    { label: "+2台", value: "2tai" },
                  ]}
                  value={rules.feiPayout}
                  onChange={(v) => update("feiPayout", v)}
                />
              </div>
            )}
          </SettingsCard>

          <SettingsCard
            title="最低台数"
            en="Minimum Tai"
            helper="收取赔付所需的最低胡牌台数 · Minimum score to collect."
          >
            <SegmentedControl<MinTai>
              options={[
                { label: "1台", value: 1 },
                { label: "2台", value: 2 },
                { label: "3台", value: 3 },
                { label: "4台", value: 4 },
              ]}
              value={rules.minTai}
              onChange={(v) => update("minTai", v)}
            />
          </SettingsCard>

          <SettingsCard title="每台赔率" en="Payout per Tai">
            <SegmentedControl<number>
              options={[
                { label: "$0.10", value: 0.1 },
                { label: "$0.20", value: 0.2 },
                { label: "$0.50", value: 0.5 },
                { label: "$1.00", value: 1 },
              ]}
              value={rules.payoutRate}
              onChange={(v) => update("payoutRate", v)}
            />
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                $
              </span>
              <input
                type="number"
                step="0.05"
                min="0"
                value={rules.payoutRate}
                onChange={(e) =>
                  update("payoutRate", Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] py-3 pl-8 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)]"
              />
            </div>
          </SettingsCard>

          <SettingsCard title="起始筹码" en="Starting Stack">
            <SegmentedControl<number>
              options={[
                { label: "$50", value: 50 },
                { label: "$100", value: 100 },
                { label: "$200", value: 200 },
                { label: "$500", value: 500 },
              ]}
              value={rules.startingStack}
              onChange={(v) => update("startingStack", v)}
            />
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                $
              </span>
              <input
                type="number"
                step="10"
                min="0"
                value={rules.startingStack}
                onChange={(e) =>
                  update(
                    "startingStack",
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] py-3 pl-8 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)]"
              />
            </div>
          </SettingsCard>

          <SettingsCard title="特殊规则" en="Special Rules">
            <div className="space-y-2">
              <ToggleRow
                label="杠牌奖励"
                description="Kong Bonus — collect payment for declaring a kong."
                checked={rules.kongBonus}
                onChange={(v) => update("kongBonus", v)}
              />
              <ToggleRow
                label="天胡"
                description="Heavenly Hand — dealer wins on the first deal."
                checked={rules.heavenlyHand}
                onChange={(v) => update("heavenlyHand", v)}
              />
              <ToggleRow
                label="地胡"
                description="Earthly Hand — non-dealer wins on dealer's first discard."
                checked={rules.earthlyHand}
                onChange={(v) => update("earthlyHand", v)}
              />
              <ToggleRow
                label="抢杠胡"
                description="Robbing the Kong — win on a tile used to form an added kong (+1 tai)."
                checked={rules.robbingKong}
                onChange={(v) => update("robbingKong", v)}
              />
              <ToggleRow
                label="封顶台数"
                description="Limit Hand Cap — maximum payout capped at 5 tai."
                checked={rules.limitHandCap}
                onChange={(v) => update("limitHandCap", v)}
              />
            </div>
          </SettingsCard>

          <SettingsCard
            title="策略教练"
            en="Strategy Coach"
            helper="本地：完全离线，无需密钥 · AI：使用 Claude 提供更深入的建议。"
          >
            <SegmentedControl<CoachEngine>
              options={[
                { label: "本地 Local", value: "local" },
                { label: "AI (Claude)", value: "ai" },
              ]}
              value={rules.coachEngine}
              onChange={(v) => update("coachEngine", v)}
            />
          </SettingsCard>

          <SettingsCard
            title="提示详细度"
            en="Feedback Detail"
            helper="每次打牌后显示多少解释 · How much explanation to show."
          >
            <SegmentedControl<GameRules["feedbackDetail"]>
              options={[
                { label: "简略 Brief", value: "brief" },
                { label: "详细 Detailed", value: "detailed" },
              ]}
              value={rules.feedbackDetail}
              onChange={(v) => update("feedbackDetail", v)}
            />
          </SettingsCard>
        </div>

        {/* Footer */}
        <div className="mt-9">
          <p className="mb-4 text-center text-[11px] tracking-[0.14em] text-[var(--text-muted)]">
            {ruleSummary}
          </p>
          <Button
            variant="gold"
            fullWidth
            onClick={dealMeIn}
            className="py-4 text-base font-bold tracking-wide"
          >
            开始发牌 · DEAL ME IN
          </Button>
        </div>
      </div>

      <StrategyGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </main>
  );
}

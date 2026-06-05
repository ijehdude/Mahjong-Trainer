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
    "Singapore Rules",
    `${rules.players}-Player`,
    `Min ${rules.minTai} Tai`,
    `$${rules.payoutRate.toFixed(2)}/tai`,
    rules.flowerTiles ? "Flowers ON" : "Flowers OFF",
  ].join(" · ");

  return (
    <main className="tile-texture min-h-dvh w-full bg-[var(--bg-dark)]">
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-10 pt-8">
        {/* Header row */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setGuideOpen(true)}
            className="rounded-full border border-[rgba(255,255,255,0.1)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent-gold)]"
          >
            📖 Guide
          </button>
        </div>

        <header className="mt-6 flex flex-col items-center text-center">
          <div className="rotate-3 transition-transform hover:rotate-0">
            <TileComponent tileId="zhong" size="hand" />
          </div>
          <h1 className="mt-5 font-display text-5xl font-black tracking-[0.12em] text-[var(--accent-gold)]">
            MAHJONG
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.42em] text-[var(--text-muted)]">
            Strategy Trainer
          </p>
        </header>

        <div className="mt-9 space-y-7">
          <SettingsCard title="Number of Players">
            <SegmentedControl<PlayerCount>
              options={[
                { label: "2P", value: 2 },
                { label: "3P", value: 3 },
                { label: "4P", value: 4 },
              ]}
              value={rules.players}
              onChange={(v) => update("players", v)}
            />
            <p className="text-xs text-[var(--text-muted)]">
              Singapore rules — 4P is standard. 3P removes the North wind.
            </p>
          </SettingsCard>

          <SettingsCard title="Fei Tile — Flowers & Seasons">
            <ToggleRow
              label="Flower & Season Tiles"
              description="8 bonus tiles; revealed on draw with a replacement."
              checked={rules.flowerTiles}
              onChange={(v) => update("flowerTiles", v)}
            />
            {rules.flowerTiles && (
              <div className="pl-1">
                <p className="mb-2 text-xs text-[var(--text-muted)]">
                  Fei Payout
                </p>
                <SegmentedControl<FeiPayout>
                  options={[
                    { label: "No extra", value: "none" },
                    { label: "+1 tai", value: "1tai" },
                    { label: "+2 tai", value: "2tai" },
                  ]}
                  value={rules.feiPayout}
                  onChange={(v) => update("feiPayout", v)}
                />
              </div>
            )}
          </SettingsCard>

          <SettingsCard
            title="Minimum Tai"
            helper="Minimum winning score to collect payment"
          >
            <SegmentedControl<MinTai>
              options={[
                { label: "1", value: 1 },
                { label: "2", value: 2 },
                { label: "3", value: 3 },
                { label: "4", value: 4 },
              ]}
              value={rules.minTai}
              onChange={(v) => update("minTai", v)}
            />
          </SettingsCard>

          <SettingsCard title="Payout Rate (per tai)">
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

          <SettingsCard title="Starting Stack">
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

          <SettingsCard title="Special Rules">
            <div className="space-y-2">
              <ToggleRow
                label="Kong Bonus"
                description="Collect payment for declaring a Kong."
                checked={rules.kongBonus}
                onChange={(v) => update("kongBonus", v)}
              />
              <ToggleRow
                label="Heavenly Hand (天胡)"
                description="Dealer wins on the first deal."
                checked={rules.heavenlyHand}
                onChange={(v) => update("heavenlyHand", v)}
              />
              <ToggleRow
                label="Earthly Hand (地胡)"
                description="Non-dealer wins on dealer's first discard."
                checked={rules.earthlyHand}
                onChange={(v) => update("earthlyHand", v)}
              />
              <ToggleRow
                label="Chicken Hand (鸡胡)"
                description="Allow winning with no tai (counts as 1)."
                checked={rules.chickenHand}
                onChange={(v) => update("chickenHand", v)}
              />
              <ToggleRow
                label="Limit Hand Cap"
                description="Maximum payout capped at 8 tai."
                checked={rules.limitHandCap}
                onChange={(v) => update("limitHandCap", v)}
              />
            </div>
          </SettingsCard>

          <SettingsCard
            title="Strategy Coach"
            helper="Local runs fully offline (no API key needed). AI uses Claude for richer, table-aware advice."
          >
            <SegmentedControl<CoachEngine>
              options={[
                { label: "Local (offline)", value: "local" },
                { label: "AI (Claude)", value: "ai" },
              ]}
              value={rules.coachEngine}
              onChange={(v) => update("coachEngine", v)}
            />
          </SettingsCard>

          <SettingsCard
            title="Strategy Feedback Detail"
            helper="How much explanation to show after each discard"
          >
            <SegmentedControl<GameRules["feedbackDetail"]>
              options={[
                { label: "Brief", value: "brief" },
                { label: "Detailed", value: "detailed" },
              ]}
              value={rules.feedbackDetail}
              onChange={(v) => update("feedbackDetail", v)}
            />
          </SettingsCard>
        </div>

        {/* Footer */}
        <div className="mt-9">
          <p className="mb-4 text-center text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {ruleSummary}
          </p>
          <Button
            variant="gold"
            fullWidth
            onClick={dealMeIn}
            className="py-4 text-base"
          >
            DEAL ME IN
          </Button>
        </div>
      </div>

      <StrategyGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </main>
  );
}

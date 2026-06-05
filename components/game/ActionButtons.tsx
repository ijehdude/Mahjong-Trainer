"use client";

import { useState } from "react";
import type { ChiOption, KongOption } from "@/types/game";
import type { TileId } from "@/types/tiles";
import TileComponent from "./TileComponent";

/* ===========================================================================
   Action button row shown when a tile is pre-selected or a claim is offered.
   Labels are bilingual (中文 · EN).
   =========================================================================== */

interface Props {
  mode: "discard" | "claim";
  canDiscard?: boolean;
  canWin?: boolean;
  canPong?: boolean;
  canKong?: boolean;
  chiOptions?: ChiOption[];
  selfKongOptions?: KongOption[]; // concealed / added kongs on your own turn
  discardTile?: TileId; // tile being claimed (for chi preview)
  onDiscard?: () => void;
  onWin?: () => void;
  onPong?: () => void;
  onKong?: () => void;
  onSelfKong?: (opt: KongOption) => void;
  onChi?: (opt: ChiOption) => void;
  onPass?: () => void;
}

export default function ActionButtons({
  mode,
  canDiscard,
  canWin,
  canPong,
  canKong,
  chiOptions = [],
  selfKongOptions = [],
  discardTile,
  onDiscard,
  onWin,
  onPong,
  onKong,
  onSelfKong,
  onChi,
  onPass,
}: Props) {
  const [chiOpen, setChiOpen] = useState(false);

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {mode === "discard" && (
        <ActionBtn
          label="打出"
          sub="DISCARD"
          onClick={onDiscard}
          disabled={!canDiscard}
          tone="primary"
        />
      )}

      {mode === "discard" &&
        selfKongOptions.map((opt, i) => (
          <ActionBtn
            key={i}
            label="杠"
            sub={opt.type === "concealed" ? "KONG (暗)" : "KONG (加)"}
            onClick={() => onSelfKong?.(opt)}
            tone="default"
          />
        ))}

      {chiOptions.length > 0 && (
        <div className="relative">
          <ActionBtn
            label="吃"
            sub="CHI ▾"
            onClick={() => setChiOpen((o) => !o)}
            tone="default"
          />
          {chiOpen && (
            <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[var(--bg-surface)] p-2 shadow-2xl">
              {chiOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setChiOpen(false);
                    onChi?.(opt);
                  }}
                  className="flex items-center gap-1 rounded-lg p-1.5 hover:bg-[rgba(255,255,255,0.06)]"
                >
                  {discardTile && (
                    <TileComponent tileId={discardTile} size="mini" />
                  )}
                  {opt.tiles.map((t) => (
                    <TileComponent key={t} tileId={t} size="mini" />
                  ))}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {canPong && (
        <ActionBtn label="碰" sub="PONG" onClick={onPong} tone="default" />
      )}
      {canKong && (
        <ActionBtn label="杠" sub="KONG" onClick={onKong} tone="default" />
      )}
      {canWin && <ActionBtn label="胡!" sub="WIN" onClick={onWin} tone="win" />}

      {mode === "claim" && (
        <ActionBtn label="过" sub="PASS" onClick={onPass} tone="muted" />
      )}
    </div>
  );
}

function ActionBtn({
  label,
  sub,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  sub: string;
  onClick?: () => void;
  disabled?: boolean;
  tone: "primary" | "default" | "win" | "muted";
}) {
  const TONE: Record<string, string> = {
    primary:
      "bg-[var(--accent-gold)] text-[var(--bg-dark)] shadow-[0_0_16px_rgba(201,168,76,0.4)]",
    default:
      "border border-[rgba(201,168,76,0.45)] text-[var(--accent-gold)] hover:bg-[rgba(201,168,76,0.12)]",
    win: "bg-[var(--feedback-correct)] text-white shadow-[0_0_16px_rgba(39,174,96,0.45)]",
    muted:
      "border border-[rgba(255,255,255,0.14)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center rounded-xl px-4 py-2 leading-tight transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${TONE[tone]}`}
    >
      <span className="text-sm font-bold">{label}</span>
      <span className="text-[8px] font-semibold uppercase tracking-wider opacity-80">
        {sub}
      </span>
    </button>
  );
}

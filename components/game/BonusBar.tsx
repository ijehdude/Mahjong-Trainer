"use client";

import type { TileId } from "@/types/tiles";
import TileComponent from "./TileComponent";

/* ===========================================================================
   Slim bonus bar — the player's revealed flowers / seasons / animals shown as
   chips, with the live tai value they contribute. Sits between the felt zone
   and the hand on mobile.
   =========================================================================== */

interface Props {
  flowers: TileId[];
  tai: number;
  showTai: boolean;
}

export default function BonusBar({ flowers, tai, showTai }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-1.5">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        花/季/兽
      </span>
      {flowers.length === 0 ? (
        <span className="text-[11px] italic text-[var(--text-muted)]/60">
          无 None
        </span>
      ) : (
        <div className="flex items-center gap-1">
          {flowers.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="flex items-center rounded-md bg-[rgba(201,168,76,0.12)] p-0.5"
            >
              <TileComponent tileId={t} size="mini" />
            </span>
          ))}
        </div>
      )}
      {showTai && tai > 0 && (
        <span className="ml-auto shrink-0 rounded-md bg-[rgba(201,168,76,0.2)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent-gold)]">
          +{tai} 台
        </span>
      )}
    </div>
  );
}

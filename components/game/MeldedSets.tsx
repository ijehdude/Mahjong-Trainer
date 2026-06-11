"use client";

import type { Meld } from "@/types/game";
import TileComponent, { TileSize } from "./TileComponent";

type Orient = "up" | "left" | "right";

interface Props {
  melds: Meld[];
  size?: TileSize;
  /** "left"/"right" rotate tiles 90° so they face a side player. */
  orient?: Orient;
  /** Show concealed-kong tiles face up (e.g. the winning-hand reveal). */
  revealConcealed?: boolean;
}

export default function MeldedSets({
  melds,
  size = "meld",
  orient = "up",
  revealConcealed = false,
}: Props) {
  if (!melds.length) return null;

  // Side players: each meld is a vertical column of 90°-rotated tiles, so the
  // set reads as a horizontal row from that player's seat.
  if (orient !== "up") {
    const rot = orient === "left" ? "rotate-90" : "-rotate-90";
    return (
      <div className="flex flex-col gap-1">
        {melds.map((meld, i) => (
          <div
            key={i}
            className="flex flex-col gap-px rounded-md bg-[rgba(0,0,0,0.18)] p-0.5"
          >
            {meld.tiles.map((t, j) => (
              <span key={j} className="flex h-6 w-8 items-center justify-center">
                <TileComponent
                  tileId={t}
                  size="mini"
                  className={rot}
                  faceDown={
                    meld.type === "kong" && meld.concealed && !revealConcealed
                  }
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {melds.map((meld, i) => (
        <div
          key={i}
          className="flex items-center gap-px rounded-md bg-[rgba(0,0,0,0.18)] p-0.5"
        >
          {meld.tiles.map((t, j) => (
            <TileComponent
              key={j}
              tileId={t}
              size={size}
              faceDown={meld.type === "kong" && meld.concealed && !revealConcealed}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

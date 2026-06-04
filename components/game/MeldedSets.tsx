"use client";

import type { Meld } from "@/types/game";
import TileComponent, { TileSize } from "./TileComponent";

interface Props {
  melds: Meld[];
  size?: TileSize;
}

export default function MeldedSets({ melds, size = "meld" }: Props) {
  if (!melds.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
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
              faceDown={meld.type === "kong" && meld.concealed && (j === 0 || j === 3)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

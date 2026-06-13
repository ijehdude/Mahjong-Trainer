"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/* ===========================================================================
   Single-row tile sizing: measure the container and compute a tile width so
   `count` tiles always fit one row with no horizontal scroll — capped at `max`,
   floored at `min`. The floor is intentionally small (16px) so a full 14-tile
   hand fits a 360px mobile viewport; the scroll fallback only kicks in below
   that. The size is exposed as --tile-w/--tile-h CSS variables consumed by
   TileComponent's "scaled" size. Aspect ratio is kept at 42:58.
   =========================================================================== */

export function useScaledTileRow(
  count: number,
  opts?: { min?: number; max?: number; gap?: number; extra?: number }
): { ref: React.RefObject<HTMLDivElement | null>; style: CSSProperties } {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const { min = 16, max = 48, gap = 4, extra = 0 } = opts ?? {};
  const usable = width - gap * Math.max(0, count - 1) - extra;
  const w =
    width === 0
      ? max
      : Math.max(min, Math.min(max, Math.floor(usable / Math.max(1, count))));
  const style = {
    "--tile-w": `${w}px`,
    "--tile-h": `${Math.round((w * 58) / 42)}px`,
  } as CSSProperties;
  return { ref, style };
}

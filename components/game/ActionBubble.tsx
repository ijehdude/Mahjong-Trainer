"use client";

import { useEffect, useRef, useState } from "react";
import type { ActionBubbleEvent } from "@/types/game";

/* ===========================================================================
   Mandarin action bubble (碰！/吃！/杠！/咬！/补花/自摸！/胡！) for one player.
   Events are queued so back-to-back actions are each readable; sticky bubbles
   (胡/自摸) stay until the hand-over overlay replaces them.
   =========================================================================== */

const SHOW_MS = 1500;
const FADE_MS = 300;

interface Props {
  /** This player's bubble events for the current hand, in order. */
  events: ActionBubbleEvent[];
  isHuman?: boolean;
  /** Which way the tail points (toward the player). */
  tail?: "down" | "up";
  /** Positioning classes from the seat layout (component is absolute). */
  className?: string;
}

export default function ActionBubble({
  events,
  isHuman = false,
  tail = "down",
  className = "",
}: Props) {
  const [current, setCurrent] = useState<ActionBubbleEvent | null>(null);
  const [leaving, setLeaving] = useState(false);
  const queueRef = useRef<ActionBubbleEvent[]>([]);
  const seenRef = useRef(0);
  const busyRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pump = () => {
      if (busyRef.current) return;
      const next = queueRef.current.shift();
      if (!next) return;
      busyRef.current = true;
      setLeaving(false);
      setCurrent(next);
      // Sticky bubbles stay until the hand resets this component.
      if (!next.sticky) {
        timersRef.current.push(
          setTimeout(() => setLeaving(true), SHOW_MS),
          setTimeout(() => {
            setCurrent(null);
            busyRef.current = false;
            pump();
          }, SHOW_MS + FADE_MS)
        );
      }
    };

    const lastId = events[events.length - 1]?.id ?? 0;
    if (lastId < seenRef.current) {
      // Ids restarted — a new hand began. Clear everything.
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
      queueRef.current = [];
      seenRef.current = 0;
      busyRef.current = false;
      setCurrent(null);
      setLeaving(false);
    }
    for (const e of events) {
      if (e.id > seenRef.current) {
        queueRef.current.push(e);
        seenRef.current = e.id;
      }
    }
    pump();
  }, [events]);

  useEffect(
    () => () => {
      for (const t of timersRef.current) clearTimeout(t);
    },
    []
  );

  if (!current) return null;

  const borderCls = isHuman
    ? "border-[var(--accent-gold)]"
    : "border-[#cbc1a8]";
  return (
    <div className={`pointer-events-none absolute z-30 ${className}`}>
      <div
        key={current.id}
        className={`animate-bubble-in relative rounded-xl border-2 bg-[#f6f1e6] px-3 py-1 text-center shadow-lg transition-opacity duration-300 ${
          leaving ? "opacity-0" : "opacity-100"
        } ${borderCls}`}
        style={{ fontFamily: "var(--font-noto-sans-sc), sans-serif" }}
      >
        <div className="whitespace-nowrap text-base font-bold leading-tight text-[#23232f]">
          {current.text}
        </div>
        {current.sub && (
          <div className="whitespace-nowrap text-[11px] font-semibold leading-tight text-[#6b6356]">
            {current.sub}
          </div>
        )}
        <span
          className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-[#f6f1e6] ${borderCls} ${
            tail === "down"
              ? "-bottom-[7px] border-b-2 border-r-2"
              : "-top-[7px] border-l-2 border-t-2"
          }`}
        />
      </div>
    </div>
  );
}

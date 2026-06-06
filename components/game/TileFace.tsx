import type { Tile } from "@/types/tiles";
import {
  AnimalIllustration,
  BirdIllustration,
  FlowerIllustration,
  SeasonIllustration,
} from "./TileIllustrations";

/* ===========================================================================
   Realistic SVG tile faces — traditional dot patterns for Circles, segmented
   bamboo (with the 1-bamboo bird) for Bamboo, numeral + 萬 for Characters, and
   proper honor / flower / season faces. Rendered in a 36 x 50 viewBox so it
   scales crisply at any tile size.
   =========================================================================== */

const RED = "#c0392b";
const GREEN = "#1f7a4d";
const BLUE = "#27568f";
const INK = "#23232f";
const ORANGE = "#d2792b";
const FACE = "#f7f3ea";
const SERIF = "var(--font-noto-serif-sc), serif";

type Pt = [number, number];

const CIRCLE_POS: Record<number, Pt[]> = {
  1: [[18, 25]],
  2: [[18, 14], [18, 36]],
  3: [[9, 11], [18, 25], [27, 39]],
  4: [[11, 14], [25, 14], [11, 36], [25, 36]],
  5: [[11, 13], [25, 13], [18, 25], [11, 37], [25, 37]],
  6: [[11, 12], [25, 12], [11, 25], [25, 25], [11, 38], [25, 38]],
  7: [[9, 9], [18, 12.5], [27, 16], [11, 31], [25, 31], [11, 41], [25, 41]],
  8: [[11, 9], [25, 9], [11, 20], [25, 20], [11, 31], [25, 31], [11, 42], [25, 42]],
  9: [
    [9, 11], [18, 11], [27, 11],
    [9, 25], [18, 25], [27, 25],
    [9, 39], [18, 39], [27, 39],
  ],
};

const BAMBOO_POS: Record<number, Pt[]> = {
  2: [[18, 13], [18, 37]],
  3: [[18, 11], [11, 37], [25, 37]],
  4: [[11, 13], [25, 13], [11, 37], [25, 37]],
  5: [[11, 12], [25, 12], [18, 25], [11, 38], [25, 38]],
  6: [[10, 14], [18, 14], [26, 14], [10, 37], [18, 37], [26, 37]],
  7: [[18, 8], [10, 26], [18, 26], [26, 26], [10, 41], [18, 41], [26, 41]],
  8: [[9, 14], [15, 14], [21, 14], [27, 14], [9, 37], [15, 37], [21, 37], [27, 37]],
  9: [
    [10, 11], [18, 11], [26, 11],
    [10, 25], [18, 25], [26, 25],
    [10, 39], [18, 39], [26, 39],
  ],
};

const PIP_PALETTE: { a: string; b: string }[] = [
  { a: GREEN, b: RED },
  { a: BLUE, b: GREEN },
  { a: RED, b: BLUE },
];

function dotRadius(n: number): number {
  if (n <= 2) return 7;
  if (n <= 4) return 6;
  if (n <= 6) return 5;
  return 4.3;
}

function CircleFace({ n }: { n: number }) {
  if (n === 1) {
    // Ornate single circle.
    return (
      <g>
        <circle cx={18} cy={25} r={11} fill={BLUE} />
        <circle cx={18} cy={25} r={8.7} fill={FACE} />
        <circle cx={18} cy={25} r={7} fill={RED} />
        <circle cx={18} cy={25} r={4.6} fill={FACE} />
        <circle cx={18} cy={25} r={2.8} fill={GREEN} />
      </g>
    );
  }
  const r = dotRadius(n);
  return (
    <g>
      {CIRCLE_POS[n].map(([cx, cy], i) => {
        const { a, b } = PIP_PALETTE[i % PIP_PALETTE.length];
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={a} />
            <circle cx={cx} cy={cy} r={r * 0.72} fill={FACE} />
            <circle cx={cx} cy={cy} r={r * 0.54} fill={b} />
            <circle cx={cx} cy={cy} r={r * 0.24} fill={FACE} />
          </g>
        );
      })}
    </g>
  );
}

function Stick({
  cx,
  cy,
  w,
  h,
  red,
}: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  red?: boolean;
}) {
  const color = red ? RED : GREEN;
  return (
    <g>
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx={w / 2}
        fill={color}
      />
      {/* segment nodes */}
      <line
        x1={cx - w / 2}
        y1={cy}
        x2={cx + w / 2}
        y2={cy}
        stroke={FACE}
        strokeWidth={0.7}
      />
      <line
        x1={cx - w / 2}
        y1={cy - h / 4}
        x2={cx + w / 2}
        y2={cy - h / 4}
        stroke={FACE}
        strokeWidth={0.5}
        opacity={0.6}
      />
      {/* highlight */}
      <rect
        x={cx - w / 2 + 0.7}
        y={cy - h / 2 + 1}
        width={w * 0.28}
        height={h - 2}
        rx={w * 0.14}
        fill="#ffffff"
        opacity={0.25}
      />
    </g>
  );
}

function BambooFace({ n }: { n: number }) {
  if (n === 1) return <BirdIllustration />;
  const positions = BAMBOO_POS[n];
  const threeRow = n >= 9;
  const h = threeRow ? 11 : n >= 6 ? 13 : 15;
  const w = n >= 6 ? 4 : 4.8;
  // which pip is red (tradition: centre/top accents)
  const redIndex =
    n === 5 ? 2 : n === 7 ? 0 : n === 9 ? 4 : -1;
  return (
    <g>
      {positions.map(([cx, cy], i) => (
        <Stick key={i} cx={cx} cy={cy} w={w} h={h} red={i === redIndex} />
      ))}
    </g>
  );
}

// Traditional numerals as printed on real Characters tiles (note 伍 for five).
const TRAD_NUM = ["", "一", "二", "三", "四", "伍", "六", "七", "八", "九"];

function CharacterFace({ tile }: { tile: Tile }) {
  return (
    <g>
      <text
        x={18}
        y={20}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={17}
        fontWeight={700}
        fill={BLUE}
      >
        {TRAD_NUM[tile.rank ?? 0]}
      </text>
      <text
        x={18}
        y={43}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={17}
        fontWeight={700}
        fill={RED}
      >
        萬
      </text>
    </g>
  );
}

function HonorChar({ char, color }: { char: string; color: string }) {
  return (
    <text
      x={18}
      y={34}
      textAnchor="middle"
      fontFamily={SERIF}
      fontSize={26}
      fontWeight={700}
      fill={color}
    >
      {char}
    </text>
  );
}

function WindFace({ wind }: { wind: string }) {
  const CH: Record<string, string> = {
    east: "東",
    south: "南",
    west: "西",
    north: "北",
  };
  return <HonorChar char={CH[wind] ?? "東"} color={BLUE} />;
}

function DragonFace({ dragon }: { dragon: string }) {
  if (dragon === "zhong") return <HonorChar char="中" color={RED} />;
  if (dragon === "fa") return <HonorChar char="發" color={GREEN} />;
  // White dragon — traditional blue double frame.
  return (
    <g fill="none" stroke={BLUE} strokeWidth={1.6}>
      <rect x={8} y={11} width={20} height={28} rx={2} />
      <rect x={11} y={14} width={14} height={22} rx={1.5} strokeWidth={1} />
    </g>
  );
}

/** Small numbered badge in the top-left corner (flowers/seasons). */
function NumberBadge({ n, color }: { n: number; color: string }) {
  return (
    <g>
      <circle cx={8} cy={9} r={5.5} fill={color} />
      <text
        x={8}
        y={12}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={8}
        fontWeight={700}
        fill="#fff"
      >
        {n}
      </text>
    </g>
  );
}

function BonusFace({ tile }: { tile: Tile }) {
  const isFlower = tile.category === "flower";
  return (
    <g>
      {isFlower ? (
        <FlowerIllustration bonus={tile.bonus ?? 1} />
      ) : (
        <SeasonIllustration bonus={tile.bonus ?? 1} />
      )}
      <NumberBadge n={tile.bonus ?? 1} color={isFlower ? BLUE : ORANGE} />
    </g>
  );
}

function AnimalFace({ tile }: { tile: Tile }) {
  return <AnimalIllustration id={tile.id} />;
}

export default function TileFace({ tile }: { tile: Tile }) {
  let content: React.ReactNode = null;
  if (tile.category === "suit") {
    if (tile.suit === "tong") content = <CircleFace n={tile.rank!} />;
    else if (tile.suit === "bam") content = <BambooFace n={tile.rank!} />;
    else content = <CharacterFace tile={tile} />;
  } else if (tile.category === "wind") {
    content = <WindFace wind={tile.honor as string} />;
  } else if (tile.category === "dragon") {
    content = <DragonFace dragon={tile.honor as string} />;
  } else if (tile.category === "animal") {
    content = <AnimalFace tile={tile} />;
  } else if (tile.category === "fei") {
    content = <HonorChar char="飛" color={RED} />;
  } else {
    content = <BonusFace tile={tile} />;
  }

  return (
    <svg
      viewBox="0 0 36 50"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className="block"
    >
      {content}
    </svg>
  );
}

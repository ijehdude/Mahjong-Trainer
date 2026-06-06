/* ===========================================================================
   Original hand-drawn SVG illustrations for the pictorial tiles (1-bamboo bird,
   the four animals, flowers and seasons). Drawn in the shared 36 x 50 viewBox.
   Flat, stylised motifs — not copies of any specific tile set.
   =========================================================================== */

const RED = "#c0392b";
const GREEN = "#1f7a4d";
const BLUE = "#27568f";
const INK = "#23232f";
const ORANGE = "#d2792b";
const YELLOW = "#e2b53a";
const PINK = "#cf5a91";
const PURPLE = "#7a4ea0";
const GREY = "#9aa0a8";
const GREY_D = "#6e747c";
const BROWN = "#9a6b46";

/* ---- 1-Bamboo bird (peacock-like sparrow) -------------------------------- */
export function BirdIllustration() {
  return (
    <g>
      <path d="M21 27 Q33 24 31 11 Q27 21 21 23 Z" fill={GREEN} />
      <path d="M23 30 Q34 31 34 20 Q29 27 23 27 Z" fill={BLUE} />
      <ellipse cx="16" cy="26" rx="7.5" ry="6.2" fill={GREEN} />
      <path d="M11 22 Q17 19 21 26 Q15 27 11 27 Z" fill={BLUE} />
      <circle cx="11" cy="18" r="4.2" fill={GREEN} />
      <path d="M11 14 L9.5 8 L13 11 Z" fill={RED} />
      <path d="M7 18 L1.5 19.2 L7 20.6 Z" fill={ORANGE} />
      <circle cx="11" cy="17.4" r="1.1" fill={INK} />
      <circle cx="11.4" cy="17" r="0.4" fill="#fff" />
      <path d="M15 32 l-1.5 6 M18.5 32 l1.5 6" stroke={ORANGE} strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );
}

/* ---- Animals -------------------------------------------------------------- */
export function CatIllustration() {
  return (
    <g>
      {/* red curled tail */}
      <path d="M26 41 q8 -3 4.5 -13 q-2 -4 -4.5 -1.5 q3.5 5 0.5 9.5 q-2 3.5 -4 3.5 z" fill={RED} />
      {/* green arched body */}
      <path d="M11 44 Q9 26 18 24 Q27 26 25 44 Z" fill={GREEN} />
      <g stroke="#155f3c" strokeWidth="0.9">
        <path d="M13 33 h10" />
        <path d="M12.5 38 h11" />
      </g>
      {/* red legs */}
      <g stroke={RED} strokeWidth="2.2" strokeLinecap="round">
        <path d="M13 43 v2.5" />
        <path d="M23 43 v2.5" />
      </g>
      {/* blue head */}
      <circle cx="18" cy="17" r="6.6" fill={BLUE} />
      <path d="M12 13 L10.8 5.5 L16.5 11 Z" fill={BLUE} />
      <path d="M24 13 L25.2 5.5 L19.5 11 Z" fill={BLUE} />
      <path d="M13 11.5 L12.4 8 L15 10.5 Z" fill={PINK} />
      <path d="M23 11.5 L23.6 8 L21 10.5 Z" fill={PINK} />
      {/* eyes + nose */}
      <circle cx="15.4" cy="17" r="1.4" fill={YELLOW} />
      <circle cx="20.6" cy="17" r="1.4" fill={YELLOW} />
      <circle cx="15.4" cy="17" r="0.6" fill={INK} />
      <circle cx="20.6" cy="17" r="0.6" fill={INK} />
      <path d="M16.8 20 L19.2 20 L18 21.5 Z" fill={RED} />
      <g stroke={GREY_D} strokeWidth="0.4" strokeLinecap="round">
        <line x1="14" y1="20" x2="8" y2="19" />
        <line x1="22" y1="20" x2="28" y2="19" />
      </g>
    </g>
  );
}

export function RatIllustration() {
  return (
    <g>
      {/* green curled tail */}
      <path d="M24 36 q12 2 7 -13" fill="none" stroke={GREEN} strokeWidth="1.7" strokeLinecap="round" />
      {/* red body */}
      <ellipse cx="17.5" cy="33" rx="10.5" ry="7.5" fill={RED} />
      {/* blue head */}
      <ellipse cx="9.5" cy="27" rx="6.3" ry="5.2" fill={BLUE} />
      <circle cx="9" cy="20.5" r="3.6" fill={BLUE} />
      <circle cx="9" cy="20.5" r="1.7" fill={PINK} />
      <circle cx="4.3" cy="28" r="1.4" fill={PINK} />
      <circle cx="7.6" cy="26" r="1.1" fill={INK} />
      <g stroke={GREY_D} strokeWidth="0.4" strokeLinecap="round">
        <line x1="4.5" y1="29" x2="0" y2="30" />
        <line x1="4.5" y1="30" x2="0" y2="32" />
      </g>
      <g stroke={GREEN} strokeWidth="1" strokeLinecap="round">
        <path d="M14 40 l-1 3" />
        <path d="M22 40 l1 3" />
      </g>
    </g>
  );
}

export function RoosterIllustration() {
  return (
    <g>
      {/* green + blue sickle tail */}
      <path d="M25 34 Q36 30 32 13 Q30 25 24 28 Z" fill={GREEN} />
      <path d="M26 36 Q35 35 35 23 Q31 31 26 31 Z" fill={BLUE} />
      {/* red body, orange breast */}
      <ellipse cx="17" cy="30" rx="8.2" ry="7.2" fill={RED} />
      <path d="M10 30 Q9 39 14.5 41.5 Q16.5 34 15.5 30 Z" fill={ORANGE} />
      {/* red head + comb + wattle */}
      <circle cx="12" cy="20" r="4.7" fill={RED} />
      <path d="M8.4 15.5 q1 -3.2 2 0 q1 -3.2 2 0 q1 -3.2 2 0 v3 h-6 z" fill={RED} />
      <path d="M6.8 20 L1.6 21 L6.8 22.7 Z" fill={YELLOW} />
      <path d="M9 23 q-1.2 3.4 1 4.6 q2.2 -1.2 1 -4.6 z" fill={RED} />
      <circle cx="12" cy="19" r="1.1" fill={INK} />
      <circle cx="12.3" cy="18.6" r="0.4" fill="#fff" />
      {/* yellow legs + feet */}
      <g stroke={YELLOW} strokeWidth="1.3" strokeLinecap="round">
        <path d="M15 37 v5.5" />
        <path d="M19 37 v5.5" />
      </g>
      <g stroke={YELLOW} strokeWidth="0.8" strokeLinecap="round">
        <path d="M15 42.5 l-2 1.6 M15 42.5 l2 1.6" />
        <path d="M19 42.5 l-2 1.6 M19 42.5 l2 1.6" />
      </g>
    </g>
  );
}

export function CentipedeIllustration() {
  return (
    <g>
      {/* green legs first (behind body) */}
      <g stroke={GREEN} strokeWidth="1.3" strokeLinecap="round">
        <path d="M15 13 l-4 -2.5 M21 13 l4 -2.5" />
        <path d="M21.5 18 l4 -1 M14.5 18 l-4 -1" />
        <path d="M14 23 l-4 1 M22 23 l4 -1" />
        <path d="M21.5 29 l4 1 M14.5 29 l-4 -1" />
        <path d="M14 34 l-4 1 M22 34 l4 1" />
        <path d="M15.5 39 l-3.5 2 M20.5 39 l3.5 2" />
      </g>
      {/* red segmented body */}
      <path
        d="M18 10 C24 15, 12 19, 18 25 C24 31, 12 35, 18 41"
        fill="none"
        stroke={RED}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* head + antennae */}
      <circle cx="18" cy="9.5" r="3.7" fill={RED} />
      <path d="M16 6.3 l-2 -3.5 M20 6.3 l2 -3.5" stroke={GREEN} strokeWidth="1" strokeLinecap="round" />
      <circle cx="16.7" cy="9" r="0.7" fill="#fff" />
      <circle cx="19.3" cy="9" r="0.7" fill="#fff" />
    </g>
  );
}

export function AnimalIllustration({ id }: { id: string }) {
  if (id === "cat") return <CatIllustration />;
  if (id === "rat") return <RatIllustration />;
  if (id === "rooster") return <RoosterIllustration />;
  return <CentipedeIllustration />;
}

/* ---- Flowers (1 梅 / 2 兰 / 3 竹 / 4 菊) ---------------------------------- */
function Blossom({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g>
      {petals.map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={cx + Math.cos(rad) * r}
            cy={cy + Math.sin(rad) * r}
            r={r * 0.7}
            fill={fill}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.55} fill={YELLOW} />
    </g>
  );
}

export function FlowerIllustration({ bonus }: { bonus: number }) {
  switch (bonus) {
    case 1: // plum blossom 梅
      return (
        <g>
          <path d="M9 42 Q14 28 24 16" fill="none" stroke={BROWN} strokeWidth="2" strokeLinecap="round" />
          <path d="M14 30 L20 26" stroke={BROWN} strokeWidth="1.4" strokeLinecap="round" />
          <Blossom cx={24} cy={15} r={3.4} fill={PINK} />
          <Blossom cx={20} cy={25} r={3} fill={PINK} />
          <Blossom cx={12} cy={37} r={2.8} fill={PINK} />
        </g>
      );
    case 2: // orchid 兰
      return (
        <g>
          <g fill="none" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round">
            <path d="M16 44 Q6 30 11 14" />
            <path d="M18 44 Q18 28 18 12" />
            <path d="M20 44 Q30 30 25 15" />
          </g>
          <Blossom cx={18} cy={22} r={3.2} fill={PURPLE} />
          <Blossom cx={24} cy={28} r={2.4} fill={PINK} />
        </g>
      );
    case 3: // bamboo 竹
      return (
        <g>
          <g stroke={GREEN} strokeWidth="3" strokeLinecap="round">
            <path d="M14 44 L14 10" />
            <path d="M22 44 L22 16" />
          </g>
          <g stroke="#155f3c" strokeWidth="1">
            <line x1="11" y1="22" x2="17" y2="22" />
            <line x1="11" y1="32" x2="17" y2="32" />
            <line x1="19" y1="28" x2="25" y2="28" />
          </g>
          <g fill={GREEN}>
            <path d="M14 12 Q22 8 26 12 Q20 14 14 13 Z" />
            <path d="M22 18 Q30 16 32 21 Q26 21 22 19 Z" />
            <path d="M14 16 Q7 14 5 19 Q11 19 14 17 Z" />
          </g>
        </g>
      );
    default: // chrysanthemum 菊
      return (
        <g>
          <path d="M18 30 L18 44" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18 38 Q12 36 10 31 Q16 33 18 37 Z" fill={GREEN} />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <ellipse
                key={a}
                cx={18 + Math.cos(rad) * 7}
                cy={22 + Math.sin(rad) * 7}
                rx={3.4}
                ry={1.7}
                fill={ORANGE}
                transform={`rotate(${a} ${18 + Math.cos(rad) * 7} ${22 + Math.sin(rad) * 7})`}
              />
            );
          })}
          <circle cx="18" cy="22" r="3.4" fill={YELLOW} />
        </g>
      );
  }
}

/* ---- Seasons (1 春 / 2 夏 / 3 秋 / 4 冬) — botanical, like real tiles ----- */
export function SeasonIllustration({ bonus }: { bonus: number }) {
  switch (bonus) {
    case 1: // spring — orchid shoots
      return (
        <g>
          <g fill="none" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 44 Q6 30 11 13" />
            <path d="M18 44 Q18 27 18 11" />
            <path d="M21 44 Q30 30 25 14" />
          </g>
          <Blossom cx={18} cy={20} r={3} fill={PINK} />
        </g>
      );
    case 2: // summer — lotus
      return (
        <g>
          <path d="M18 42 L18 28" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="10" cy="40" rx="7" ry="2.4" fill={GREEN} />
          <ellipse cx="26" cy="40" rx="6" ry="2.2" fill="#2c9a63" />
          {[-26, -9, 9, 26].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <path
                key={a}
                d="M18 26 q-3 -8 0 -14 q3 6 0 14 z"
                fill={PINK}
                transform={`rotate(${a} 18 26)`}
              />
            );
          })}
          <path d="M18 26 q-2 -6 0 -11 q2 5 0 11 z" fill="#e07aa8" />
          <circle cx="18" cy="20" r="2" fill={YELLOW} />
        </g>
      );
    case 3: // autumn — chrysanthemum
      return (
        <g>
          <path d="M18 30 L18 44" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18 38 Q12 36 10 31 Q16 33 18 37 Z" fill={GREEN} />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <ellipse
                key={a}
                cx={18 + Math.cos(rad) * 7}
                cy={22 + Math.sin(rad) * 7}
                rx={3.4}
                ry={1.7}
                fill={ORANGE}
                transform={`rotate(${a} ${18 + Math.cos(rad) * 7} ${22 + Math.sin(rad) * 7})`}
              />
            );
          })}
          <circle cx="18" cy="22" r="3.2" fill={YELLOW} />
        </g>
      );
    default: // winter — plum blossom on a bare twig
      return (
        <g>
          <path d="M10 44 Q15 30 25 15" fill="none" stroke={BROWN} strokeWidth="2" strokeLinecap="round" />
          <path d="M15 30 L21 26" stroke={BROWN} strokeWidth="1.3" strokeLinecap="round" />
          <Blossom cx={25} cy={14} r={3.3} fill="#dfe7f2" />
          <Blossom cx={20} cy={25} r={2.8} fill="#cfe0f0" />
          <Blossom cx={12} cy={37} r={2.6} fill="#dfe7f2" />
        </g>
      );
  }
}

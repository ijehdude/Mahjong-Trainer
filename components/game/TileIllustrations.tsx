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
      <path d="M26 41 q7 -2 4.5 -11 q-1.5 -4 -4 -2.5 q3 4.5 0.5 8.5 q-2 3.5 -4 3.5 z" fill={GREY} />
      <path d="M11.5 44 Q9.5 27 18 24.5 Q26.5 27 24.5 44 Z" fill={GREY} />
      <circle cx="18" cy="18" r="7" fill={GREY} />
      <path d="M11 14 L9.5 5.5 L16 11.5 Z" fill={GREY} />
      <path d="M25 14 L26.5 5.5 L20 11.5 Z" fill={GREY} />
      <path d="M12 12 L11.3 8.5 L14.3 11 Z" fill={PINK} />
      <path d="M24 12 L24.7 8.5 L21.7 11 Z" fill={PINK} />
      <ellipse cx="15" cy="17.5" rx="1.4" ry="2.1" fill={GREEN} />
      <ellipse cx="21" cy="17.5" rx="1.4" ry="2.1" fill={GREEN} />
      <circle cx="15" cy="18" r="0.7" fill={INK} />
      <circle cx="21" cy="18" r="0.7" fill={INK} />
      <path d="M16.7 21 L19.3 21 L18 22.6 Z" fill={PINK} />
      <g stroke={GREY_D} strokeWidth="0.5" strokeLinecap="round">
        <line x1="13" y1="21" x2="6.5" y2="20" />
        <line x1="13" y1="22.4" x2="6.5" y2="23.4" />
        <line x1="23" y1="21" x2="29.5" y2="20" />
        <line x1="23" y1="22.4" x2="29.5" y2="23.4" />
      </g>
    </g>
  );
}

export function RatIllustration() {
  return (
    <g>
      <path d="M24 38 q11 1 7 -11" fill="none" stroke={PINK} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="18" cy="33" rx="10.5" ry="7.5" fill={GREY} />
      <ellipse cx="10" cy="27" rx="6.2" ry="5.2" fill={GREY} />
      <circle cx="9.5" cy="20.5" r="3.6" fill={GREY} />
      <circle cx="9.5" cy="20.5" r="1.8" fill={PINK} />
      <circle cx="4.6" cy="28" r="1.4" fill={PINK} />
      <circle cx="8" cy="26" r="1.2" fill={INK} />
      <g stroke={GREY_D} strokeWidth="0.4" strokeLinecap="round">
        <line x1="5" y1="29" x2="0.5" y2="30" />
        <line x1="5" y1="30" x2="0.5" y2="32" />
      </g>
      <path d="M15 40 l-1 3 M22 40 l1 3" stroke={PINK} strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

export function RoosterIllustration() {
  return (
    <g>
      <path d="M25 35 Q35 31 33 16 Q29 26 24 28 Z" fill={GREEN} />
      <path d="M26 36 Q34 35 35 25 Q31 31 26 31 Z" fill={BLUE} />
      <ellipse cx="17" cy="30" rx="8.2" ry="7.2" fill={ORANGE} />
      <path d="M10 30 Q9 38 14 41 Q16 34 15.5 30 Z" fill={YELLOW} />
      <circle cx="12" cy="20" r="4.6" fill={ORANGE} />
      <path d="M8.5 15.5 q1 -3.2 2 0 q1 -3.2 2 0 q1 -3.2 2 0 v3 h-6 z" fill={RED} />
      <path d="M7 20 L2 21 L7 22.6 Z" fill={YELLOW} />
      <path d="M9 23 q-1.2 3.2 1 4.4 q2.2 -1.2 1 -4.4 z" fill={RED} />
      <circle cx="12" cy="19" r="1.1" fill={INK} />
      <g stroke={YELLOW} strokeWidth="1.2" strokeLinecap="round">
        <path d="M15 37 l0 5" />
        <path d="M19 37 l0 5" />
      </g>
      <g stroke={YELLOW} strokeWidth="0.8" strokeLinecap="round">
        <path d="M15 42 l-2 1.5 M15 42 l2 1.5" />
        <path d="M19 42 l-2 1.5 M19 42 l2 1.5" />
      </g>
    </g>
  );
}

export function CentipedeIllustration() {
  return (
    <g>
      <path
        d="M18 10 C24 15, 12 19, 18 25 C24 31, 12 35, 18 41"
        fill="none"
        stroke={RED}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <g stroke="#8a2820" strokeWidth="1" strokeLinecap="round">
        <path d="M15 13 l-3.5 -2 M21 13 l3.5 -2" />
        <path d="M21 18 l3.5 -1 M15 18 l-3.5 -1" />
        <path d="M14.5 23 l-3.5 1 M21.5 23 l3.5 -1" />
        <path d="M21 29 l3.5 1 M15 29 l-3.5 -1" />
        <path d="M14.5 34 l-3.5 1 M21.5 34 l3.5 1" />
        <path d="M16 39 l-3 2 M20 39 l3 2" />
      </g>
      <circle cx="18" cy="9.5" r="3.6" fill="#8a2820" />
      <path d="M16 6.5 l-2 -3.5 M20 6.5 l2 -3.5" stroke="#8a2820" strokeWidth="1" strokeLinecap="round" />
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

/* ---- Seasons (1 春 / 2 夏 / 3 秋 / 4 冬) ---------------------------------- */
export function SeasonIllustration({ bonus }: { bonus: number }) {
  switch (bonus) {
    case 1: // spring — sprout
      return (
        <g>
          <path d="M18 44 L18 22" stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
          <path d="M18 30 Q8 28 7 18 Q17 20 18 28 Z" fill={GREEN} />
          <path d="M18 26 Q28 24 29 14 Q19 16 18 24 Z" fill="#2c9a63" />
          <circle cx="18" cy="14" r="3" fill={PINK} />
        </g>
      );
    case 2: // summer — sun
      return (
        <g>
          <g stroke={ORANGE} strokeWidth="1.6" strokeLinecap="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
              const rad = (a * Math.PI) / 180;
              return (
                <line
                  key={a}
                  x1={18 + Math.cos(rad) * 9}
                  y1={24 + Math.sin(rad) * 9}
                  x2={18 + Math.cos(rad) * 13}
                  y2={24 + Math.sin(rad) * 13}
                />
              );
            })}
          </g>
          <circle cx="18" cy="24" r="8" fill={YELLOW} />
          <circle cx="18" cy="24" r="8" fill="none" stroke={ORANGE} strokeWidth="1" />
        </g>
      );
    case 3: // autumn — maple leaf
      return (
        <g>
          <path d="M18 44 L18 32" stroke={BROWN} strokeWidth="1.4" strokeLinecap="round" />
          <path
            d="M18 8 L21 16 L27 14 L23 21 L29 24 L22 25 L24 33 L18 28 L12 33 L14 25 L7 24 L13 21 L9 14 L15 16 Z"
            fill={ORANGE}
          />
          <path d="M18 12 L18 30" stroke="#a8531f" strokeWidth="0.8" />
        </g>
      );
    default: // winter — snowflake
      return (
        <g stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" fill="none">
          {[0, 60, 120].map((a) => {
            const rad = (a * Math.PI) / 180;
            const dx = Math.cos(rad) * 13;
            const dy = Math.sin(rad) * 13;
            return <line key={a} x1={18 - dx} y1={24 - dy} x2={18 + dx} y2={24 + dy} />;
          })}
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const rad = (a * Math.PI) / 180;
            const bx = 18 + Math.cos(rad) * 8;
            const by = 24 + Math.sin(rad) * 8;
            const ex = 18 + Math.cos(rad) * 13;
            const ey = 24 + Math.sin(rad) * 13;
            const pr = ((a + 35) * Math.PI) / 180;
            const pr2 = ((a - 35) * Math.PI) / 180;
            return (
              <g key={a}>
                <line x1={bx} y1={by} x2={bx + Math.cos(pr) * 3} y2={by + Math.sin(pr) * 3} />
                <line x1={bx} y1={by} x2={bx + Math.cos(pr2) * 3} y2={by + Math.sin(pr2) * 3} />
                <circle cx={ex} cy={ey} r="0.4" fill={BLUE} />
              </g>
            );
          })}
        </g>
      );
  }
}

import { ButtonHTMLAttributes } from "react";

type Variant = "gold" | "ghost" | "outline";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const VARIANT: Record<Variant, string> = {
  gold: "bg-[var(--accent-gold)] text-[var(--bg-dark)] hover:brightness-110 shadow-[0_0_24px_rgba(201,168,76,0.35)] font-semibold tracking-wide",
  ghost:
    "bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)]",
  outline:
    "bg-transparent text-[var(--text-primary)] border border-[rgba(201,168,76,0.4)] hover:border-[var(--accent-gold)]",
};

export default function Button({
  variant = "ghost",
  fullWidth,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`rounded-xl px-5 py-3 text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${
        VARIANT[variant]
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

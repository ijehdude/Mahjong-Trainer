import { ReactNode } from "react";

interface Props {
  title: string; // Chinese (primary)
  en: string; // English (secondary)
  helper?: string;
  children: ReactNode;
}

export default function SettingsCard({ title, en, helper, children }: Props) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
          {title}{" "}
          <span className="text-[11px] font-normal uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {en}
          </span>
        </h2>
        {helper && (
          <p className="mt-1 text-xs text-[var(--text-muted)]/80">{helper}</p>
        )}
      </div>
      {children}
    </section>
  );
}

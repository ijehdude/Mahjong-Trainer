import { ReactNode } from "react";

interface Props {
  title: string;
  helper?: string;
  children: ReactNode;
}

export default function SettingsCard({ title, helper, children }: Props) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {title}
        </h2>
        {helper && (
          <p className="mt-1 text-xs text-[var(--text-muted)]/80">{helper}</p>
        )}
      </div>
      {children}
    </section>
  );
}

interface Option<T> {
  label: string;
  value: T;
}

interface Props<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl py-3 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
              active
                ? "bg-[var(--accent-gold)] text-[var(--bg-dark)] shadow-[0_0_16px_rgba(201,168,76,0.3)]"
                : "bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] border border-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

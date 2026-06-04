import Toggle from "@/components/shared/Toggle";

interface Props {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export default function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </div>
        {description && (
          <div className="mt-0.5 text-xs text-[var(--text-muted)]">
            {description}
          </div>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

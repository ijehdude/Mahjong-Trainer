interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
}

export default function Toggle({ checked, onChange, id }: Props) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-[var(--accent-gold)]" : "bg-[rgba(255,255,255,0.12)]"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

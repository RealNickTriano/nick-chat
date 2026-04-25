interface StatRowProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
}

export function StatRow({ label, value, sub, accentColor }: StatRowProps) {
  return (
    <div className="flex flex-col border-b border-[var(--border)] py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text3)] mb-[3px]">
        {label}
      </div>
      <div
        className="font-mono text-xl font-semibold tracking-[-0.03em]"
        style={{ color: accentColor ?? "var(--text)" }}
      >
        {value}
      </div>
      {sub && <div className="mt-[1px] text-[11px] text-[var(--text3)]">{sub}</div>}
    </div>
  );
}

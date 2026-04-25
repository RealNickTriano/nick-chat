interface LatencyBarProps {
  label: string;
  ms: number;
  maxMs: number;
  color: string;
}

export function LatencyBar({ label, ms, maxMs, color }: LatencyBarProps) {
  const pct = Math.min(100, (ms / maxMs) * 100);
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="w-[68px] shrink-0 text-[11px] text-[var(--text2)]">{label}</span>
      <div className="h-[3px] flex-1 rounded-[2px] bg-[var(--bg3)]">
        <div className="h-full rounded-[2px]" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-[38px] text-right font-mono text-[11px] text-[var(--text3)]">{ms}ms</span>
    </div>
  );
}

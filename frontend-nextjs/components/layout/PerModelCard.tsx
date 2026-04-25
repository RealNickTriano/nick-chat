interface PerModelCardProps {
  label: string;
  color: string;
  tokens: number;
  cost: number;
  totalTokens: number;
}

export function PerModelCard({ label, color, tokens, cost, totalTokens }: PerModelCardProps) {
  const pct = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="flex-1 truncate text-xs font-medium text-[var(--text)]">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="rounded-md bg-[var(--bg2)] px-2 py-[5px]">
          <div className="text-[10px] text-[var(--text3)]">Tokens</div>
          <div className="font-mono text-[13px] font-medium">{tokens.toLocaleString()}</div>
        </div>
        <div className="rounded-md bg-[var(--bg2)] px-2 py-[5px]">
          <div className="text-[10px] text-[var(--text3)]">Cost</div>
          <div className="font-mono text-[13px] font-medium">${cost.toFixed(4)}</div>
        </div>
      </div>
      <div className="mt-[5px] h-[3px] rounded-[2px] bg-[var(--bg3)]">
        <div
          className="h-full rounded-[2px] transition-[width] duration-300"
          style={{ width: `${pct.toFixed(1)}%`, background: color }}
        />
      </div>
    </div>
  );
}

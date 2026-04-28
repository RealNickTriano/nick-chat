"use client";

import { providerColor } from "@/components/chat/AgentAvatar";
import { ChevronRightIcon } from "@/components/svg/ChevronRight";
import { providerLabel } from "@/lib/models";
import type { Message } from "@/types/chat";
import type { ProviderId } from "@/types/model";
import { LatencyBar } from "./LatencyBar";
import { PerModelCard } from "./PerModelCard";
import { StatRow } from "./StatRow";

interface RightSidebarProps {
  open: boolean;
  onToggle: () => void;
  messages: Message[];
}

const STATS_W = 260;

const iconButton =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[var(--text2)] transition-colors hover:bg-[var(--bg3)]";

const HARDCODED_LATENCY: Record<string, number> = {
  OPEN_AI: 1240,
  ANTHROPIC: 980,
  GOOGLE: 1580,
  MISTRAL: 1100,
};

export function RightSidebar({ open, onToggle, messages }: RightSidebarProps) {
  const agentMsgs = messages.filter((m) => m.role === "assistant");
  const totalTokens = agentMsgs.reduce((s, m) => s + (m.tokens ?? 0), 0);
  const totalCost = agentMsgs.reduce((s, m) => s + (m.cost ?? 0), 0);
  const turns = agentMsgs.length;

  const usedProviders = Array.from(
    new Set(agentMsgs.map((m) => m.providerId).filter((p): p is string => Boolean(p))),
  );

  const breakdown = usedProviders.map((pid) => {
    const msgs = agentMsgs.filter((m) => m.providerId === pid);
    const tok = msgs.reduce((s, m) => s + (m.tokens ?? 0), 0);
    const cost = msgs.reduce((s, m) => s + (m.cost ?? 0), 0);
    return {
      providerId: pid,
      label: providerLabel(pid as ProviderId),
      color: providerColor(pid as ProviderId),
      tok,
      cost,
    };
  });

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg)] transition-[width,min-width] duration-200 ease-out"
      style={{
        width: open ? STATS_W : 0,
        minWidth: open ? STATS_W : 0,
      }}
    >
      <div className="flex h-full flex-col" style={{ width: STATS_W, minWidth: STATS_W }}>
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3.5 pt-3 pb-3">
          <button
            type="button"
            onClick={onToggle}
            className={iconButton}
            aria-label="Collapse stats"
            title="Collapse"
          >
            <ChevronRightIcon size={15} />
          </button>
          <span className="text-[13px] font-semibold">Session Stats</span>
        </div>

        <div className="chat-scroll flex-1 overflow-y-auto px-4">
          <StatRow
            label="Total Tokens"
            value={totalTokens.toLocaleString()}
            sub={`${turns} agent responses`}
          />
          <StatRow
            label="Estimated Cost"
            value={`$${totalCost.toFixed(4)}`}
            sub="This session"
            accentColor="var(--agent-b)"
          />
          <StatRow label="Agents Active" value={usedProviders.length} sub="Models engaged" />

          {/* Per-model */}
          {breakdown.length > 0 && (
            <div className="pt-3.5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text3)]">
                Per-model
              </div>
              {breakdown.map((m) => (
                <PerModelCard
                  key={m.providerId}
                  label={m.label}
                  color={m.color}
                  tokens={m.tok}
                  cost={m.cost}
                  totalTokens={totalTokens}
                />
              ))}
            </div>
          )}

          {/* Latency */}
          {usedProviders.length > 0 && (
            <div className="pt-1">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text3)]">
                Latency
              </div>
              {usedProviders.map((pid) => (
                <LatencyBar
                  key={pid}
                  label={providerLabel(pid as ProviderId)}
                  ms={HARDCODED_LATENCY[pid] ?? 1000}
                  maxMs={2000}
                  color={providerColor(pid as ProviderId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {/* <div className="border-t border-[var(--border)] px-4 pt-2.5 pb-3.5">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-transparent px-2.5 py-[7px] text-xs text-[var(--text2)] transition-colors hover:bg-[var(--bg2)]"
          >
            <TrashIcon size={13} />
            <span>Clear session data</span>
          </button>
        </div> */}
      </div>
    </div>
  );
}

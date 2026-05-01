import { ClockIcon } from "@/components/svg/Clock";
import { MessageLabelTooltip } from "./MessageLabelTooltip";

interface LatencyMessageLabelProps {
  latencyMs?: number | null;
}

export function LatencyMessageLabel({ latencyMs }: LatencyMessageLabelProps) {
  if (latencyMs == null) return null;
  return (
    <MessageLabelTooltip text="Total response time">
      <span className="flex items-center gap-0.5 hover:cursor-pointer">
        <ClockIcon width={10} height={10} />
        {latencyMs} ms
      </span>
    </MessageLabelTooltip>
  );
}

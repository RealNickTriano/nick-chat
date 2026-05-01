import { MessageLabelTooltip } from "./MessageLabelTooltip";

interface TtftMessageLabelProps {
  ttftMs?: number | null;
}

export function TtftMessageLabel({ ttftMs }: TtftMessageLabelProps) {
  if (ttftMs == null) return null;
  return (
    <MessageLabelTooltip text="Time to first token">
      <span className="hover:cursor-pointer">TTFT {ttftMs} ms</span>
    </MessageLabelTooltip>
  );
}

import { MessageLabelTooltip } from "./MessageLabelTooltip";

interface FinishReasonMessageLabelProps {
  finishReason?: string | null;
}

export function FinishReasonMessageLabel({ finishReason }: FinishReasonMessageLabelProps) {
  if (finishReason == null || finishReason === "STOP") return null;
  return (
    <MessageLabelTooltip text="Finish reason">
      <span>{finishReason.toLowerCase().replace(/_/g, " ")}</span>
    </MessageLabelTooltip>
  );
}

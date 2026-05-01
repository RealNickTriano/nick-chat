import { SigmaIcon } from "@/components/svg/Sigma";
import { MessageLabelTooltip } from "./MessageLabelTooltip";

interface TotalTokensMessageLabelProps {
  totalTokens?: number | null;
}

export function TotalTokensMessageLabel({ totalTokens }: TotalTokensMessageLabelProps) {
  if (totalTokens == null) return null;
  return (
    <MessageLabelTooltip text="Total tokens (input + output)">
      <span className="flex items-center gap-0.5 hover:cursor-pointer">
        <SigmaIcon width={10} height={10} />
        {totalTokens} tok
      </span>
    </MessageLabelTooltip>
  );
}

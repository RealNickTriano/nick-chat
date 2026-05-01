import { ArrowDownIcon } from "@/components/svg/ArrowDown";
import { MessageLabelTooltip } from "./MessageLabelTooltip";

interface OutputTokensMessageLabelProps {
  outputTokens?: number | null;
}

export function OutputTokensMessageLabel({ outputTokens }: OutputTokensMessageLabelProps) {
  if (outputTokens == null) return null;
  return (
    <MessageLabelTooltip text="Output tokens">
      <span className="flex items-center gap-0.5 hover:cursor-pointer">
        <ArrowDownIcon width={10} height={10} />
        {outputTokens} tok
      </span>
    </MessageLabelTooltip>
  );
}

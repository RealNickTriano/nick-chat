import { MessageLabelTooltip } from "./MessageLabelTooltip";

interface ResolvedModelMessageLabelProps {
  resolvedModel?: string | null;
  requestedModel?: string | null;
}

export function ResolvedModelMessageLabel({
  resolvedModel,
  requestedModel,
}: ResolvedModelMessageLabelProps) {
  if (resolvedModel == null) return null;
  if (resolvedModel === requestedModel) return null;
  return (
    <MessageLabelTooltip text={`Resolved from ${requestedModel}`}>
      <span className="hover:cursor-pointer">{resolvedModel}</span>
    </MessageLabelTooltip>
  );
}

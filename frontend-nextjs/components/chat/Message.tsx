"use client";

import type { Message as ChatMessage } from "@/types/chat";
import type { ProviderId } from "@/types/model";
import { providerLabel } from "@/lib/models";
import { useModelCatalog } from "@/lib/catalog";
import { MarkdownContent } from "./MarkdownContent";
import { ProviderIconBadge } from "../api-keys/ProviderIconBadge";
import { OutputTokensMessageLabel } from "./OutputTokensMessageLabel";
import { LatencyMessageLabel } from "./LatencyMessageLabel";
import { TtftMessageLabel } from "./TtftMessageLabel";
import { FinishReasonMessageLabel } from "./FinishReasonMessageLabel";
import { ResolvedModelMessageLabel } from "./ResolvedModelMessageLabel";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const { models } = useModelCatalog();

  if (message.role === "user") {
    return (
      <div className="flex w-full justify-end">
        <div
          className="max-w-[62%] bg-[var(--accent)] px-[15px] py-2.5 text-sm leading-relaxed text-white"
          style={{ borderRadius: "18px 18px 4px 18px" }}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>
      </div>
    );
  }

  const providerId = (message.provider ?? "") as ProviderId;
  const modelId = message.model ?? "";
  const modelDisplayName = models.find((m) => m.id === modelId)?.displayName ?? modelId;
  const label =
    (providerId ? providerLabel(providerId) : "Assistant") +
    (modelDisplayName ? ` - ${modelDisplayName}` : "");

  return (
    <div className="flex w-full items-start gap-2.5">
      <ProviderIconBadge provider={providerId} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-[var(--text2)]">{label}</span>
        </div>
        <div
          className="bg-[var(--bg2)] px-[15px] py-2.5 text-sm leading-[1.65] text-[var(--text)]"
          style={{ borderRadius: "4px 18px 18px 18px" }}
        >
          <MarkdownContent content={message.content} streaming={message.status === "streaming"} />
          {message.status === "error" && message.error && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">{message.error}</div>
          )}
        </div>
        <div className="mt-[5px] flex gap-3 font-mono text-xs text-[var(--text3)]">
          <OutputTokensMessageLabel outputTokens={message.outputTokens} />
          <LatencyMessageLabel latencyMs={message.latencyMs} />
          <TtftMessageLabel ttftMs={message.ttftMs} />
          <FinishReasonMessageLabel finishReason={message.finishReason} />
          <ResolvedModelMessageLabel
            resolvedModel={message.resolvedModel}
            requestedModel={message.model}
          />
        </div>
      </div>
    </div>
  );
}

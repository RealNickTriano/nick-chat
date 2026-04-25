"use client";

import { useEffect, useRef } from "react";
import type { Message as ChatMessage } from "@/types/chat";
import type { ProviderId } from "@/types/model";
import { Message } from "./Message";
import { TypingIndicator } from "./TypingIndicator";

interface ConversationProps {
  messages: ChatMessage[];
  typingProviderId?: ProviderId;
}

export function Conversation({ messages, typingProviderId }: ConversationProps) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, typingProviderId]);

  return (
    <ol
      ref={listRef}
      aria-live="polite"
      aria-atomic="false"
      className="chat-scroll flex max-h-full min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-6"
    >
      {messages.map((m) => (
        <li key={m.id}>
          <Message message={m} />
        </li>
      ))}
      {typingProviderId && (
        <li>
          <TypingIndicator providerId={typingProviderId} />
        </li>
      )}
    </ol>
  );
}

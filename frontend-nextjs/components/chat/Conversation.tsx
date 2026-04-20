"use client";

import { useEffect, useRef } from "react";
import type { Message as ChatMessage } from "@/types/chat";
import { Message } from "./Message";

interface ConversationProps {
  messages: ChatMessage[];
}

export function Conversation({ messages }: ConversationProps) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <ol
      ref={listRef}
      aria-live="polite"
      aria-atomic="false"
      className="chat-scroll flex max-h-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
    >
      {messages.map((m) => (
        <li key={m.id}>
          <Message message={m} />
        </li>
      ))}
    </ol>
  );
}

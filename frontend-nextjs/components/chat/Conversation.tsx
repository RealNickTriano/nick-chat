"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Message as ChatMessage } from "@/types/chat";
import type { ProviderId } from "@/types/model";
import { Message } from "./Message";
import { TypingIndicator } from "./TypingIndicator";
import { ChevronDownIcon } from "@/components/svg/ChevronDown";

interface ConversationProps {
  messages: ChatMessage[];
  typingProviderId?: ProviderId;
  loading?: boolean;
}

const BOTTOM_THRESHOLD = 80;

export function Conversation({ messages, typingProviderId, loading }: ConversationProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  const handleScroll = useCallback(() => {
    setShowScrollButton(!isNearBottom());
  }, [isNearBottom]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (isNearBottom()) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, typingProviderId, isNearBottom]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ol
        ref={listRef}
        onScroll={handleScroll}
        aria-live="polite"
        aria-atomic="false"
        className="chat-scroll flex max-h-full min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-6"
      >
        {loading ? (
          <li className="flex justify-center pt-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[var(--text3)]"
                  style={{
                    animation: "typing-bounce 1.2s infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </li>
        ) : (
          <>
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
          </>
        )}
      </ol>

      <button
        onClick={scrollToBottom}
        aria-label="Scroll to bottom"
        className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--text2)] shadow-sm transition-all duration-200 hover:bg-[var(--bg2)] hover:text-[var(--text)] ${showScrollButton ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
      >
        <ChevronDownIcon />
        Back to bottom
      </button>
    </div>
  );
}

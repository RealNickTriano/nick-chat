"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useChatStream } from "@/hooks/use-chat-stream";

type ChatState = ReturnType<typeof useChatStream>;

const ChatContext = createContext<ChatState | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const value = useChatStream();
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatState {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used inside <ChatProvider>");
  }
  return ctx;
}

"use client";

import type { Chat } from "@/types/chat";

interface ChatHistoryItemProps {
  chat: Chat;
  active: boolean;
  onClick: () => void;
}

export function ChatHistoryItem({ chat, active, onClick }: ChatHistoryItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-[1px] block w-full truncate rounded-md px-2.5 py-[7px] text-left text-[13px] transition-colors hover:bg-[var(--bg2)] ${
        active ? "bg-[var(--accent-light)] text-[var(--accent)] font-medium" : "text-[var(--text)]"
      }`}
    >
      {chat.title}
    </button>
  );
}

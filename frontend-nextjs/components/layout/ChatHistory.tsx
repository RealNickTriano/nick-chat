"use client";

import { useState } from "react";
import { SearchIcon } from "@/components/svg/Search";
import type { Chat } from "@/types/chat";
import { ChatHistoryItem } from "./ChatHistoryItem";

interface ChatHistoryProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}

type Group = "Today" | "Yesterday" | "Last Week" | "Last Month";

function timeGroup(date: Date): Group | null {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 6) return "Last Week";
  if (diffDays <= 29) return "Last Month";
  return null;
}

const GROUP_ORDER: Group[] = ["Today", "Yesterday", "Last Week", "Last Month"];
const MAX_CHATS = 10;

export function ChatHistory({ chats, activeChatId, onSelectChat }: ChatHistoryProps) {
  const [search, setSearch] = useState("");

  const recent = [...chats]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, MAX_CHATS)
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  const groups: Record<Group, Chat[]> = {
    Today: [],
    Yesterday: [],
    "Last Week": [],
    "Last Month": [],
  };
  recent.forEach((c) => {
    const g = timeGroup(c.createdAt);
    if (g) groups[g].push(c);
  });

  return (
    <>
      {/* Search */}
      <div className="relative px-2.5 pb-2">
        <SearchIcon
          size={13}
          className="pointer-events-none absolute left-[22px] top-1/2 -translate-y-1/2 text-[var(--text3)]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats…"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] py-[7px] pl-[30px] pr-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--text3)]"
        />
      </div>

      {/* Grouped list */}
      <div className="chat-scroll flex-1 overflow-y-auto px-1.5">
        {GROUP_ORDER.map((group) => {
          const items = groups[group];
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text3)]">
                {group}
              </div>
              {items.map((chat) => (
                <ChatHistoryItem
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeChatId}
                  onClick={() => onSelectChat(chat.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

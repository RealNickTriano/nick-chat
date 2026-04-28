"use client";

import { useState } from "react";
import type { Chat } from "@/types/chat";
import { ChatHistory } from "./ChatHistory";
import { NewChatButton } from "./NewChatButton";
import { LeftSidebarHeader } from "./LeftSidebarHeader";
import { UserBanner } from "./UserBanner";
import { ApiKeysModal } from "../api-keys/ApiKeysModal";

interface LeftSidebarProps {
  open: boolean;
  onToggle: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

const SIDEBAR_W = 240;

export function LeftSidebar({
  open,
  onToggle,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
}: LeftSidebarProps) {
  const [keysOpen, setKeysOpen] = useState(false);

  return (
    <div
      className="flex h-full overflow-hidden border-r border-[var(--border)] bg-[var(--bg)] transition-[width,min-width] duration-200 ease-out"
      style={{
        width: open ? SIDEBAR_W : 0,
        minWidth: open ? SIDEBAR_W : 0,
      }}
    >
      <div className="flex h-full flex-col" style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W }}>
        <LeftSidebarHeader onCollapse={onToggle} />

        <NewChatButton onClick={onNewChat} />

        <ChatHistory chats={chats} activeChatId={activeChatId} onSelectChat={onSelectChat} />

        <ApiKeysModal open={keysOpen} onClose={() => setKeysOpen(false)} />
        <UserBanner onClick={() => setKeysOpen(true)} />
      </div>
    </div>
  );
}

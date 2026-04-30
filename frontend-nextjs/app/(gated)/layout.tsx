"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ChatProvider, useChat } from "@/components/chat/ChatProvider";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { Chat } from "@/types/chat";

const MOCK_CHATS: Chat[] = [];

function Shell({ children }: { children: ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string>("c1");
  const { messages, title } = useChat();
  const displayTitle = title ?? "New chat";

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg)]">
      <LeftSidebar
        open={leftOpen}
        onToggle={() => setLeftOpen((o) => !o)}
        chats={MOCK_CHATS}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={() => {
          /* TODO: wire to backend when /chats API exists */
        }}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          title={displayTitle}
          leftOpen={leftOpen}
          // rightOpen={rightOpen}
          onToggleLeft={() => setLeftOpen((o) => !o)}
          // onToggleRight={() => setRightOpen((o) => !o)}
        />
        {children}
      </div>

      <RightSidebar open={rightOpen} onToggle={() => setRightOpen((o) => !o)} messages={messages} />
    </div>
  );
}

export default function GatedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <ChatProvider>
        <Shell>{children}</Shell>
      </ChatProvider>
    </AuthGate>
  );
}

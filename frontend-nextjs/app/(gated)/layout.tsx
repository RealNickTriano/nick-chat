"use client";

import { useEffect } from "react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { ChatProvider, useChat } from "@/components/chat/ChatProvider";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useChats } from "@/lib/chats";

function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const { messages, title, chatId } = useChat();
  const { chats, addChat, updateTitle } = useChats();
  const activeChat = chats.find((c) => c.id === chatId);
  const displayTitle = title ?? activeChat?.title ?? "New chat";

  useEffect(() => {
    if (chatId) addChat(chatId);
  }, [chatId, addChat]);

  useEffect(() => {
    if (chatId && title) updateTitle(chatId, title);
  }, [title, chatId, updateTitle]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg)]">
      <LeftSidebar
        open={leftOpen}
        onToggle={() => setLeftOpen((o) => !o)}
        chats={chats}
        activeChatId={chatId}
        onSelectChat={(id) => router.push(`/chats/${id}`)}
        onNewChat={() => router.push("/")}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          title={displayTitle}
          leftOpen={leftOpen}
          onToggleLeft={() => setLeftOpen((o) => !o)}
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

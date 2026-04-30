"use client";

import { ChatError } from "@/components/chat/ChatError";
import { useChat } from "@/components/chat/ChatProvider";
import { Composer } from "@/components/chat/Composer";
import { Conversation } from "@/components/chat/Conversation";

export default function ChatPage() {
  const { messages, send, status, error } = useChat();

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Conversation messages={messages} loading={status === "loading"} />

      <div className="border-t border-[var(--border)] bg-[var(--bg)] px-6 py-4">
        {status === "error" && (
          <div className="mb-2">
            <ChatError message={error} />
          </div>
        )}
        <Composer
          onSubmit={({ text, model, provider }) => send(text, model, provider)}
          disabled={status === "streaming" || status === "loading"}
        />
      </div>
    </main>
  );
}

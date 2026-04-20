"use client";

import { ChatError } from "@/components/chat/ChatError";
import { Composer } from "@/components/chat/Composer";
import { Conversation } from "@/components/chat/Conversation";
import { useChatStream } from "@/hooks/use-chat-stream";

export default function Home() {
  const { messages, send, status, error } = useChatStream();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 max-h-full">
      <Conversation messages={messages} />

      {status === "error" && <ChatError message={error} />}

      <Composer
        onSubmit={({ text, model, provider }) => send(text, model, provider)}
        disabled={status === "streaming"}
      />
    </main>
  );
}

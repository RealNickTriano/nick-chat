"use client";

import { ChatError } from "@/components/chat/ChatError";
import { Composer } from "@/components/chat/Composer";
import { Conversation } from "@/components/chat/Conversation";
import { useChatStream } from "@/hooks/use-chat-stream";
import sampleMessages from "../lib/sample-messages.json";

export default function Home() {
  const { messages, send, status, error } = useChatStream();

  return (
    <main className="flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 max-h-full">
      <Conversation messages={sampleMessages} />

      {status === "error" && <ChatError message={error} />}

      <Composer
        onSubmit={({ text, model, provider }) => send(text, model, provider)}
        disabled={status === "streaming"}
      />
    </main>
  );
}

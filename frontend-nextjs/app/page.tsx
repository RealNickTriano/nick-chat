"use client";

import { useState } from "react";
import { Composer } from "@/components/chat/Composer";

interface SubmittedMessage {
  id: number;
  text: string;
  model: string;
}

export default function Home() {
  const [messages, setMessages] = useState<SubmittedMessage[]>([]);

  const handleSubmit = ({ text, model }: { text: string; model: string }) => {
    setMessages((prev) => [...prev, { id: prev.length + 1, text, model }]);
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <ul className="flex flex-1 flex-col gap-3">
        {messages.map((m) => (
          <li
            key={m.id}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
          >
            <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">{m.model}</div>
            <div className="whitespace-pre-wrap">{m.text}</div>
          </li>
        ))}
      </ul>

      <Composer onSubmit={handleSubmit} />
    </main>
  );
}

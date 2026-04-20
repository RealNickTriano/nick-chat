"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatStream } from "@/lib/chat-stream";
import type { Message, Role } from "@/types/chat";
import type { ProviderId } from "@/types/model";

type HookStatus = "idle" | "streaming" | "error";

interface UseChatStreamResult {
  messages: Message[];
  status: HookStatus;
  error: string | null;
  send: (text: string, model: string, provider: ProviderId) => void;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useChatStream(): UseChatStreamResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<HookStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });

  const inflightRef = useRef<AbortController | null>(null);

  const send = useCallback((text: string, model: string, provider: ProviderId) => {
    const userId = makeId();
    const assistantId = makeId();

    const history: Array<{ role: Role; content: string }> = messagesRef.current
      .filter((m) => m.status === "complete")
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: text });

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: text, status: "complete" },
      { id: assistantId, role: "assistant", content: "", status: "streaming" },
    ]);
    setStatus("streaming");
    setError(null);

    inflightRef.current?.abort();
    const controller = new AbortController();
    inflightRef.current = controller;

    void (async () => {
      let receivedDelta = false;
      try {
        const eventStream = chatStream({ provider, model, messages: history }, controller.signal);
        for await (const event of eventStream) {
          if (event.type === "delta") {
            receivedDelta = true;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.text } : m,
              ),
            );
          } else if (event.type === "done") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, status: "complete" } : m)),
            );
            setStatus("idle");
            return;
          } else if (event.type === "error") {
            if (receivedDelta) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, status: "error", error: event.message } : m,
                ),
              );
              setStatus("idle");
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== assistantId));
              setError(event.message);
              setStatus("error");
            }
            return;
          }
        }
      } finally {
        if (inflightRef.current === controller) inflightRef.current = null;
      }
    })();
  }, []);

  return { messages, status, error, send };
}

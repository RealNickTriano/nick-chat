import { http } from "./http";
import type { Message } from "@/types/chat";

interface BackendMessage {
  id: string;
  role: "user" | "assistant";
  provider: string;
  model: string;
  content: string;
  createdAt: string;
}

function toMessage(m: BackendMessage): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    status: "complete",
    provider: m.provider,
    model: m.model,
    createdAt: new Date(m.createdAt),
  };
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  const res = await http.get<{ messages: BackendMessage[] }>(`/chats/${chatId}/messages`);
  return res.data.messages.map(toMessage);
}

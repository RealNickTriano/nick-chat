import type { ProviderId } from "./model";

export type Role = "user" | "assistant";
export type MessageStatus = "complete" | "streaming" | "error";

export interface Message {
  id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  error?: string;
  provider?: string;
  model?: string;
  createdAt?: Date;
  tokens?: number;
  cost?: number;
}

export interface Chat {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatStreamRequest {
  provider: ProviderId;
  model: string;
  content: string;
}

export type ChatStreamEvent =
  | { event: "chat_created"; chatId: string }
  | { event: "token"; text: string }
  | { event: "done"; messageId: string; finishReason: string }
  | { event: "title"; title: string }
  | { event: "error"; message: string; code: string };

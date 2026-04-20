import type { ProviderId } from "./model";

export type Role = "user" | "assistant";
export type MessageStatus = "complete" | "streaming" | "error";

export interface Message {
  id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  error?: string;
}

export interface ChatStreamRequest {
  provider: ProviderId;
  model: string;
  messages: Array<{ role: Role; content: string }>;
}

export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

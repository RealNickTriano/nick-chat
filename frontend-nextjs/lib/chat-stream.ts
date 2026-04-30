import type { ChatStreamEvent, ChatStreamRequest } from "@/types/chat";
import { getCsrfToken } from "./get-csrf-token";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function* chatStream(
  request: ChatStreamRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  let response: Response;
  const xsrfToken = getCsrfToken();
  try {
    response = await fetch(`${baseURL}/chats`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
        "X-XSRF-TOKEN": xsrfToken ?? "",
      },
      body: JSON.stringify(request),
      credentials: "include",
      signal,
    });
  } catch (err) {
    yield { type: "error", message: errorMessage(err, "Network error") };
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    yield { type: "error", message: extractErrorMessage(text, response.status) };
    return;
  }

  if (!response.body) {
    yield { type: "error", message: "Empty response body" };
    return;
  }

  yield* readEventStream(response.body);
}

export async function* readEventStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const record = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseSseRecord(record);
        if (event) yield event;
        boundary = buffer.indexOf("\n\n");
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const event = parseSseRecord(buffer);
      if (event) yield event;
    }
  } catch (err) {
    yield { type: "error", message: errorMessage(err, "Stream error") };
  } finally {
    reader.releaseLock();
  }
}

export function parseSseRecord(record: string): ChatStreamEvent | null {
  const lines = record.split("\n");
  const eventName = lines
    .find((l) => l.startsWith("event:"))
    ?.slice(6)
    .trim();
  const payload = lines
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!payload || !eventName) return null;
  try {
    return { event: eventName, ...JSON.parse(payload) } as ChatStreamEvent;
  } catch {
    return { event: "error", message: `Malformed SSE event: ${payload}`, code: "PARSE_ERROR" };
  }
}

function extractErrorMessage(text: string, status: number): string {
  if (text) {
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      if (parsed.error) return parsed.error;
      if (parsed.message) return parsed.message;
    } catch {
      return text;
    }
  }
  return `HTTP ${status}`;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

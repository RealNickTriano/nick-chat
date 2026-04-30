import { describe, expect, it } from "vitest";
import { parseSseRecord, readEventStream } from "./chat-stream";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of gen) out.push(v);
  return out;
}

describe("parseSseRecord", () => {
  it("parses a token event", () => {
    expect(parseSseRecord('event: token\ndata: {"text":"hi"}')).toEqual({
      event: "token",
      text: "hi",
    });
  });

  it("parses a chat_created event", () => {
    expect(parseSseRecord('event: chat_created\ndata: {"chatId":"abc-123"}')).toEqual({
      event: "chat_created",
      chatId: "abc-123",
    });
  });

  it("parses a done event", () => {
    expect(
      parseSseRecord('event: done\ndata: {"messageId":"msg-1","finishReason":"stop"}'),
    ).toEqual({ event: "done", messageId: "msg-1", finishReason: "stop" });
  });

  it("parses a title event", () => {
    expect(parseSseRecord('event: title\ndata: {"title":"Greeting exchange"}')).toEqual({
      event: "title",
      title: "Greeting exchange",
    });
  });

  it("parses an error event", () => {
    expect(
      parseSseRecord('event: error\ndata: {"message":"boom","code":"PROVIDER_ERROR"}'),
    ).toEqual({ event: "error", message: "boom", code: "PROVIDER_ERROR" });
  });

  it("accepts no space after the data colon", () => {
    expect(parseSseRecord('event: done\ndata:{"messageId":"x","finishReason":"stop"}')).toEqual({
      event: "done",
      messageId: "x",
      finishReason: "stop",
    });
  });

  it("joins multi-line data payloads with newlines", () => {
    const record = ['event: token\ndata: {"text":', 'data: "hi"}'].join("\n");
    expect(parseSseRecord(record)).toEqual({ event: "token", text: "hi" });
  });

  it("returns null for records with no data lines", () => {
    expect(parseSseRecord("event: token")).toBeNull();
  });

  it("returns null for records with no event line", () => {
    expect(parseSseRecord('data: {"text":"hi"}')).toBeNull();
  });

  it("surfaces malformed JSON as a synthetic error event", () => {
    const event = parseSseRecord("event: token\ndata: {not-json");
    expect(event?.event).toBe("error");
  });
});

describe("readEventStream", () => {
  it("yields events in order from a single chunk", async () => {
    const stream = streamOf([
      'event: token\ndata: {"text":"he"}\n\n',
      'event: token\ndata: {"text":"llo"}\n\n',
      'event: done\ndata: {"messageId":"m1","finishReason":"stop"}\n\n',
    ]);
    expect(await collect(readEventStream(stream))).toEqual([
      { event: "token", text: "he" },
      { event: "token", text: "llo" },
      { event: "done", messageId: "m1", finishReason: "stop" },
    ]);
  });

  it("reassembles events split across chunks", async () => {
    const stream = streamOf([
      "event: tok",
      'en\ndata: {"text":"hi"}\n',
      '\nevent: done\ndata: {"messageId":"m1","finishReason":"stop"}\n\n',
    ]);
    expect(await collect(readEventStream(stream))).toEqual([
      { event: "token", text: "hi" },
      { event: "done", messageId: "m1", finishReason: "stop" },
    ]);
  });

  it("flushes a trailing event missing its final \\n\\n", async () => {
    const stream = streamOf(['event: done\ndata: {"messageId":"m1","finishReason":"stop"}']);
    expect(await collect(readEventStream(stream))).toEqual([
      { event: "done", messageId: "m1", finishReason: "stop" },
    ]);
  });

  it("passes error events through unchanged", async () => {
    const stream = streamOf(['event: error\ndata: {"message":"boom","code":"PROVIDER_ERROR"}\n\n']);
    expect(await collect(readEventStream(stream))).toEqual([
      { event: "error", message: "boom", code: "PROVIDER_ERROR" },
    ]);
  });

  it("yields chat_created before token events", async () => {
    const stream = streamOf([
      'event: chat_created\ndata: {"chatId":"abc"}\n\n',
      'event: token\ndata: {"text":"hi"}\n\n',
    ]);
    expect(await collect(readEventStream(stream))).toEqual([
      { event: "chat_created", chatId: "abc" },
      { event: "token", text: "hi" },
    ]);
  });
});

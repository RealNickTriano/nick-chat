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
  it("parses a single data line", () => {
    expect(parseSseRecord('data: {"type":"delta","text":"hi"}')).toEqual({
      type: "delta",
      text: "hi",
    });
  });

  it("accepts no space after the colon", () => {
    expect(parseSseRecord('data:{"type":"done"}')).toEqual({ type: "done" });
  });

  it("joins multi-line data payloads with newlines", () => {
    const record = ['data: {"type":"delta",', 'data: "text":"hi"}'].join("\n");
    expect(parseSseRecord(record)).toEqual({ type: "delta", text: "hi" });
  });

  it("ignores non-data lines", () => {
    const record = ["event: message", 'data: {"type":"done"}'].join("\n");
    expect(parseSseRecord(record)).toEqual({ type: "done" });
  });

  it("returns null for records with no data lines", () => {
    expect(parseSseRecord("event: message")).toBeNull();
  });

  it("surfaces malformed JSON as a synthetic error event", () => {
    const event = parseSseRecord("data: {not-json");
    expect(event?.type).toBe("error");
  });
});

describe("readEventStream", () => {
  it("yields events in order from a single chunk", async () => {
    const stream = streamOf([
      'data: {"type":"delta","text":"he"}\n\n',
      'data: {"type":"delta","text":"llo"}\n\n',
      'data: {"type":"done"}\n\n',
    ]);
    expect(await collect(readEventStream(stream))).toEqual([
      { type: "delta", text: "he" },
      { type: "delta", text: "llo" },
      { type: "done" },
    ]);
  });

  it("reassembles events split across chunks", async () => {
    const stream = streamOf([
      'data: {"type":"del',
      'ta","text":"hi"}\n',
      '\ndata: {"type":"done"}\n\n',
    ]);
    expect(await collect(readEventStream(stream))).toEqual([
      { type: "delta", text: "hi" },
      { type: "done" },
    ]);
  });

  it("flushes a trailing event missing its final \\n\\n", async () => {
    const stream = streamOf(['data: {"type":"done"}']);
    expect(await collect(readEventStream(stream))).toEqual([{ type: "done" }]);
  });

  it("passes error events through unchanged", async () => {
    const stream = streamOf(['data: {"type":"error","message":"boom"}\n\n']);
    expect(await collect(readEventStream(stream))).toEqual([{ type: "error", message: "boom" }]);
  });
});

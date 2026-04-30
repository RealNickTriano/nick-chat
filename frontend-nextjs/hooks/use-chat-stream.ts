"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { chatStream } from "@/lib/chat-stream";
import { fetchChatMessages } from "@/lib/chat-messages";
import type { Message } from "@/types/chat";
import type { ProviderId } from "@/types/model";

type HookStatus = "idle" | "loading" | "streaming" | "error";

interface UseChatStreamResult {
  messages: Message[];
  status: HookStatus;
  error: string | null;
  chatId: string | null;
  title: string | null;
  send: (text: string, model: string, provider: ProviderId) => void;
}

type State = {
  messages: Message[];
  status: HookStatus;
  error: string | null;
  title: string | null;
};

type Action =
  | { type: "reset" }
  | { type: "loading" }
  | { type: "loaded"; messages: Message[] }
  | { type: "load_error"; error: string }
  | { type: "stream_start"; userMsg: Message; assistantMsg: Message }
  | { type: "token"; id: string; text: string }
  | { type: "stream_done"; id: string }
  | { type: "title"; title: string }
  | { type: "stream_error"; id: string; message: string; hadTokens: boolean };

const INITIAL_STATE: State = { messages: [], status: "idle", error: null, title: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return INITIAL_STATE;
    case "loading":
      return { messages: [], status: "loading", error: null, title: null };
    case "loaded":
      return { ...state, messages: action.messages, status: "idle" };
    case "load_error":
      return { ...state, status: "error", error: action.error };
    case "stream_start":
      return {
        ...state,
        messages: [...state.messages, action.userMsg, action.assistantMsg],
        status: "streaming",
        error: null,
      };
    case "token":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, content: m.content + action.text } : m,
        ),
      };
    case "stream_done":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, status: "complete" } : m,
        ),
        status: "idle",
      };
    case "title":
      return { ...state, title: action.title };
    case "stream_error":
      if (action.hadTokens) {
        return {
          ...state,
          messages: state.messages.map((m) =>
            m.id === action.id ? { ...m, status: "error", error: action.message } : m,
          ),
          status: "idle",
        };
      }
      return {
        ...state,
        messages: state.messages.filter((m) => m.id !== action.id),
        status: "error",
        error: action.message,
      };
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useChatStream(): UseChatStreamResult {
  const router = useRouter();
  const params = useParams<{ chatId?: string }>();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Ref keeps the latest chatId available inside the send callback without
  // causing it to be recreated on every URL change.
  const chatIdRef = useRef<string | null>(params.chatId ?? null);
  useEffect(() => {
    chatIdRef.current = params.chatId ?? null;
  }, [params.chatId]);

  const skipHistoryFetchRef = useRef(false);

  useEffect(() => {
    const chatId = params.chatId;
    if (!chatId) {
      dispatch({ type: "reset" });
      return;
    }

    if (skipHistoryFetchRef.current) {
      skipHistoryFetchRef.current = false;
      return;
    }

    let cancelled = false;
    dispatch({ type: "loading" });

    fetchChatMessages(chatId).then(
      (loaded) => {
        if (!cancelled) dispatch({ type: "loaded", messages: loaded });
      },
      (err: { response?: { data?: { error?: string } } }) => {
        if (!cancelled)
          dispatch({
            type: "load_error",
            error: err?.response?.data?.error ?? "Failed to load messages.",
          });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [params.chatId]);

  const inflightRef = useRef<AbortController | null>(null);

  const send = useCallback(
    (text: string, model: string, provider: ProviderId) => {
      const userId = makeId();
      const assistantId = makeId();

      dispatch({
        type: "stream_start",
        userMsg: { id: userId, role: "user", content: text, status: "complete" },
        assistantMsg: {
          id: assistantId,
          role: "assistant",
          content: "",
          status: "streaming",
          model,
          provider,
        },
      });

      inflightRef.current?.abort();
      const controller = new AbortController();
      inflightRef.current = controller;

      void (async () => {
        let receivedToken = false;
        try {
          const eventStream = chatStream(
            { provider, model, content: text },
            controller.signal,
            chatIdRef.current,
          );
          for await (const event of eventStream) {
            if (event.event === "chat_created") {
              if (chatIdRef.current !== event.chatId) {
                skipHistoryFetchRef.current = true;
              }
              chatIdRef.current = event.chatId;
              router.replace(`/chats/${event.chatId}`);
            } else if (event.event === "token") {
              receivedToken = true;
              dispatch({ type: "token", id: assistantId, text: event.text });
            } else if (event.event === "done") {
              dispatch({ type: "stream_done", id: assistantId });
            } else if (event.event === "title") {
              dispatch({ type: "title", title: event.title });
            } else if (event.event === "error") {
              dispatch({
                type: "stream_error",
                id: assistantId,
                message: event.message,
                hadTokens: receivedToken,
              });
              return;
            }
          }
        } finally {
          if (inflightRef.current === controller) inflightRef.current = null;
        }
      })();
    },
    [router],
  );

  return {
    messages: state.messages,
    status: state.status,
    error: state.error,
    chatId: params.chatId ?? null,
    title: state.title,
    send,
  };
}

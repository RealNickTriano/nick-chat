import { useCallback, useEffect, useState } from "react";
import { http } from "./http";
import type { Chat } from "@/types/chat";

interface BackendChat {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

function toChat(c: BackendChat): Chat {
  return {
    id: c.id,
    title: c.title,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  };
}

async function fetchChats(): Promise<Chat[]> {
  const res = await http.get<{ chats: BackendChat[] }>("/chats");
  return res.data.chats.map(toChat);
}

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    fetchChats()
      .catch(console.error)
      .then((result) => {
        if (result) setChats(result);
      });
  }, []);

  const addChat = useCallback((id: string) => {
    setChats((prev) => {
      if (prev.find((c) => c.id === id)) return prev;
      const now = new Date();
      return [{ id, title: null, createdAt: now, updatedAt: now }, ...prev];
    });
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  return { chats, addChat, updateTitle };
}

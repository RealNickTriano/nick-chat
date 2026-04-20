import type { Message as ChatMessage } from "@/types/chat";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-2xl bg-neutral-900 px-4 py-2 text-sm text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900"
            : "max-w-[80%] rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
        }
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {message.status === "streaming" && (
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-current opacity-60"
            />
          )}
        </div>
        {message.status === "error" && message.error && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">{message.error}</div>
        )}
      </div>
    </div>
  );
}

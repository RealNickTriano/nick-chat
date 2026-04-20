import { useState } from "react";

interface ChatErrorProps {
  message?: string | null;
}

export function ChatError({ message }: ChatErrorProps) {
  const [formattedMessage, setFormattedMessage] = useState<string>();
  const [prevMessage, setPrevMessage] = useState<string>();

  const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

  try {
    if (prevMessage != message && message) {
      setPrevMessage(message);
      const json = JSON.parse(message);
      if (json.error.message) {
        setFormattedMessage(json.error.message);
      } else {
        setFormattedMessage(DEFAULT_MESSAGE);
      }
    }
  } catch {
    setFormattedMessage(DEFAULT_MESSAGE);
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {formattedMessage}
    </div>
  );
}

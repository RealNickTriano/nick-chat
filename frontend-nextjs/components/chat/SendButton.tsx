"use client";

import { SendIcon } from "@/components/svg/Send";

interface SendButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SendButton({ onClick, disabled }: SendButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Send message"
      className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        disabled
          ? "cursor-not-allowed bg-[var(--bg3)] text-[var(--text3)]"
          : "cursor-pointer bg-[var(--accent)] text-white hover:opacity-90"
      }`}
    >
      <SendIcon size={13} />
      <span>Send</span>
    </button>
  );
}

"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { Model, ProviderId } from "@/types/model";
import { ModelSelector } from "./ModelSelector";
import { SendButton } from "./SendButton";

interface ComposerProps {
  onSubmit: (payload: { text: string; model: string; provider: ProviderId }) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_ROWS = 10;

export function Composer({ onSubmit, disabled, placeholder }: ComposerProps) {
  const [text, setText] = useState("");
  const [model, setModel] = useState<Model | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const max = lineHeight * MAX_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
    el.scrollTo({ top: el.scrollHeight });
  }, [text]);

  const canSubmit = text.trim().length > 0 && !disabled && model !== null;

  const submit = () => {
    if (!canSubmit || !model) return;
    onSubmit({ text: text.trim(), model: model.id, provider: model.provider });
    setText("");
    textareaRef.current?.focus();
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-sm transition-colors focus-within:border-[var(--text3)]">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "How can I help you today? (Shift+Enter for newline)"}
        rows={1}
        aria-label="Message"
        className="chat-scroll w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base leading-6 text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none"
      />
      <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2">
        <ModelSelector value={model?.id ?? null} onChange={setModel} />
        <SendButton onClick={submit} disabled={!canSubmit} />
      </div>
    </div>
  );
}

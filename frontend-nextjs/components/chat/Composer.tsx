"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { DEFAULT_MODEL_ID, MODELS, type ModelId } from "@/lib/models";
import { ModelSelector } from "./ModelSelector";
import { SendButton } from "./SendButton";

interface ComposerProps {
  onSubmit: (payload: { text: string; model: ModelId }) => void;
  disabled?: boolean;
  initialModel?: ModelId;
  placeholder?: string;
}

const MAX_ROWS = 10;

export function Composer({ onSubmit, disabled, initialModel, placeholder }: ComposerProps) {
  const [text, setText] = useState("");
  const [model, setModel] = useState<ModelId>(initialModel ?? DEFAULT_MODEL_ID);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize: reset to auto, then clamp to MAX_ROWS worth of line-height.
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

  const canSubmit = text.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ text: text.trim(), model });
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
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white shadow-sm transition-colors focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:focus-within:border-neutral-600">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Ask anything..."}
        rows={1}
        aria-label="Message"
        className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-base leading-6 text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />
      <div className="flex items-center justify-between border-t border-neutral-200 px-2 py-2 dark:border-neutral-800">
        <ModelSelector value={model} onChange={setModel} models={MODELS} />
        <SendButton onClick={submit} disabled={!canSubmit} />
      </div>
    </div>
  );
}

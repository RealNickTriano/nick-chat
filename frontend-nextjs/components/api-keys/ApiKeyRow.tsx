"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ApiKey } from "@/lib/api-keys";
import type { ProviderId } from "@/types/model";
import { ProviderLogo } from "@/components/chat/ProviderLogo";
import { ProviderIconBadge } from "./ProviderIconBadge";
import { ApiKeyDocsLink } from "./ApiKeyDocsLink";
import { TrashIcon } from "@/components/svg/Trash";
import { relativeTime } from "@/lib/relative-time";

interface ApiKeyRowProps {
  apiKey: ApiKey;
  pending: "saving" | "deleting" | undefined;
  error: string | undefined;
  onSave: (rawKey: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

type RowState = "idle" | "editing" | "confirming-delete";

function logoClassName(provider: ProviderId): string {
  switch (provider) {
    case "ANTHROPIC":
      return "h-3 w-auto text-[var(--text)]";
    case "OPEN_AI":
      return "h-4 w-auto text-[var(--text)]";
    case "GOOGLE_AI_GEMINI":
      return "text-[10px] font-bold text-[var(--text)]";
    case "MISTRAL_AI":
      return "text-[10px] font-bold text-[var(--text)]";
    default:
      return "text-[10px] font-bold text-[var(--text)]";
  }
}

export function ApiKeyRow({ apiKey, pending, error, onSave, onDelete }: ApiKeyRowProps) {
  const [state, setState] = useState<RowState>("idle");
  const [inputValue, setInputValue] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "editing") inputRef.current?.focus();
  }, [state]);

  const displayError = validationError ?? error;

  function enterEditing() {
    setValidationError(undefined);
    setInputValue("");
    setState("editing");
  }

  function enterConfirmingDelete() {
    setValidationError(undefined);
    setState("confirming-delete");
  }

  function cancel() {
    setValidationError(undefined);
    setState("idle");
  }

  async function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setValidationError("Key cannot be empty");
      return;
    }
    if (trimmed.length > 500) {
      setValidationError("Key too long (max 500)");
      return;
    }
    try {
      await onSave(trimmed);
      setState("idle");
    } catch {
      // error surfaces via prop
    }
  }

  async function handleDelete() {
    try {
      await onDelete();
      setState("idle");
    } catch {
      // error surfaces via prop
    }
  }

  const isSaving = pending === "saving";
  const isDeleting = pending === "deleting";

  return (
    <div className="py-4">
      <div className="flex items-center gap-3">
        <ProviderIconBadge>
          <ProviderLogo provider={apiKey.provider} className={logoClassName(apiKey.provider)} />
        </ProviderIconBadge>

        <span className="w-[72px] shrink-0 text-[13px] font-medium text-[var(--text)]">
          {apiKey.label}
        </span>

        <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5">
          <div className="flex w-full items-center justify-end gap-2">
            {state === "idle" && !apiKey.keyMask && (
              <>
                <span className="text-[12px] text-[var(--text3)]">No key saved</span>
                <ApiKeyDocsLink docsUrl={apiKey.docsUrl} />
                <button
                  type="button"
                  onClick={enterEditing}
                  className="rounded-md border border-[var(--accent)] px-2.5 py-1 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-light)]"
                >
                  Add key
                </button>
              </>
            )}

            {state === "idle" && apiKey.keyMask && (
              <>
                <div className="min-w-0 flex-1 text-right">
                  <div className="truncate font-mono text-[12px] text-[var(--text2)]">
                    {apiKey.keyMask}
                  </div>
                  {apiKey.updatedAt && (
                    <div className="text-[11px] text-[var(--text3)]">
                      Updated {relativeTime(apiKey.updatedAt)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={enterEditing}
                  className="shrink-0 rounded-md border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)]"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={enterConfirmingDelete}
                  aria-label="Remove key"
                  className="shrink-0 rounded-md p-1.5 text-[var(--text3)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text2)]"
                >
                  <TrashIcon size={14} />
                </button>
              </>
            )}

            {state === "editing" && (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancel();
                    if (e.key === "Enter") handleSave();
                  }}
                  disabled={isSaving}
                  placeholder="Paste your API key"
                  className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1.5 font-mono text-[12px] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={cancel}
                  disabled={isSaving}
                  className="shrink-0 text-[12px] text-[var(--text3)] transition-colors hover:text-[var(--text)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isSaving && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Save
                </button>
              </>
            )}

            {state === "confirming-delete" && (
              <>
                <span className="text-[12px] text-[var(--text2)]">Remove this key?</span>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={isDeleting}
                  className="shrink-0 text-[12px] text-[var(--text3)] transition-colors hover:text-[var(--text)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-red-500 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  {isDeleting && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  Remove
                </button>
              </>
            )}
          </div>

          {displayError && <p className="text-[11px] text-red-500">{displayError}</p>}
        </div>
      </div>
    </div>
  );
}

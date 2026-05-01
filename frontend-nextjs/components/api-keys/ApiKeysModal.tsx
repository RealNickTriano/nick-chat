"use client";

import { useEffect, useRef } from "react";
import { useApiKeys } from "@/lib/api-keys";
import type { ProviderId } from "@/types/model";
import { CloseIcon } from "@/components/svg/Close";
import { LockIcon } from "@/components/svg/Lock";
import { ApiKeyRow } from "./ApiKeyRow";

interface ApiKeysModalProps {
  open: boolean;
  onClose: () => void;
}

const TITLE_ID = "api-keys-title";

export function ApiKeysModal({ open, onClose }: ApiKeysModalProps) {
  const { keys, loaded, pending, errors, saveKeyForProvider, deleteKeyForProvider } = useApiKeys();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[85vh] w-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-lg transition-[opacity,transform] duration-200 ease-out ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between px-5 py-4">
          <div>
            <h2 id={TITLE_ID} className="text-[15px] font-semibold text-[var(--text)]">
              API Keys
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--text3)]">
              Bring your own key for each provider
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-[var(--text3)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {!loaded
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 py-4${i < 3 ? " border-b border-[var(--border)]" : ""}`}
                >
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-[var(--bg3)]" />
                  <div className="h-4 w-16 animate-pulse rounded bg-[var(--bg3)]" />
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-[var(--bg3)]" />
                </div>
              ))
            : keys.map((key, i) => (
                <div
                  key={key.provider}
                  className={i < keys.length - 1 ? "border-b border-[var(--border)]" : ""}
                >
                  <ApiKeyRow
                    apiKey={key}
                    pending={pending[key.provider as ProviderId]}
                    error={errors[key.provider as ProviderId]}
                    onSave={(rawKey) => saveKeyForProvider(key.provider, rawKey)}
                    onDelete={() => deleteKeyForProvider(key.provider)}
                  />
                </div>
              ))}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-1.5 border-t border-[var(--border)] px-5 py-3.5">
          <LockIcon className="text-[var(--text3)]" />
          <span className="text-[11px] text-[var(--text3)]">Keys are encrypted at rest</span>
        </div>
      </div>
    </div>
  );
}

export default ApiKeysModal;

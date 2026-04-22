"use client";

import { useState } from "react";

interface AvatarProps {
  src: string | null;
  name: string;
  className?: string;
}

export function Avatar({ src, name, className }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const base =
    className ??
    "inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-sm font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100";

  if (!src || broken) {
    return (
      <span className={base} aria-hidden="true">
        {initial}
      </span>
    );
  }

  return (
    <span className={base}>
      {/* Google avatars are an external domain; <img> keeps this free of next/image config. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

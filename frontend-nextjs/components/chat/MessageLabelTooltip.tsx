import type { ReactNode } from "react";

interface MessageLabelTooltipProps {
  text: string;
  children: ReactNode;
}

export function MessageLabelTooltip({ text, children }: MessageLabelTooltipProps) {
  return (
    <span className="group relative">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:bg-neutral-700">
        {text}
      </span>
    </span>
  );
}

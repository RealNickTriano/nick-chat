"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,

  code: ({ className, children }) => {
    const isBlock = /^language-/.test(className ?? "");
    if (isBlock) {
      return <code className="block font-mono text-xs">{children}</code>;
    }
    return (
      <code className="rounded bg-[var(--bg3)] px-1 py-0.5 font-mono text-xs">{children}</code>
    );
  },

  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded bg-[var(--bg3)] p-3">{children}</pre>
  ),

  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,

  h1: ({ children }) => <h1 className="mb-2 mt-4 text-base font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-sm font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold">{children}</h3>,

  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--text3)] pl-3 italic text-[var(--text2)]">
      {children}
    </blockquote>
  ),

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--accent)] underline underline-offset-2"
    >
      {children}
    </a>
  ),

  hr: () => <hr className="my-4 border-[var(--bg3)]" />,

  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-[var(--border)]">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-[var(--border)]">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-[var(--text)]">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-[var(--text2)]">{children}</td>,
};

interface MarkdownContentProps {
  content: string;
  streaming?: boolean;
}

export function MarkdownContent({ content, streaming }: MarkdownContentProps) {
  return (
    <div className="text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
      {streaming && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.75 animate-pulse bg-current opacity-60"
        />
      )}
    </div>
  );
}

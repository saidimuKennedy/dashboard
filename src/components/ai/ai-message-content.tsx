"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export const aiMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-1 text-base font-semibold text-foreground">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 mt-1 text-sm font-semibold text-foreground">{children}</h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-2 mt-1 text-sm font-medium text-foreground">{children}</h5>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-background/60 p-3 font-mono text-xs last:mb-0">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-primary/40 pl-3 italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
};

interface AiMarkdownProps {
  content: string;
  className?: string;
}

export function AiMarkdown({ content, className }: AiMarkdownProps) {
  return (
    <div
      className={cn(
        "prose-ai break-words text-sm leading-relaxed text-muted-foreground",
        className
      )}
    >
      <ReactMarkdown components={aiMarkdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}

interface AiMessageContentProps {
  content: string;
  role: "user" | "assistant";
  className?: string;
}

export function AiMessageContent({ content, role, className }: AiMessageContentProps) {
  if (role === "user") {
    return <p className={cn("whitespace-pre-wrap break-words", className)}>{content}</p>;
  }

  return <AiMarkdown content={content} className={className} />;
}

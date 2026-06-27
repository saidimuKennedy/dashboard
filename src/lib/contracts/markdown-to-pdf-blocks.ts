export type PdfFontFamily = "helvetica" | "times" | "courier";

export const PDF_FONT_OPTIONS: { value: PdfFontFamily; label: string }[] = [
  { value: "helvetica", label: "Helvetica — clean sans-serif" },
  { value: "times", label: "Times Roman — classic serif" },
  { value: "courier", label: "Courier — monospace" },
];

export type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; segments: TextSegment[] }
  | { type: "list-item"; segments: TextSegment[] }
  | { type: "blank" };

export type TextSegment = { text: string; bold: boolean };

function stripResidualMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();
}

export function parseInlineSegments(line: string): TextSegment[] {
  const cleaned = stripResidualMarkdown(line);
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: cleaned.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    segments.push({ text: cleaned.slice(lastIndex), bold: false });
  }

  if (segments.length === 0 && cleaned) {
    segments.push({ text: cleaned.replace(/\*(.+?)\*/g, "$1"), bold: false });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

export function parseMarkdownToBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      blocks.push({ type: "blank" });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: stripResidualMarkdown(heading[2]).replace(/\*\*(.+?)\*\*/g, "$1"),
      });
      continue;
    }

    const listItem = trimmed.match(/^[-*•]\s+(.+)$/);
    if (listItem) {
      blocks.push({ type: "list-item", segments: parseInlineSegments(listItem[1]) });
      continue;
    }

    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      const text = numbered[1];
      const isSectionHeading =
        text.length < 70 &&
        (text === text.toUpperCase() || /^[A-Z][A-Z0-9\s/&-]+$/.test(text));
      if (isSectionHeading) {
        blocks.push({
          type: "heading",
          level: 2,
          text: stripResidualMarkdown(text).replace(/\*\*(.+?)\*\*/g, "$1"),
        });
      } else {
        blocks.push({ type: "list-item", segments: parseInlineSegments(text) });
      }
      continue;
    }

    blocks.push({ type: "paragraph", segments: parseInlineSegments(trimmed) });
  }

  return blocks;
}

export function resolvePdfFont(fontFamily: string): PdfFontFamily {
  const lower = fontFamily.toLowerCase();
  if (lower === "times" || lower.includes("times") || lower.includes("georgia") || lower.includes("serif")) {
    return "times";
  }
  if (lower === "courier" || lower.includes("courier") || lower.includes("mono")) {
    return "courier";
  }
  return "helvetica";
}

export function pdfFontLabel(font: PdfFontFamily): string {
  return PDF_FONT_OPTIONS.find((option) => option.value === font)?.label ?? "Helvetica";
}

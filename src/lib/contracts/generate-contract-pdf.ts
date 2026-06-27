import type { ContractTemplateSettings, CustomerContract } from "@/types/customer";
import {
  parseMarkdownToBlocks,
  resolvePdfFont,
  type MarkdownBlock,
  type PdfFontFamily,
  type TextSegment,
} from "@/lib/contracts/markdown-to-pdf-blocks";

export type ContractPdfInput = {
  contract: CustomerContract;
  settings: ContractTemplateSettings;
  clientName: string;
  clientCompany?: string | null;
};

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return { r: 30, g: 58, b: 95 };
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMoney(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function contractReference(contract: CustomerContract): string {
  const year = new Date(contract.startDate).getFullYear();
  const suffix = contract.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `CTR-${year}-${suffix}`;
}

function slugifyFilename(title: string): string {
  const slug = title.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug || "contract";
}

function setFont(
  doc: import("jspdf").jsPDF,
  font: PdfFontFamily,
  style: "normal" | "bold" | "italic" | "bolditalic"
) {
  doc.setFont(font, style);
}

function ensureSpace(
  doc: import("jspdf").jsPDF,
  y: number,
  needed: number,
  margin: number,
  pageHeight: number
): number {
  if (y + needed <= pageHeight - 20) return y;
  doc.addPage();
  return margin;
}

function drawSegmentsLine(
  doc: import("jspdf").jsPDF,
  segments: TextSegment[],
  x: number,
  y: number,
  maxWidth: number,
  font: PdfFontFamily,
  fontSize: number
): number {
  setFont(doc, font, "normal");
  doc.setFontSize(fontSize);

  const fullText = segments.map((segment) => segment.text).join("");
  const lines = doc.splitTextToSize(fullText, maxWidth) as string[];

  for (const line of lines) {
    let cursorX = x;
    let remaining = line;

    for (const segment of segments) {
      if (!remaining) break;
      if (!segment.text) continue;

      const index = remaining.indexOf(segment.text);
      if (index === -1) continue;

      if (index > 0) {
        const before = remaining.slice(0, index);
        setFont(doc, font, "normal");
        doc.text(before, cursorX, y);
        cursorX += doc.getTextWidth(before);
        remaining = remaining.slice(index);
      }

      setFont(doc, font, segment.bold ? "bold" : "normal");
      doc.text(segment.text, cursorX, y);
      cursorX += doc.getTextWidth(segment.text);
      remaining = remaining.slice(segment.text.length);
    }

    if (remaining) {
      setFont(doc, font, "normal");
      doc.text(remaining, cursorX, y);
    }

    y += fontSize * 0.45;
  }

  return y;
}

function renderMarkdownBody(
  doc: import("jspdf").jsPDF,
  markdown: string,
  startY: number,
  margin: number,
  contentWidth: number,
  pageHeight: number,
  font: PdfFontFamily,
  bodyColor: Rgb,
  headingColor: Rgb
): number {
  const blocks = parseMarkdownToBlocks(markdown);
  let y = startY;

  for (const block of blocks) {
    if (block.type === "blank") {
      y += 2;
      continue;
    }

    y = ensureSpace(doc, y, 12, margin, pageHeight);

    if (block.type === "heading") {
      const size = block.level <= 2 ? 12 : block.level === 3 ? 11 : 10;
      setFont(doc, font, "bold");
      doc.setFontSize(size);
      doc.setTextColor(headingColor.r, headingColor.g, headingColor.b);
      const lines = doc.splitTextToSize(block.text, contentWidth) as string[];
      for (const line of lines) {
        y = ensureSpace(doc, y, size * 0.5, margin, pageHeight);
        doc.text(line, margin, y);
        y += size * 0.5;
      }
      y += 2;
      continue;
    }

    doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
    setFont(doc, font, "normal");
    doc.setFontSize(10);

    if (block.type === "list-item") {
      y = ensureSpace(doc, y, 6, margin, pageHeight);
      doc.text("•", margin, y);
      y = drawSegmentsLine(doc, block.segments, margin + 4, y, contentWidth - 4, font, 10);
      y += 1.5;
      continue;
    }

    y = drawSegmentsLine(doc, block.segments, margin, y, contentWidth, font, 10);
    y += 2.5;
  }

  return y;
}

function drawMetadataRow(
  doc: import("jspdf").jsPDF,
  y: number,
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string,
  margin: number,
  pageWidth: number,
  font: PdfFontFamily
) {
  const mid = pageWidth / 2;
  setFont(doc, font, "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(leftLabel, margin, y);
  doc.text(rightLabel, mid, y);
  setFont(doc, font, "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(leftValue, margin, y + 5);
  doc.text(rightValue, mid, y + 5);
  return y + 14;
}

export async function generateContractPdf(input: ContractPdfInput): Promise<Blob> {
  const { contract, settings, clientName, clientCompany } = input;
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const font = resolvePdfFont(settings.fontFamily);
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const headerRgb = hexToRgb(settings.headerColor);
  const accentRgb = hexToRgb(settings.accentColor);
  const bodyRgb: Rgb = { r: 40, g: 40, b: 40 };
  const reference = contractReference(contract);

  let y = margin;

  setFont(doc, font, "bold");
  doc.setFontSize(18);
  doc.setTextColor(headerRgb.r, headerRgb.g, headerRgb.b);
  doc.text(settings.companyName.toUpperCase(), margin, y);

  const label = settings.documentLabel.toUpperCase();
  setFont(doc, font, "bold");
  doc.setFontSize(13);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text(label, pageWidth - margin, y, { align: "right" });

  y += 8;
  setFont(doc, font, "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (settings.contactName) {
    doc.text(settings.contactName, margin, y);
    y += 4.5;
  }
  if (settings.contactEmail) {
    doc.text(settings.contactEmail, margin, y);
    y += 4.5;
  }
  if (settings.location) {
    doc.text(settings.location, margin, y);
    y += 4.5;
  }

  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  setFont(doc, font, "bold");
  doc.setFontSize(10);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text("CLIENT", margin, y);
  y += 6;
  setFont(doc, font, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(clientName, margin, y);
  y += 5;
  if (clientCompany) {
    setFont(doc, font, "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(clientCompany, margin, y);
    y += 5;
  }

  y += 6;
  doc.setFillColor(248, 249, 251);
  doc.rect(margin, y, contentWidth, 28, "F");
  y += 7;

  y = drawMetadataRow(
    doc,
    y,
    "Contract No.",
    reference,
    "Start Date",
    formatDate(contract.startDate),
    margin + 4,
    pageWidth,
    font
  );
  y = drawMetadataRow(
    doc,
    y,
    "End Date",
    formatDate(contract.endDate),
    "Currency",
    contract.currency,
    margin + 4,
    pageWidth,
    font
  );

  if (contract.value != null) {
    setFont(doc, font, "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Contract Value", margin + 4, y);
    setFont(doc, font, "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(formatMoney(contract.value, contract.currency), margin + 4, y + 5);
    y += 14;
  }

  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  setFont(doc, font, "bold");
  doc.setFontSize(12);
  doc.setTextColor(headerRgb.r, headerRgb.g, headerRgb.b);
  const titleLines = doc.splitTextToSize(contract.title, contentWidth) as string[];
  for (const line of titleLines) {
    doc.text(line, margin, y);
    y += 6;
  }
  y += 2;

  const body = (contract.content ?? contract.terms ?? "").trim();
  y = renderMarkdownBody(doc, body, y, margin, contentWidth, pageHeight, font, bodyRgb, headerRgb);

  if (settings.includeSignatureBlock) {
    y = ensureSpace(doc, y + 8, 40, margin, pageHeight);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    const colWidth = (contentWidth - 10) / 2;
    setFont(doc, font, "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Provider signature", margin, y);
    doc.text("Client signature", margin + colWidth + 10, y);
    y += 16;
    doc.setDrawColor(160, 160, 160);
    doc.line(margin, y, margin + colWidth, y);
    doc.line(margin + colWidth + 10, y, pageWidth - margin, y);
    setFont(doc, font, "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(settings.companyName, margin, y + 5);
    doc.text(clientName, margin + colWidth + 10, y + 5);
    y += 14;
  }

  if (settings.paymentDetails?.trim()) {
    y = ensureSpace(doc, y + 4, 25, margin, pageHeight);
    setFont(doc, font, "bold");
    doc.setFontSize(9);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text("TERMS & PAYMENT", margin, y);
    y += 5;
    setFont(doc, font, "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const paymentLines = doc.splitTextToSize(settings.paymentDetails.trim(), contentWidth) as string[];
    for (const line of paymentLines) {
      y = ensureSpace(doc, y, 5, margin, pageHeight);
      doc.text(line, margin, y);
      y += 4.5;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setFont(doc, font, "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const footer = settings.footerText;
    const footerWidth = doc.getTextWidth(footer);
    doc.text(footer, (pageWidth - footerWidth) / 2, pageHeight - 10);
    setFont(doc, font, "normal");
    doc.text(`${page} of ${pageCount}`, pageWidth - margin - 12, pageHeight - 10);
  }

  return doc.output("blob");
}

export async function downloadContractPdf(input: ContractPdfInput): Promise<void> {
  const blob = await generateContractPdf(input);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugifyFilename(input.contract.title)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

import type { ContractTemplateSettings, CustomerContract } from "@/types/customer";

type PdfFont = "helvetica" | "times" | "courier";

export type ContractPdfInput = {
  contract: CustomerContract;
  settings: ContractTemplateSettings;
  clientName: string;
  clientCompany?: string | null;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return { r: 30, g: 58, b: 95 };
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function resolvePdfFont(fontFamily: string): PdfFont {
  const lower = fontFamily.toLowerCase();
  if (lower.includes("courier") || lower.includes("mono")) return "courier";
  if (lower.includes("times") || lower.includes("georgia") || lower.includes("serif")) return "times";
  return "helvetica";
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

function wrapText(
  doc: import("jspdf").jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
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
  pageWidth: number
) {
  const mid = pageWidth / 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(leftLabel, margin, y);
  doc.text(rightLabel, mid, y);
  doc.setFont("helvetica", "bold");
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
  const reference = contractReference(contract);

  let y = margin;

  // Company block (left)
  doc.setFont(font, "bold");
  doc.setFontSize(18);
  doc.setTextColor(headerRgb.r, headerRgb.g, headerRgb.b);
  doc.text(settings.companyName.toUpperCase(), margin, y);

  // Document label (right)
  const label = settings.documentLabel.toUpperCase();
  doc.setFont(font, "bold");
  doc.setFontSize(11);
  const labelWidth = doc.getTextWidth(label) + 10;
  const labelX = pageWidth - margin - labelWidth;
  doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.roundedRect(labelX, y - 6, labelWidth, 10, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(label, labelX + 5, y);

  y += 8;
  doc.setFont("helvetica", "normal");
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

  // Client block
  doc.setFont(font, "bold");
  doc.setFontSize(10);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text("CLIENT", margin, y);
  y += 6;
  doc.setFont(font, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(clientName, margin, y);
  y += 5;
  if (clientCompany) {
    doc.setFont("helvetica", "normal");
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
    pageWidth
  );
  y = drawMetadataRow(
    doc,
    y,
    "End Date",
    formatDate(contract.endDate),
    "Currency",
    contract.currency,
    margin + 4,
    pageWidth
  );

  if (contract.value != null) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Contract Value", margin + 4, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(formatMoney(contract.value, contract.currency), margin + 4, y + 5);
    y += 14;
  }

  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  doc.setFont(font, "bold");
  doc.setFontSize(12);
  doc.setTextColor(headerRgb.r, headerRgb.g, headerRgb.b);
  y = wrapText(doc, contract.title, margin, y, contentWidth, 6);
  y += 4;

  // Body
  doc.setFont(font, "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const body = (contract.content ?? contract.terms ?? "").trim();
  const paragraphs = body.split(/\n{2,}/);

  for (const paragraph of paragraphs) {
    const cleaned = paragraph.replace(/\n/g, " ").trim();
    if (!cleaned) continue;

    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    y = wrapText(doc, cleaned, margin, y, contentWidth, 5.2);
    y += 3;
  }

  // Signature block
  if (settings.includeSignatureBlock) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    y += 8;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    const colWidth = (contentWidth - 10) / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Provider signature", margin, y);
    doc.text("Client signature", margin + colWidth + 10, y);
    y += 16;
    doc.setDrawColor(160, 160, 160);
    doc.line(margin, y, margin + colWidth, y);
    doc.line(margin + colWidth + 10, y, pageWidth - margin, y);
    doc.setFontSize(8);
    doc.text(settings.companyName, margin, y + 5);
    doc.text(clientName, margin + colWidth + 10, y + 5);
    y += 14;
  }

  // Payment / terms footer
  if (settings.paymentDetails?.trim()) {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = margin;
    }
    doc.setFont(font, "bold");
    doc.setFontSize(9);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text("TERMS & PAYMENT", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    y = wrapText(doc, settings.paymentDetails.trim(), margin, y, contentWidth, 4.5);
    y += 4;
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const footer = settings.footerText;
    const footerWidth = doc.getTextWidth(footer);
    doc.text(footer, (pageWidth - footerWidth) / 2, pageHeight - 10);
    doc.setFont("helvetica", "normal");
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

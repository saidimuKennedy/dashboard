import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCurrency(amount: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number, currency = "KES"): string {
  const symbol = currency === "KES" ? "Ksh" : currency;
  if (amount >= 1_000_000) return `${symbol} ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol} ${Math.round(amount / 1_000)}K`;
  return formatCurrency(amount, currency);
}

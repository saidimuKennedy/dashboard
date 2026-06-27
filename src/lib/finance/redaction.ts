/** PII-safe display helpers for finance reports. */

export function maskInvoiceRef(ref: string | null | undefined, revealFull: boolean): string | null {
  if (!ref?.trim()) return null;
  if (revealFull) return ref.trim();
  const t = ref.trim();
  if (t.length <= 4) return "••••";
  return `${t.slice(0, 4)}•••${t.slice(-4)}`;
}

export function accountDisplayLabel(
  alias: string,
  legalName: string | null | undefined,
  canRevealLegal: boolean
): string {
  if (canRevealLegal && legalName?.trim()) {
    return `${alias.trim()} (${legalName.trim()})`;
  }
  return alias.trim();
}

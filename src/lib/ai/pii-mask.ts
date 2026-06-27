export type PiiProfile = {
  alias: string;
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAllIgnoreCase(text: string, needle: string, replacement: string): string {
  if (!needle.trim()) return text;
  return text.replace(new RegExp(escapeRegex(needle), "gi"), replacement);
}

export function maskPii(text: string, profile: PiiProfile): string {
  let result = text;

  if (profile.name) {
    result = replaceAllIgnoreCase(result, profile.name, profile.alias);
    const nameParts = profile.name.split(/\s+/).filter((part) => part.length > 2);
    for (const part of nameParts) {
      result = replaceAllIgnoreCase(result, part, profile.alias);
    }
  }

  if (profile.company) {
    result = replaceAllIgnoreCase(result, profile.company, `${profile.alias} Org`);
  }

  if (profile.email) {
    result = replaceAllIgnoreCase(result, profile.email, `${profile.alias}@masked.local`);
  }

  if (profile.phone) {
    result = replaceAllIgnoreCase(result, profile.phone, "[MASKED_PHONE]");
    const digits = profile.phone.replace(/\D/g, "");
    if (digits.length >= 7) {
      result = result.replace(new RegExp(escapeRegex(digits.slice(-7)), "g"), "[MASKED_PHONE]");
    }
  }

  result = result.replace(EMAIL_REGEX, "[MASKED_EMAIL]");
  result = result.replace(PHONE_REGEX, "[MASKED_PHONE]");
  result = result.replace(UUID_REGEX, "[MASKED_ID]");

  return result;
}

export function detectPiiLeak(text: string, profile: PiiProfile): string[] {
  const leaks: string[] = [];

  if (profile.email && profile.email.length > 3 && text.toLowerCase().includes(profile.email.toLowerCase())) {
    leaks.push("email");
  }
  if (profile.phone && profile.phone.length > 5 && text.includes(profile.phone.replace(/\s/g, ""))) {
    leaks.push("phone");
  }
  if (profile.name && profile.name.length > 2) {
    const lower = text.toLowerCase();
    if (lower.includes(profile.name.toLowerCase())) leaks.push("name");
    for (const part of profile.name.split(/\s+/)) {
      if (part.length > 2 && lower.includes(part.toLowerCase())) leaks.push("name_part");
    }
  }
  if (profile.company && profile.company.length > 2 && text.toLowerCase().includes(profile.company.toLowerCase())) {
    leaks.push("company");
  }
  if (EMAIL_REGEX.test(text)) leaks.push("email_pattern");
  if (PHONE_REGEX.test(text)) leaks.push("phone_pattern");

  return [...new Set(leaks)];
}

export function assertNoPii(text: string, profile: PiiProfile): void {
  const leaks = detectPiiLeak(text, profile);
  if (leaks.length > 0) {
    throw new Error(`PII leak blocked: ${leaks.join(", ")}. Use the customer alias only.`);
  }
}

export function buildMaskedCustomerContext(
  profile: PiiProfile,
  data: {
    industry?: string | null;
    status?: string;
    notes?: string | null;
    products?: string[];
    totalRevenue?: number;
    currency?: string;
    contractSummary?: string;
    retainerCount?: number;
  }
): string {
  const lines = [
    `Customer alias: ${profile.alias}`,
    data.status ? `Status: ${data.status}` : null,
    data.industry ? `Industry: ${data.industry}` : null,
    data.products?.length ? `Products: ${data.products.join(", ")}` : null,
    data.totalRevenue != null
      ? `Total revenue: ${data.currency ?? "KES"} ${data.totalRevenue.toLocaleString()}`
      : null,
    data.contractSummary ? `Contract: ${data.contractSummary}` : null,
    data.retainerCount ? `Retainer agreements: ${data.retainerCount}` : null,
    data.notes ? `Notes: ${maskPii(data.notes, profile)}` : null,
  ].filter(Boolean);

  const context = lines.join("\n");
  assertNoPii(context, profile);
  return context;
}

export function generateDefaultAlias(industry?: string | null): string {
  const prefix = industry?.slice(0, 3).toUpperCase() || "CLI";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

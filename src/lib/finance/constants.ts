export const REVENUE_TYPE_LABELS: Record<string, string> = {
  subscription: "Subscription",
  implementation: "Implementation",
  maintenance: "Maintenance",
  consulting: "Consulting",
  integration: "Integration",
  training: "Training",
  licensing: "Licensing",
  commission: "Commission",
  support: "Support",
  other: "Other",
};

export const REVENUE_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
  refunded: "Refunded",
  written_off: "Written off",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  payroll: "Payroll",
  hosting: "Hosting",
  marketing: "Marketing",
  software: "Software",
  travel: "Travel",
  contractor: "Contractor",
  office: "Office",
  tax: "Tax",
  other: "Other",
};

export const ACQUISITION_SOURCE_LABELS: Record<string, string> = {
  referral: "Referral",
  organic: "Organic",
  google: "Google",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  partner: "Partner",
  cold_outreach: "Cold outreach",
  other: "Other",
};

export const DEAL_STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const RECURRING_REVENUE_TYPES = ["subscription", "maintenance", "support"];

export const DEFAULT_SERVICE_PRODUCTS: {
  slug: string;
  name: string;
  description: string;
  defaultRevenueType: string;
}[] = [
  { slug: "jchats", name: "JChats", description: "Messaging platform", defaultRevenueType: "subscription" },
  { slug: "crm", name: "CRM", description: "Customer relationship platform", defaultRevenueType: "subscription" },
  { slug: "pos", name: "POS", description: "Point of sale", defaultRevenueType: "subscription" },
  { slug: "wa", name: "WhatsApp Commerce", description: "WhatsApp commerce", defaultRevenueType: "subscription" },
  { slug: "web", name: "Web Development", description: "Custom web projects", defaultRevenueType: "consulting" },
  { slug: "socials", name: "Socials", description: "Social media services", defaultRevenueType: "subscription" },
  { slug: "support", name: "Support & Maintenance", description: "Ongoing support", defaultRevenueType: "maintenance" },
];

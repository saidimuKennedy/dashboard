const CONTEXT_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/knowledge": "Knowledge",
  "/research": "Research",
  "/journal": "Journal",
  "/meetings": "Meetings",
  "/decisions": "Decisions",
  "/customers": "Customers",
  "/revenue": "Revenue",
  "/products": "Products",
  "/compliance": "Compliance",
  "/risks": "Risks",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/ai": "AI Hub",
};

export function getContextLabel(contextKey?: string | null): string {
  if (!contextKey) return "General";
  return CONTEXT_LABELS[contextKey] ?? contextKey.replace(/^\//, "").replace(/-/g, " ");
}

export function getPersonaLabel(persona?: string | null): string {
  switch (persona) {
    case "journal_assistant":
      return "Journal coach";
    case "research_assistant":
      return "Research assistant";
    case "business_advisor":
      return "Business advisor";
    case "revenue_advisor":
      return "Revenue advisor";
    case "meeting_assistant":
      return "Meeting assistant";
    case "decision_assistant":
      return "Decision coach";
    default:
      return persona?.replace(/_/g, " ") ?? "Assistant";
  }
}

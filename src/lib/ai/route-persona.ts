export function getWelcomeMessage(pathname: string): string {
  if (pathname.startsWith("/journal")) {
    return "Tell me about your day — wins, challenges, lessons, and how you're feeling. I can turn this into a journal entry.";
  }
  if (pathname.startsWith("/decisions")) {
    return "Talk through a decision — context, alternatives, tradeoffs, and when to revisit. I can log it as a structured decision record.";
  }
  if (pathname.startsWith("/meetings")) {
    return "Ask about meeting outcomes, upcoming schedules, follow-ups, or whether a meeting achieved its goals.";
  }
  if (pathname.startsWith("/research")) {
    return "Ask about research topics, experiments, validation status, or what to explore next. I can see all indexed research entries.";
  }
  if (pathname.startsWith("/knowledge")) {
    return "Ask about knowledge articles, policies, and documented learnings across the company.";
  }
  if (pathname.startsWith("/compliance")) {
    return "Ask about compliance obligations, deadlines, evidence gaps, and regulatory risk.";
  }
  if (pathname.startsWith("/risks")) {
    return "Ask about operational, security, financial, and product risks plus mitigation status.";
  }
  if (pathname.startsWith("/products")) {
    return "Ask about products, roadmap ideas, releases, competitors, and APIs.";
  }
  if (pathname.startsWith("/customers")) {
    return "Ask about customer health, contracts, and portfolio patterns. Customer identities stay masked.";
  }
  if (pathname.startsWith("/revenue")) {
    return "Ask about MRR, runway, forecast risks, or revenue trends. Customer names are masked.";
  }
  return "Ask me about your business — revenue, risks, compliance, research, decisions, or recent meetings.";
}

export function getPersonaForRoute(pathname: string): string {
  if (pathname.startsWith("/journal")) return "journal_assistant";
  if (pathname.startsWith("/decisions")) return "decision_assistant";
  if (pathname.startsWith("/meetings")) return "meeting_assistant";
  if (pathname.startsWith("/research")) return "research_assistant";
  if (pathname.startsWith("/compliance")) return "compliance_advisor";
  if (pathname.startsWith("/revenue")) return "revenue_advisor";
  return "business_advisor";
}

export function buildContextKey(pathname: string, openId?: string | null): string {
  if (openId) return `${pathname}?open=${openId}`;
  return pathname;
}

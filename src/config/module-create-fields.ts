import type { CreateField } from "@/components/dashboard/module-page-client";

export const researchCreateFields: CreateField[] = [
  { name: "title", label: "Title", required: true, placeholder: "Research topic title" },
  { name: "description", label: "Description", type: "textarea", placeholder: "What are you exploring?" },
];

export const knowledgeCreateFields: CreateField[] = [
  { name: "title", label: "Title", required: true, placeholder: "Article title" },
  { name: "content", label: "Content", type: "textarea", required: true, placeholder: "Write the article content" },
  { name: "summary", label: "Summary", type: "textarea", placeholder: "Optional short summary" },
];

export const journalCreateFields: CreateField[] = [
  { name: "content", label: "Entry", type: "textarea", required: true, placeholder: "What happened today?" },
  { name: "mood", label: "Mood", placeholder: "e.g. focused, tired, optimistic" },
  { name: "wins", label: "Wins", type: "textarea", placeholder: "What went well?" },
  { name: "challenges", label: "Challenges", type: "textarea", placeholder: "What was difficult?" },
  { name: "lessons", label: "Lessons", type: "textarea", placeholder: "What did you learn?" },
];

export const meetingsCreateFields: CreateField[] = [
  { name: "title", label: "Title", required: true, placeholder: "Meeting title" },
  { name: "agenda", label: "Agenda", type: "textarea", placeholder: "Topics to cover" },
];

export const decisionsCreateFields: CreateField[] = [
  { name: "title", label: "Title", required: true, placeholder: "Decision title" },
  { name: "context", label: "Context", type: "textarea", required: true, placeholder: "Background and situation" },
  { name: "decision", label: "Decision", type: "textarea", required: true, placeholder: "What was decided?" },
  { name: "reasoning", label: "Reasoning", type: "textarea", placeholder: "Why this choice?" },
];

export const customersCreateFields: CreateField[] = [
  { name: "name", label: "Name", required: true, placeholder: "Customer name" },
  { name: "company", label: "Company", placeholder: "Company name" },
  { name: "email", label: "Email", placeholder: "email@example.com" },
  { name: "industry", label: "Industry", placeholder: "e.g. Fintech" },
  { name: "notes", label: "Notes", type: "textarea", placeholder: "Additional context" },
];

export const productsCreateFields: CreateField[] = [
  { name: "name", label: "Name", required: true, placeholder: "Product name" },
  { name: "description", label: "Description", type: "textarea", placeholder: "What does this product do?" },
];

export const revenueCreateFields: CreateField[] = [
  { name: "type", label: "Type", required: true, placeholder: "e.g. subscription, one-time" },
  { name: "amount", label: "Amount", type: "number", required: true, placeholder: "0.00" },
  { name: "description", label: "Description", type: "textarea", placeholder: "Optional notes" },
];

export const complianceCreateFields: CreateField[] = [
  { name: "title", label: "Requirement", required: true, placeholder: "Compliance requirement" },
  { name: "category", label: "Category", required: true, placeholder: "e.g. Data Protection" },
  { name: "description", label: "Description", type: "textarea", placeholder: "Details and scope" },
];

export const risksCreateFields: CreateField[] = [
  { name: "title", label: "Risk", required: true, placeholder: "Risk title" },
  {
    name: "category",
    label: "Category",
    type: "select",
    required: true,
    options: [
      { value: "OPERATIONAL", label: "Operational" },
      { value: "SECURITY", label: "Security" },
      { value: "FINANCIAL", label: "Financial" },
      { value: "COMPLIANCE", label: "Compliance" },
      { value: "PRODUCT", label: "Product" },
    ],
  },
  { name: "description", label: "Description", type: "textarea", placeholder: "Describe the risk" },
  { name: "mitigation", label: "Mitigation", type: "textarea", placeholder: "How will you reduce this risk?" },
];

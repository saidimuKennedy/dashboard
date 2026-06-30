# Jiaminie Intelligence Platform (JIP)

# Unified RAG Implementation Plan

Version: 1.0
Status: Draft
Classification: Internal
Owner: Jiaminie Tech

Related documents:

- [07_AI_Architecture.md](./07_AI_Architecture.md)
- [03_Database_Design.md](./03_Database_Design.md)
- [05_Development_Backlog.md](./05_Development_Backlog.md)

---

# 1. Purpose

This document audits the current AI retrieval (RAG) implementation, identifies gaps between design and code, and defines a phased plan to make all business data in the platform visible and accessible to the AI agent.

The goal is a **unified RAG layer** — a second retrieval function alongside existing page-specific context injectors — so that entries created manually via forms and entries created through AI export flows are equally discoverable during agent chat.

---

# 2. Executive Summary

The app has two parallel AI context patterns today:

| Pattern | What it does | Coverage |
|--------|----------------|----------|
| **Page context** | Injects data when the user is on a specific route | Meetings, Revenue (aggregates only), Customers (per-customer chat only) |
| **RAG retrieval** | Searches indexed content for every chat prompt | **Knowledge articles only** (keyword `ILIKE`, not semantic search) |

Everything else — research, journal, decisions, products, compliance, risks, ideas, competitors, APIs, revenue line items — is stored in PostgreSQL but **not indexed or retrieved** during agent chat. Whether an entry was created manually or exported from AI chat does not matter; neither path feeds RAG.

The architecture documents describe full multi-source RAG with embeddings and a knowledge graph. **Implementation is roughly 5–10% of that design.**

---

# 3. Current Implementation Audit

## 3.1 What `aiService.chat()` Loads

Location: `src/server/ai/ai.service.ts`

1. **`retrieveContext(query)`** — always runs on every chat. Searches `KnowledgeArticle` via `knowledgeRepository.search()` (ILIKE on title, content, summary).
2. **Page injectors** — optional, keyed on `contextKey`:
   - `/revenue` → `getRevenueFactsForAgent()` (aggregated facts, not individual entries)
   - `/meetings` and `/meetings/:id` → `buildMeetingChatContext()` (direct DB read, not RAG)
3. **`searchSemantic()`** — misnamed; calls the same keyword search with a higher limit. No vector similarity.

No handler exists for `/research`, `/journal`, `/decisions`, `/compliance`, `/risks`, `/products`, or other module routes.

## 3.2 Embeddings Infrastructure

| Component | Status |
|-----------|--------|
| `Embedding` model + `pgvector` column | Schema exists |
| `POST /api/v1/knowledge/embed` | Upserts `content` text only; never computes or stores vectors |
| `POST /api/v1/jobs/embeddings` | Logs audit event; no worker |
| `POST /api/v1/jobs/reindex` | Logs audit event; no worker |
| Vector similarity queries | None in codebase |

## 3.3 Per-Entity Access Matrix

### Business content (should be RAG-indexed)

| Entity | UI module | Created via form | In global RAG? | Page context? | On-demand AI only? |
|--------|-----------|------------------|----------------|---------------|-------------------|
| `KnowledgeArticle` | `/knowledge` | Yes | **Partial** (keyword) | No | Summarize |
| `ResearchTopic` | `/research` | Yes | **No** | No | Summarize, export-from-chat |
| `JournalEntry` | `/journal` | Yes | **No** | No | Reflect/summarize, export-from-chat |
| `Decision` | `/decisions` | Yes | **No** | No | Premortem, similar decisions, export-from-chat |
| `Meeting` | `/meetings` | Yes | **No** | **Yes** (list or single) | Summarize, evaluate, action-items |
| `Idea` | Products roadmap | Yes | **No** | No | No |
| `Product` / `ProductRelease` | `/products` | Yes | **No** | No | No |
| `Customer` (+ notes, feedback) | `/customers` | Yes | **No** | Per-customer chat only | Analyze, portfolio, contracts |
| `CustomerContract` | Customers | Yes | **No** | Via customer chat | Contract generate |
| `ComplianceItem` | `/compliance` | Yes | **No** | No | No |
| `Risk` | `/risks` | Yes | **No** | No | Risk-analysis route (generic chat) |
| `SecurityIncident` | API | Yes | **No** | No | No |
| `Competitor` | API | Yes | **No** | No | No |
| `ApiRegistryEntry` | API | Yes | **No** | No | Document route |
| `RevenueEntry` / `Expense` / `SalesDeal` | `/revenue` | Yes | **No** | Aggregate facts only | No |
| `KnowledgeSource` | External sources | Yes | **No** | No | No |
| `Bookmark` (on research) | Research detail | Yes | **No** | No | No |

### System / meta tables (should NOT be RAG-indexed)

`User`, `AuditLog`, `AiConversation`, `AiMessage`, `AiPrompt`, `Event`, `Notification`, `Reminder`, `CalendarConnection`, `SystemSetting`, `DashboardLayout`, `SearchLog`, junction tables (`*Tag`, `MeetingParticipant`), `CustomerAlias` (use masked customer index instead).

### Other gaps

- **Research page** uses `business_advisor`, not `research_assistant` (persona exists but is not wired on `/research`).
- **Founder brief** uses table counts, not actual indexed content.
- **No index-on-write**: creating or updating any record does not update `Embedding`.
- **No cross-entity citations**: `sources` in AI messages are knowledge-only.
- **No permission filtering in RAG**: retrieval does not respect `DataClassification` on journal entries or revenue PII rules.

---

# 4. Target Architecture

Treat RAG as a **second function** alongside page context — not a replacement for it.

```
User chat (prompt + contextKey + user role)
        │
        ├─► Layer 1: Page context (route-specific injectors) ──┐
        │                                                     │
        └─► Layer 2: Unified RAG (new)                        │
                │                                             │
                ├─ Query understanding                        │
                ├─ Hybrid search                            │
                │     ├─ Keyword (pg_trgm / ILIKE)            │
                │     └─ Vector (pgvector cosine)             │
                ├─ Role + PII filter                          │
                └─ Re-rank + dedupe                           │
                        │                                     │
                        ▼                                     ▼
                  Context builder ──────────────────► DeepSeek
```

**Retrieval formula (per query):**

```
finalContext = pageContext(contextKey)
             + hybridRetrieve(prompt, { userRole, contextKeyBoost, limit })
```

- **Page context** = full records when the user is on a detail page (meetings, customers).
- **RAG** = cross-module discovery ("what research do we have on payments?", "which decisions mention pricing?").

## 4.1 Index Pipeline

```
CRUD on business entity
        │
        ▼
Entity serializer (per model)
        │
        ▼
Embedding provider (API)
        │
        ▼
Upsert embeddings table (content + vector)
```

Background jobs (`embeddings`, `reindex`) rebuild stale or missing rows.

---

# 5. Implementation Plan

## Phase 0 — Inventory and Contracts (1–2 days)

**Goal:** One source of truth for what gets indexed and how.

1. Add `src/server/ai/rag/entity-registry.ts` — register each indexable entity:
   - `entityType` (e.g. `research`, `decision`, `meeting`)
   - `serialize(record) → { title, body, metadata }`
   - `searchableFields` / token budget (cap at 8k chars, matching knowledge embed)
   - `permission`: which roles can retrieve
   - `piiPolicy`: `none` | `mask_customer` | `aggregate_only`
   - `contextKeyBoost`: optional weight when user is on `/research`, etc.

2. Define `RetrievedSource` type — extend current `{ id, title, type, excerpt }` with `entityType`, `url`, `score`.

3. Document exclusions explicitly (audit logs, credentials, raw PII fields).

**Deliverable:** Registry covering all 16 business entity types; no runtime change yet.

---

## Phase 1 — Index Pipeline (3–5 days)

**Goal:** Every CRUD on indexable entities updates the search index.

1. **`indexer.service.ts`**
   - `indexEntity(entityType, entityId)` — fetch, serialize, upsert `Embedding` row
   - `removeEntity(entityType, entityId)` — delete on soft-delete
   - `reindexAll(entityType?)` — full rebuild (powers existing stub jobs)

2. **Wire write hooks** — call indexer from repository `create` / `update` / `softDelete` methods, or a thin Prisma extension.

3. **Implement embedding generation**
   - Choose provider (DeepSeek embeddings, or OpenAI `text-embedding-3-small` as fallback)
   - Store vector in `Embedding.vector`
   - Add SQL index on vector column (`ivfflat` or HNSW)

4. **Make admin jobs real**
   - `/api/v1/jobs/embeddings` → process queue of stale/missing embeddings
   - `/api/v1/jobs/reindex` → rebuild all serializers → embeddings

5. **Backfill script** — one-time index of all existing rows.

**Deliverable:** `embeddings` table populated for all business entities; jobs process real work.

---

## Phase 2 — Hybrid Retrieval (3–4 days)

**Goal:** Replace `retrieveContext()` with unified search.

1. **`retrieval.service.ts`**
   - `hybridSearch(query, { limit, userRole, contextKey })`:
     - **Keyword leg:** `pg_trgm` or ILIKE across serialized content
     - **Vector leg:** cosine similarity on `Embedding.vector`
     - **Merge:** reciprocal rank fusion or weighted score
     - **Boost:** weight for `entityType` matching current `contextKey`
     - **Filter:** role permissions, `deletedAt: null`, journal `visibility`

2. **Replace** `retrieveContext` and `searchSemantic` to use `hybridSearch`.

3. **PII safety for customers**
   - Serialize using existing `buildMaskedCustomerContext` patterns
   - Never index raw `email`, `phone`, `name` — index alias + industry + masked notes
   - Reuse `assertNoPii` at retrieval boundary for customer chunks

4. **Revenue**
   - Index aggregate-friendly snippets per customer/product/month
   - Do not index raw PII from revenue accounts; align with `getRevenueFactsForAgent` masking rules

5. **Return proper citations** in `AiResponse.sources` for all entity types.

**Deliverable:** Agent chat answers cross-module questions with cited sources from any indexed table.

---

## Phase 3 — Page Context Alignment (2–3 days)

**Goal:** Route-specific behavior matches user expectations.

| Route | Persona fix | Context behavior |
|-------|-------------|------------------|
| `/research` | `research_assistant` | Boost research in RAG; optional detail context for `?open=id` |
| `/journal` | `journal_assistant` | Boost journal; respect `visibility` |
| `/decisions` | `decision_assistant` | Boost decisions |
| `/compliance` | `compliance_advisor` | Boost compliance |
| `/risks` | business or dedicated | Boost risks |
| `/products` | `business_advisor` | Boost products + ideas |
| `/knowledge` | `business_advisor` | Boost knowledge |

Add a generic `buildDetailContext(contextKey)` helper for `/:module?open=:id` patterns (meetings already has this).

**Deliverable:** Being on a module page makes that module's data first-class in both RAG boost and optional full-record injection.

---

## Phase 4 — Quality, Observability, Governance (ongoing)

1. **`SearchLog`** — log query, hits, latency, user (table already exists).
2. **Stale index detection** — compare `entity.updatedAt` vs `embedding.updatedAt`.
3. **Token budget manager** — cap total retrieved context (~4–8k tokens); rank by score.
4. **Founder brief / weekly report** — pull from RAG + aggregates, not just counts.
5. **Tests** — fixture per entity type: create via form → index → retrieve in chat.
6. **Knowledge graph** (later phase) — explicit edges: `Meeting → Decision`, `Research → Product`.

---

# 6. Suggested File Structure

```
src/server/ai/rag/
  entity-registry.ts      # serializers + permissions per model
  indexer.service.ts      # index / remove / reindex
  retrieval.service.ts    # hybridSearch, merge, filter
  embedding.provider.ts   # call embedding API, return vector
  context-builder.ts      # page context + RAG merge
  types.ts
```

Refactor `ai.service.ts` to delegate to `context-builder.ts` instead of growing it further.

---

# 7. Priority Order (Incremental Delivery)

| Sprint | Scope | User-visible win |
|--------|--------|------------------|
| **1** | Research + Decisions + Journal serializers + keyword index (no vectors yet) | "What did we decide about X?" works |
| **2** | Meetings + Compliance + Risks + Products/Ideas | Cross-module business questions |
| **3** | Vector embeddings + hybrid search | Semantic "similar topics" retrieval |
| **4** | Customers (masked) + Revenue snippets | Financial/customer questions without PII leaks |
| **5** | Competitors + APIs + Knowledge sources | Full doc parity |

Keyword-only in Sprint 1 is a valid MVP — `pg_trgm` is already enabled in the schema and unblocks retrieval before embedding infrastructure is complete.

---

# 8. Risks

| Risk | Mitigation |
|------|------------|
| PII leakage | Index masked customer/revenue representations only; add retrieval tests |
| Token explosion | Strict per-type limits; summarize long bodies (meeting transcripts) |
| Permission drift | RAG must enforce same checks as API routes (`knowledge.read`, `revenue.manage`, journal visibility) |
| Stale index | Write hooks on CRUD + `updatedAt` comparison + background jobs |
| Naming debt | Rename `searchSemantic` once vectors work |

---

# 9. Success Criteria

- [ ] Creating a research entry via the form makes it retrievable in generic chat within seconds
- [ ] `POST /api/v1/search/semantic` returns results from multiple entity types with scores
- [ ] AI panel `sources` cite research, decisions, meetings, etc. — not only knowledge
- [ ] Embeddings/reindex admin jobs process real work, not just audit events
- [ ] Customer names/emails never appear in indexed content or retrieved chunks
- [ ] Role-restricted users do not receive chunks they could not fetch via API

---

# 10. Recommended Next Step

Start with **Phase 0 + Sprint 1**: entity registry, indexer, write hooks on Research / Decisions / Journal repositories, and wire `retrieveContext` to unified keyword search.

That is the smallest slice that fixes the immediate gap — manual research entries becoming visible to the agent — and establishes the pattern for every other table.

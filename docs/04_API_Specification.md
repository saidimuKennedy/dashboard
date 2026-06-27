# Jiaminie Intelligence Platform (JIP)

# API Specification

Version: 0.1
Status: Draft
Owner: Jiaminie Tech

---

# 1. Purpose

This document defines every public and internal API exposed by the Jiaminie Intelligence Platform.

The API follows:

• REST Architecture
• Resource Based Routing
• JSON Responses
• JWT Authentication
• Role Based Authorization
• Versioning
• Audit Logging
• Idempotent Operations
• Secure by Default

Future support:

• GraphQL
• MCP Server
• Public SDK
• Webhooks

---

# 2. API Design Principles

Every endpoint must:

✓ Require authentication unless public

✓ Validate inputs

✓ Return structured errors

✓ Be fully typed

✓ Generate audit logs

✓ Return consistent responses

✓ Never expose internal implementation

---

# 3. Base URL

/api/v1

Future

/api/v2

---

# 4. Authentication

POST

/auth/login

POST

/auth/logout

POST

/auth/refresh

GET

/auth/me

POST

/auth/change-password

POST

/auth/forgot-password

POST

/auth/reset-password

Future

OAuth

SSO

MFA

---

# Authentication Flow

Client

↓

JWT

↓

Middleware

↓

Permission Check

↓

Business Logic

↓

Database

---

# Authorization

Role Based

Founder

Administrator

Developer

Sales

Support

Marketing

Compliance

Viewer

Every endpoint defines required permission.

Example

knowledge.write

---

# 5. User APIs

GET

/users

GET

/users/:id

POST

/users

PATCH

/users/:id

DELETE

/users/:id

GET

/users/profile

PATCH

/users/profile

---

# 6. Dashboard APIs

GET

/dashboard

Returns

Revenue

Tasks

Compliance

KPIs

Founder Summary

Notifications

AI Brief

GET

/dashboard/widgets

PATCH

/dashboard/layout

---

# 7. Knowledge APIs

GET

/knowledge

GET

/knowledge/:id

POST

/knowledge

PATCH

/knowledge/:id

DELETE

/knowledge/:id

POST

/knowledge/search

POST

/knowledge/summarize

POST

/knowledge/embed

GET

/knowledge/related

---

# 8. Categories

GET

/categories

POST

/categories

PATCH

/categories/:id

DELETE

/categories/:id

---

# 9. Tags

GET

/tags

POST

/tags

PATCH

/tags/:id

DELETE

/tags/:id

---

# 10. Research APIs

GET

/research

POST

/research

PATCH

/research/:id

DELETE

/research/:id

POST

/research/complete

POST

/research/archive

POST

/research/summarize

---

# 11. Meeting APIs

GET

/meetings

POST

/meetings

PATCH

/meetings/:id

DELETE

/meetings/:id

POST

/meetings/transcribe

POST

/meetings/summary

POST

/meetings/action-items

---

# 12. Founder Journal

GET

/journal

POST

/journal

PATCH

/journal/:id

DELETE

/journal/:id

POST

/journal/reflect

---

# 13. Decisions

GET

/decisions

POST

/decisions

PATCH

/decisions/:id

DELETE

/decisions/:id

POST

/decisions/review

---

# 14. Customer APIs

GET

/customers

GET

/customers/:id

POST

/customers

PATCH

/customers/:id

DELETE

/customers/:id

POST

/customers/feedback

POST

/customers/note

GET

/customers/timeline

---

# 15. Product APIs

GET

/products

POST

/products

PATCH

/products/:id

DELETE

/products/:id

POST

/products/releases

POST

/products/roadmap

---

# 16. Revenue APIs

GET

/revenue

POST

/revenue

PATCH

/revenue/:id

DELETE

/revenue/:id

GET

/revenue/mrr

GET

/revenue/forecast

GET

/revenue/reports

---

# 17. Compliance APIs

GET

/compliance

POST

/compliance

PATCH

/compliance/:id

DELETE

/compliance/:id

POST

/compliance/review

GET

/compliance/deadlines

POST

/compliance/evidence

---

# 18. Cybersecurity APIs

GET

/security/incidents

POST

/security/incidents

GET

/security/threats

POST

/security/threats

GET

/security/risks

PATCH

/security/risks

---

# 19. Competitor APIs

GET

/competitors

POST

/competitors

PATCH

/competitors/:id

DELETE

/competitors/:id

POST

/competitors/pricing

POST

/competitors/features

---

# 20. API Registry

GET

/apis

POST

/apis

PATCH

/apis/:id

DELETE

/apis/:id

POST

/apis/test

POST

/apis/document

---

# 21. AI APIs

POST

/ai/chat

POST

/ai/summarize

POST

/ai/classify

POST

/ai/embeddings

POST

/ai/search

POST

/ai/recommend

POST

/ai/weekly-report

POST

/ai/founder-brief

POST

/ai/analyze

POST

/ai/risk-analysis

---

# AI Request

{
    "prompt": "",
    "context": [],
    "temperature": 0.3
}

---

# AI Response

{
    "response": "",
    "sources": [],
    "confidence": 0.94,
    "tokens": 1388
}

---

# 22. Search APIs

POST

/search

POST

/search/semantic

POST

/search/fulltext

GET

/search/recent

GET

/search/popular

---

# 23. Analytics APIs

GET

/analytics

GET

/analytics/revenue

GET

/analytics/knowledge

GET

/analytics/compliance

GET

/analytics/products

GET

/analytics/customers

GET

/analytics/research

GET

/analytics/founder

---

# 24. Notification APIs

GET

/notifications

PATCH

/notifications/read

DELETE

/notifications

POST

/reminders

PATCH

/reminders

DELETE

/reminders

---

# 25. Administration APIs

GET

/admin/users

GET

/admin/logs

GET

/admin/settings

PATCH

/admin/settings

GET

/admin/jobs

POST

/admin/jobs/run

---

# 26. Background Jobs

POST

/jobs/scrape

POST

/jobs/reindex

POST

/jobs/embeddings

POST

/jobs/report

POST

/jobs/backup

POST

/jobs/cleanup

Only administrators.

---

# 27. Webhooks

Incoming

/webhooks/meta

/webhooks/github

/webhooks/google

/webhooks/kra

/webhooks/stripe

/webhooks/resend

Outgoing

Customer Created

Research Completed

Compliance Updated

Revenue Recorded

Meeting Finished

---

# 28. Error Format

{
    "success": false,
    "code": "VALIDATION_ERROR",
    "message": "Title is required.",
    "errors": []
}

---

# Success Format

{
    "success": true,
    "message": "Knowledge article created.",
    "data": {}
}

---

# Pagination

?page=1

&limit=20

&sort=created_at

&order=desc

---

# Filtering

?status=published

?category=Compliance

?product=JChats

?tag=Meta

---

# Security

Every endpoint uses

Authentication

↓

Authorization

↓

Rate Limiting

↓

Validation

↓

Business Rules

↓

Audit Log

↓

Response

---

# Rate Limits

Anonymous

60/hour

Authenticated

600/hour

AI Endpoints

30/minute

Search

120/minute

Webhook

Signed Requests Only

---

# Versioning

v1

Stable

v2

Experimental

Breaking changes only in new versions.

---

# Internal Services

AI Service

Knowledge Service

Research Service

Customer Service

Revenue Service

Compliance Service

Analytics Service

Notification Service

Scraper Service

Authentication Service

Each service owns its own business rules.

---

# Architectural Rules

Controllers never contain business logic.

Controllers

↓

Services

↓

Repositories

↓

Prisma

↓

Database

External APIs accessed only through adapter classes.

AI providers abstracted behind a provider interface.

No endpoint accesses another endpoint internally.

Communication occurs through services or domain events.

---

# API Philosophy

The JIP API is not merely an interface for the frontend.

It is the central contract that connects users, AI, background workers, external integrations, analytics engines, and future applications.

Every endpoint should be stable, predictable, secure, auditable, and reusable, enabling Jiaminie Tech to expand its ecosystem without redesigning its core platform.

# Jiaminie Intelligence Platform (JIP)

## System Architecture

Version: 0.1
Status: Draft
Owner: Jiaminie Tech

---

# 1. Architectural Philosophy

JIP is not a CRUD application.

It is an Intelligence Platform.

Its responsibility is to continuously collect, organize, secure, analyze and present business intelligence that enables founders to make informed decisions.

The architecture therefore prioritizes:

• Security by Design
• Privacy by Design
• Event-Driven Thinking
• Domain-Driven Design (DDD)
• AI-Assisted Intelligence
• Clean Architecture
• Modularity
• Auditability
• Scalability
• Explainability

---

# 2. Core Principles

## Security First

Security is implemented before features.

Every module must assume:

- hostile networks
- compromised credentials
- malicious inputs
- untrusted external data

---

## AI Assists

AI never becomes the source of truth.

AI:

✓ summarizes

✓ recommends

✓ classifies

✓ extracts

✓ predicts

AI never

✗ deletes production data

✗ executes SQL

✗ modifies records automatically

✗ bypasses permissions

---

## Everything Is Traceable

Every business event becomes part of company history.

Examples

Customer onboarded

↓

Meeting held

↓

Revenue received

↓

Decision made

↓

API changed

↓

Competitor launched feature

↓

Compliance update published

Everything is searchable.

---

# 3. Architectural Style

Primary Pattern

Clean Architecture

Inside

↓

Domain Driven Design

Communication

↓

Event Driven

Background Work

↓

Asynchronous Jobs

AI

↓

Service Layer

Persistence

↓

Repository Pattern

---

# 4. High-Level Architecture

                     Browser

                        │

                  Next.js Frontend

                        │

────────────────────────────────────────

                 Application Layer

────────────────────────────────────────

Dashboard

Knowledge

Research

Compliance

Revenue

Customers

AI

Analytics

Notifications

Administration

────────────────────────────────────────

                Domain Services

────────────────────────────────────────

Knowledge Service

Revenue Service

Compliance Service

Research Service

Reminder Service

Customer Service

Analytics Service

AI Service

Scraper Service

Notification Service

────────────────────────────────────────

              Infrastructure Layer

────────────────────────────────────────

Prisma

PostgreSQL

Redis

DeepSeek

Trigger.dev

Object Storage

────────────────────────────────────────

              External Services

────────────────────────────────────────

Meta

Google

GitHub

KRA

Government

RSS

Official APIs

Email

---

# 5. Technology Stack

Frontend

Next.js 15

React 19

TypeScript

TailwindCSS

shadcn/ui

TanStack Query

TanStack Table

Framer Motion

Backend

Next.js Route Handlers

Prisma ORM

Node.js

Database

PostgreSQL

pgvector

Redis

Background Jobs

Trigger.dev

Future

BullMQ

AI

DeepSeek

Embeddings

Future Multi-model Support

Storage

S3 Compatible Storage

Monitoring

Sentry

Better Stack

Analytics

PostHog

---

# 6. Domain Driven Design

The platform is divided into bounded contexts.

Knowledge

Research

Compliance

Revenue

Customers

Products

Meetings

Ideas

AI

Notifications

Security

Administration

Each bounded context owns its own logic.

No direct coupling.

---

# 7. Module Architecture

Dashboard

Responsible for

KPIs

Charts

Founder Brief

Widgets

No business logic.

Dashboard only aggregates.

---

Knowledge Base

Responsible for

Articles

Research

Meeting Notes

Decisions

Documentation

Embeddings

Search

---

Compliance

Responsible for

Policies

KRA

Meta

Google

Legal Documents

Deadlines

Alerts

Risk Levels

---

Research

Responsible for

Reading Queue

Experiments

Research Notes

Bookmarks

Learning Pipeline

---

Revenue

Responsible for

Revenue

Customers

Invoices

Contracts

Subscriptions

Support

Reports

Forecasting

---

Customers

Responsible for

Profiles

Feedback

Meetings

Products

Opportunities

Support

---

AI

Responsible for

Summaries

Recommendations

Classification

Embeddings

Chat

Semantic Search

---

Security

Responsible for

Authentication

Authorization

Audit

Secrets

Sessions

Logging

---

# 8. Event Driven Architecture

Everything important becomes an Event.

Examples

CustomerCreated

MeetingHeld

IdeaCaptured

RevenueRecorded

RiskCreated

ResearchCompleted

ComplianceUpdated

ReminderCompleted

Every event has

UUID

Timestamp

Actor

Entity

Metadata

Source

Severity

Tags

---

# 9. AI Architecture

Frontend

↓

AI Service

↓

Prompt Manager

↓

DeepSeek Client

↓

Output Validator

↓

Database

Prompt Templates

Business Advisor

Compliance Advisor

Cyber Advisor

Research Assistant

Revenue Advisor

Meeting Summarizer

Customer Analyst

Competitor Analyst

No prompt lives inside components.

---

# 10. Search Architecture

Keyword Search

↓

PostgreSQL Full Text Search

Semantic Search

↓

pgvector

Results

↓

Ranked

↓

Merged

↓

Displayed

Every document

Every meeting

Every decision

Every article

Every customer note

Every API

searchable.

---

# 11. Scraper Architecture

Scheduler

↓

Source Registry

↓

Permission Checker

↓

Worker Queue

↓

Playwright

↓

Parser

↓

Cleaner

↓

AI Summarizer

↓

Knowledge Base

↓

Notification Engine

No scraper bypasses robots.txt or terms of service.

Every source requires approval.

---

# 12. Source Registry

Every external source must be registered.

Fields

Name

Owner

Category

Official API

RSS

Documentation

Terms Reviewed

robots.txt Reviewed

Authentication Required

Allowed

Review Date

Risk Level

Status

Workers may only consume approved sources.

---

# 13. Security Architecture

Authentication

↓

Authorization

↓

Validation

↓

Business Rules

↓

Persistence

↓

Audit

Every layer validates independently.

Never trust frontend validation.

---

# 14. Authentication

Preferred

Clerk

Alternative

Auth.js

Future

SSO

MFA mandatory for founders.

---

# 15. Authorization

RBAC

Founder

Administrator

Developer

Sales

Support

Future

ABAC

Permissions never live in frontend.

---

# 16. Data Classification

Public

Internal

Confidential

Restricted

Highly Sensitive

Each document has a classification.

---

# 17. Encryption

HTTPS

Secure Cookies

Encrypted Secrets

Database encryption where appropriate

Passwords

Argon2

---

# 18. Logging

Audit Log

Security Log

Application Log

Background Job Log

AI Log

Scraper Log

Logs are immutable.

---

# 19. Notification Architecture

Reminder

↓

Notification Service

↓

Email

In-App

WhatsApp

Future

Slack

Telegram

---

# 20. Background Jobs

Daily

Scrape Approved Sources

Generate AI Summary

Create Founder Brief

Compliance Check

Weekly

Generate Executive Report

Risk Review

Knowledge Digest

Monthly

Trend Analysis

Compliance Review

Revenue Forecast

---

# 21. Analytics Architecture

Operational Analytics

Revenue

Customers

Products

Traffic

Knowledge Analytics

Articles

Research

Ideas

Meetings

Compliance Analytics

Deadlines

Policies

Reviews

AI Analytics

Prompt Usage

Recommendations

Searches

Founder Analytics

Activity

Learning

Decisions

Execution

---

# 22. Disaster Recovery

Daily Backups

Point-in-Time Recovery

Encrypted Backups

Backup Verification

Quarterly Restore Tests

---

# 23. Scalability Strategy

Current

Single PostgreSQL Instance

↓

Read Replicas

↓

Redis Cache

↓

Horizontal Workers

↓

Microservices (Future)

No premature microservices.

---

# 24. Coding Standards

Feature-based architecture

Strict TypeScript

Repository Pattern

Dependency Injection

Zod Validation

No business logic in UI

No duplicated interfaces

100% typed APIs

---

# 25. Deployment

GitHub

↓

CI

↓

Tests

↓

Build

↓

Security Scan

↓

Deploy

↓

Smoke Tests

↓

Production

---

# 26. Monitoring

Sentry

Performance

Errors

API Failures

Slow Queries

Background Jobs

Health Checks

---

# 27. Architectural Decisions (ADR)

Every major technical decision must be documented.

Template

Problem

Decision

Alternatives

Tradeoffs

Consequences

Review Date

---

# 28. Future Vision

JIP evolves into

Business Intelligence Platform

↓

Knowledge Graph

↓

AI Operating System

↓

Predictive Analytics

↓

Autonomous Research Assistant

↓

Strategic Decision Support Platform

The platform should become the institutional memory of Jiaminie Tech and eventually power decision-making across all company products.

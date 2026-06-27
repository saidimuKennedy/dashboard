# Jiaminie Intelligence Platform (JIP)

# Database Design Document

Version: 0.1
Status: Draft
Owner: Jiaminie Tech

---

# 1. Purpose

This document defines the logical and physical database design for the Jiaminie Intelligence Platform (JIP).

The database must support:

• Knowledge Management
• AI Intelligence
• Company Operations
• Revenue Analytics
• Compliance
• Customer Intelligence
• Product Management
• Founder Journaling
• Research
• Risk Management

while remaining:

- Highly searchable
- Secure
- Auditable
- Scalable
- AI-ready

---

# 2. Design Principles

## PostgreSQL First

The entire platform is designed around PostgreSQL.

Reasons

• Mature ecosystem
• JSON support
• Full Text Search
• pgvector
• ACID compliance
• Excellent analytics support

---

## UUID Everywhere

Every primary key

UUID

Never integer IDs.

---

## Soft Deletes

Every business entity contains

deleted_at

Nothing is permanently deleted except backups.

---

## Auditability

Every important table contains

created_by

updated_by

created_at

updated_at

version

---

## Event Driven

The database stores events.

Not simply objects.

Every meaningful business action becomes searchable history.

---

# 3. Database Domains

The database is divided into bounded contexts.

Identity

Knowledge

Research

Meetings

Customers

Products

Revenue

Compliance

Security

Notifications

AI

Analytics

Administration

---

# 4. Core Entity Relationship

Users

↓

Projects

↓

Products

↓

Customers

↓

Meetings

↓

Ideas

↓

Research

↓

Knowledge

↓

Decisions

↓

Revenue

↓

Analytics

Every domain remains loosely coupled.

---

# 5. Identity Domain

## Users

Purpose

Platform users.

Fields

id

email

password_hash

first_name

last_name

avatar

status

last_login

created_at

updated_at

---

## Roles

Founder

Administrator

Developer

Sales

Marketing

Support

Compliance

Viewer

---

## Permissions

Granular permission system.

Examples

knowledge.read

knowledge.write

knowledge.delete

customer.manage

ai.use

compliance.manage

---

# 6. Knowledge Domain

## Knowledge Articles

Stores

Documentation

Tutorials

Research

Guides

Policies

Fields

id

title

slug

summary

content

category_id

author_id

status

visibility

search_vector

embedding

created_at

updated_at

---

## Categories

Examples

Compliance

Cybersecurity

Finance

Products

Marketing

Research

Engineering

---

## Tags

Many-to-many

Knowledge ↔ Tags

---

## Sources

Tracks origin of knowledge.

Fields

Source Name

Official

RSS

API

Website

Risk Level

Review Date

robots_checked

terms_reviewed

approved

---

# 7. Founder Intelligence Domain

## Daily Journal

Stores

Thoughts

Lessons

Challenges

Ideas

Mood (optional)

Wins

Fields

id

author_id

date

content

visibility

tags

---

## Decisions

Every important decision.

Fields

Title

Context

Alternatives

Decision

Reasoning

Outcome

Review Date

Status

---

## Ideas

Idea repository.

Fields

Title

Description

Category

Priority

Stage

Related Product

Status

---

# 8. Meetings Domain

Meetings

Participants

Agenda

Minutes

Action Items

Follow Ups

AI Summary

Transcript

Attachments

---

Meeting Participants

Meeting

↓

User

Many-to-many.

---

# 9. Research Domain

Research Topics

Research Notes

Bookmarks

Experiments

Reading Queue

Learning Progress

Research Sources

Research Status

---

Pipeline

Idea

↓

Researching

↓

Experimenting

↓

Validated

↓

Implemented

↓

Archived

---

# 10. Customer Domain

Customers

Companies

Contacts

Products

Meetings

Feedback

Support

Contracts

Opportunities

Customer Timeline

Everything linked.

---

# 11. Revenue Domain

Revenue Entries

Invoices

Subscriptions

Payments

Expenses

Forecasts

KPIs

MRR

ARR

Support Revenue

Implementation Revenue

Average Revenue Per Customer

---

# 12. Product Domain

Products

Modules

Releases

Roadmaps

Issues

Feature Requests

Customer Requests

---

Current Products

JChats

CRM

POS

Socials

Future Products

---

# 13. Compliance Domain

Regulations

Requirements

Policies

Deadlines

Compliance Tasks

Compliance Evidence

Compliance Reviews

Risk Rating

---

Examples

KRA

Meta

Google

Data Protection

Internal Policies

---

# 14. Cybersecurity Domain

Threat Reports

Incidents

Vulnerabilities

Risk Assessments

Security Reviews

Dependencies

Patch Tracking

---

# 15. AI Domain

Prompt Library

AI Conversations

Embeddings

Summaries

Recommendations

Classification Results

Confidence Scores

Prompt Versions

---

No AI output overwrites source data.

---

# 16. Analytics Domain

Dashboard Metrics

Historical Metrics

Traffic

Usage

Knowledge Growth

Research Progress

Revenue Trends

Customer Trends

Compliance Score

---

# 17. Notification Domain

Notifications

Reminder Rules

Reminder History

Channels

Email

In App

WhatsApp

Future SMS

---

# 18. Event Store

Every significant action generates an event.

Examples

CustomerCreated

MeetingHeld

ArticlePublished

RevenueReceived

RiskCreated

ReminderCompleted

Fields

Event Type

Timestamp

Actor

Entity

Metadata

Source

Severity

Correlation ID

---

# 19. AI Embeddings

Every searchable object receives embeddings.

Knowledge

Meetings

Research

Ideas

Customer Notes

API Docs

Policies

Allows semantic search.

---

# 20. Indexing Strategy

Unique

email

slug

Composite

product_id + created_at

customer_id + date

GIN

JSON

Full Text Search

pgvector

Embedding Indexes

---

# 21. Relationships

User

↓

creates

↓

Knowledge

↓

linked to

↓

Research

↓

linked to

↓

Meeting

↓

linked to

↓

Decision

↓

linked to

↓

Customer

↓

linked to

↓

Revenue

This creates the company knowledge graph.

---

# 22. Data Lifecycle

Create

↓

Review

↓

Active

↓

Archived

↓

Soft Deleted

↓

Backup

Nothing is lost.

---

# 23. Backup Strategy

Daily Incremental

Weekly Full

Monthly Snapshot

Quarterly Restore Test

Retention

365 Days

---

# 24. Future Expansion

Potential future domains

Human Resources

Assets

Inventory

Investor Relations

Legal

Procurement

Vendor Management

Financial Forecasting

AI Agents

Knowledge Graph Database

---

# 25. Database Standards

Every table must contain

id UUID

created_at

updated_at

created_by

updated_by

deleted_at

version

Every foreign key must be indexed.

Every lookup table must use enums where appropriate.

Every business object must be auditable.

No direct SQL from application code.

All access passes through Prisma repositories.

---

# 26. Database Philosophy

The JIP database is not merely a storage engine.

It is the institutional memory of Jiaminie Tech.

Every customer interaction,
every meeting,
every idea,
every regulation,
every research finding,
every revenue event,
every decision,

becomes structured organizational knowledge that can be searched, analyzed, related, and understood by both humans and AI.

The database is therefore designed not only for today's operational needs but for the long-term creation of an intelligent business knowledge graph.

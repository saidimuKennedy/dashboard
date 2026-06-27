# Revenue data contract — JIP Finance

Single source of truth for **services revenue** (POS, WA, JChats, CRM, implementations, support). This module does **not** include storefront commerce order sales.

## Scope

| In scope | Out of scope |
|----------|--------------|
| B2B service products and contracts | Commerce orders / SKU catalogue |
| Revenue ledger entries | Shopper identities |
| Expenses, cash snapshots | M-Pesa order webhooks |

## Models (JIP mapping)

| Model | Role |
|-------|------|
| `Product` | What you sell (JChats, CRM, POS, WA, …) |
| `Customer` + `CustomerAlias` | B2B client; alias in all shared reports |
| `CustomerContract` | MRR, renewal (`endDate`), contract value |
| `RevenueEntry` | Ledger row (recognized revenue) |
| `Expense` | Operating costs |
| `CashSnapshot` | Manual cash balance for runway |
| `SalesDeal` | Pipeline for forecasting |

## PII & aliases

| Field | `revenue.manage` (read) | Founder / Admin |
|-------|-------------------------|-----------------|
| `CustomerAlias.alias` | Visible | Visible |
| `Customer.name`, contacts | Hidden in reports | Visible when `canRevealPii` |
| `invoiceRef` in ledger | Masked (`INV-•••1234`) | Full |

AI uses **redacted facts** from `getRevenueFactsForAgent()` — aliases only.

## Metric definitions

| Metric | Formula |
|--------|---------|
| **MRR** | Sum `CustomerContract.mrr` (or `value`) where `status IN (ACTIVE, EXPIRING)` and not retainer |
| **ARR** | MRR × 12 |
| **Revenue (month)** | Sum `RevenueEntry.amount` where `status = paid` and `recordedAt` in month |
| **One-time revenue** | Paid entries where `type` ∉ {subscription, maintenance, support} |
| **Support revenue** | Paid entries where `type IN (maintenance, support)` |
| **Gross margin %** | `(revenue − expenses) / revenue × 100` when revenue > 0 |
| **Net profit** | Revenue − expenses (month) |
| **Runway (months)** | Latest `CashSnapshot.balance` ÷ avg monthly expenses (trailing 3 months) |
| **Active customers** | Count of `Customer` with `status = ACTIVE` |

Amounts are stored in **major KES units** (`Decimal(12,2)`), not minor units.

## Revenue types

`subscription`, `implementation`, `maintenance`, `consulting`, `integration`, `training`, `licensing`, `commission`, `support`, `other`

## Forecast (v1)

```
expectedNextMonth =
  currentMrr
  + sum(open deals: expectedValue × probability / 100, close date in next month)
  − sum(expiring contract mrr where endDate in next 30d and autoRenew = false)
```

## Permissions

- `revenue.manage` — center dashboard, CRUD entries, aliases in reports (FOUNDER, ADMINISTRATOR)

## Default service products

Seeded on first visit to `/revenue`: `jchats`, `crm`, `pos`, `wa`, `web`, `social`, `support`.

## Code map

- Reports: `src/lib/finance/reports.ts`
- Redaction: `src/lib/finance/redaction.ts`
- Repository: `src/server/repositories/finance.repository.ts`
- API: `GET /api/v1/revenue/center`
- UI: `src/components/revenue/revenue-page-client.tsx`

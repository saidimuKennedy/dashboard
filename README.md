# Jiaminie Intelligence Platform (JIP)

Founder Operating System — institutional memory and business intelligence for Jiaminie Tech.

## Stack

- **Next.js 15** · React 19 · TypeScript
- **PostgreSQL** + Prisma ORM (pgvector-ready)
- **Tailwind CSS v4** · shadcn-style components
- **JWT auth** · RBAC · audit logging
- **DeepSeek AI** (optional RAG layer)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET

# 3. Set up database (requires PostgreSQL with pgvector)
npm run db:push
npm run db:seed

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login)

**Default credentials** (after seed):
- `founder@jiaminie.tech` / `founder123`
- `admin@jiaminie.tech` / `admin123`

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Authentication
│   ├── (dashboard)/           # All module pages
│   └── api/v1/                # REST API (104 endpoints)
├── components/
│   ├── ui/                    # Design system components
│   ├── layout/                # Sidebar, header, AI panel
│   └── dashboard/             # Dashboard widgets
├── lib/                       # Auth, API utils, permissions
└── server/
    ├── repositories/          # Data access layer
    └── ai/                    # AI service (DeepSeek + RAG)
prisma/
└── schema.prisma              # Full domain schema
docs/                          # Architecture & spec documents
```

## Modules

| Module | Route | API |
|--------|-------|-----|
| Executive Dashboard | `/dashboard` | `GET /api/v1/dashboard` |
| Knowledge Base | `/knowledge` | `/api/v1/knowledge` |
| Founder Journal | `/journal` | `/api/v1/journal` |
| Meetings | `/meetings` | `/api/v1/meetings` |
| Decisions | `/decisions` | `/api/v1/decisions` |
| Research | `/research` | `/api/v1/research` |
| Customers | `/customers` | `/api/v1/customers` |
| Products | `/products` | `/api/v1/products` |
| Revenue | `/revenue` | `/api/v1/revenue` |
| Compliance | `/compliance` | `/api/v1/compliance` |
| Risk Register | `/risks` | `/api/v1/security/risks` |
| Analytics | `/analytics` | `/api/v1/analytics` |
| AI Assistant | `/ai` | `/api/v1/ai/*` |

## Documentation

See the `docs/` folder for full architecture specifications:

- `01_Project_Brief.md` — Vision & modules
- `02_System_Architecture.md` — Tech stack & patterns
- `03_Database_Design.md` — Schema domains
- `04_API_Specification.md` — All API endpoints
- `05_Development_Backlog.md` — Epics & sprints
- `06_Security_Architecture.md` — Security model
- `07_AI_Architecture.md` — AI/RAG design
- `08_UI_UX_Design_System.md` — Design tokens & layout

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Session signing secret |
| `DEEPSEEK_API_KEY` | No | Enables live AI responses |

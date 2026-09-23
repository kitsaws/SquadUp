# 🚀 SquadUp

<div align="center">

**The High-Performance Team Formation & Hackathon Platform for Universities**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0+-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00e599?logo=postgresql&logoColor=black)](https://neon.tech/)
[![Groq AI](https://img.shields.io/badge/Groq-Llama_3.3_70B-f55036?logo=meta&logoColor=white)](https://groq.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-ef4444?logo=turborepo&logoColor=white)](https://turbo.build/)

</div>

---

## 🌟 Overview

**SquadUp** is an intelligent, high-performance team-forming and event-hosting platform built specifically for universities, hackathons, and technical competitions. It eliminates chaotic spreadsheets, unstructured Discord threads, and manual matchmaking by combining:

1. ⚡ **Deterministic 151-Node Knowledge Graph:** Evaluates candidate capabilities against structured squad positions (`TeamRole`) in sub-15ms using an in-memory canonical hierarchy—guaranteeing 100% transparent, explainable LCA scoring with **zero hallucinations**.
2. 🤖 **AI Resume Ingestion & Multi-Source Evidence:** Automatically parses uploaded PDF resumes into structured developer profiles via Groq LLM (`llama-3.3-70b-versatile`), extracting verified evidence across claimed skills (`0.65`), practical projects (`0.85`), and formal work experience (`1.00`).
3. 🗄️ **Neon Serverless PostgreSQL & S3 Object Storage:** Cloud-hosted database with connection pooling and private S3-compatible object storage for secure candidate resume streaming.
4. 🛡️ **Institutional Multi-Tenant Isolation:** Powered by Clerk Organizations to restrict campus-scoped hackathons while supporting open global events.
5. 📬 **Live Notification & Transactional Email Pipeline:** Instant browser push via Redis Pub/Sub Server-Sent Events (SSE) and asynchronous role invitation emails via Nodemailer SMTP and BullMQ.
6. 👑 **Squad Lifecycle & Leadership Succession:** Dynamic squad capacity calculation, non-consumptive role applications, and automated leadership transfer upon member departure.

---

## 🎯 Key Features

### 🧠 Deterministic Matchmaking & AI Profiles
- **151-Node Single-Parent Knowledge Hierarchy:** Rooted at `computer_science` with precalculated node depths and lowest common ancestor (LCA) tables.
- **Pure Capability Scoring:** Mathematical scoring ($0.0 - 1.0$) decoupled from university bias, categorized into clear presentation tiers (`Best Match`, `Cross-Campus Match`, `Local Match`).
- **First-Person Resume Bio Sanitization:** Clean, active voice summaries stripped of awkward third-person LLM artifacts.
- **Resume Streaming:** In-browser inline PDF viewer powered by Neon S3 Object Storage with local fallback.

### 👥 Squad Dynamics & Recruitment
- **Structured Role Positions (`TeamRole`):** Configure multi-seat roles with required technologies and open spot telemetry.
- **Dynamic Capacity Engine:**
  $$\text{Total Capacity} = \text{Active Members} + \sum (\text{Open Role Spots})$$
- **Non-Consumptive Slot Applications:** Role spots are preserved while applications remain pending and only decremented upon leader acceptance.
- **Automated Leadership Succession:** Deleting a squad leader or leaving a team cleanly promotes the earliest joined teammate with an in-app notification.

### 🎨 Modern UI & Theme Personalization
- **Tailwind CSS v4 `@theme` Architecture:** Dynamic runtime `color-mix()` palette cascading without layout shifts.
- **Custom Banners & Theme Isolation:** Compressed canvas banner uploader, preset gradients, and isolated client sessions.
- **Dark Glassmorphism Design System:** Clean, accessible modals, custom dropdowns, and responsive drawers.

---

## 🏗️ Architecture & Monorepo Structure

SquadUp is organized as a **pnpm Turborepo**:

```text
.
├── apps
│   ├── api                          # Core Node.js Express Backend & BullMQ Workers
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Canonical PostgreSQL schema
│   │   │   ├── seed.ts              # Master seed orchestrator & cache flusher
│   │   │   └── seeds/               # Modular seed fixtures (Orgs, Users, Events, Teams)
│   │   └── src/
│   │       ├── controllers/         # Domain controllers (Team, App, Invite, Event, Profile, etc.)
│   │       ├── services/            # StorageService (S3), CacheService, TeamService, etc.
│   │       ├── queues/              # BullMQ queue workers (ai.queue.ts, email.queue.ts)
│   │       ├── taxonomy/            # 151-Node knowledge graph, resolver, & recsys engine
│   │       └── routes/              # Express API route declarations
│   └── web                          # React 19 + Vite + Tailwind CSS v4 Frontend
│       └── src/
│           ├── components/          # Modular UI components (team-detail, create-team, etc.)
│           ├── contexts/            # UserContext, PaletteContext, NotificationContext
│           ├── hooks/               # useTeamsFilter, useTeamDetail, custom React hooks
│           └── pages/               # TeamsPage, TeamDetailPage, Profile, EventsPage, etc.
├── packages
│   └── shared                       # Shared TypeScript types, schemas, and DTOs
├── docs/                            # Comprehensive architectural documentation
│   ├── PROJECT_CONTEXT.md           # System overview & technical workflows
│   ├── architecture.md              # Detailed component and data flow architecture
│   ├── storage.md                   # Neon S3 Object Storage specification & flows
│   ├── database.md                  # PostgreSQL schemas, join tables & seeds
│   ├── recommendation_system.md     # Mathematical specification of 151-node taxonomy
│   ├── endpoints.md                 # Complete REST API specification
│   ├── cache.md                     # Multi-tier Redis & SWR caching guide
│   ├── job_queues.md                # BullMQ queue topologies & worker lifecycles
│   ├── onboarding_flow.md           # Route-guarded onboarding specification
│   ├── decisions.md                 # Architecture Decision Records (ADRs)
│   └── next_tasks.md                # Milestone history & future roadmap
├── neon.ts                          # Neon project configuration & bucket policies
├── docker-compose.yml               # Local Redis infrastructure
└── turbo.json                       # Turborepo task pipeline
```

---

## 🛠️ Quickstart & Local Setup

### 1. Prerequisites
- **Node.js:** v18+ (Node 20+ recommended)
- **Package Manager:** `pnpm` (v9+)
- **Redis:** Local Docker container (`docker-compose up -d`) or hosted Redis instance
- **Neon Account:** [Neon](https://neon.tech) serverless PostgreSQL & object storage

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/squadup.git
cd squadup/main
pnpm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` in the `main` directory:
```bash
cp .env.example .env
```

Configure your `.env` with your active service credentials:
```env
# Database (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://<user>:<pass>@ep-broad-feather-b32fcorf-pooler.c-4.ap-southeast-1.aws.neon.tech/squadupdb?sslmode=require"

# Neon S3 Object Storage (Resumes)
AWS_ENDPOINT_URL_S3="https://ep-broad-feather-b32fcorf.c-4.ap-southeast-1.aws.neon.tech/s3"
AWS_REGION="auto"
AWS_ACCESS_KEY_ID="neondb_..."
AWS_SECRET_ACCESS_KEY="..."
NEON_RESUME_BUCKET="resumes"

# Redis Cache & BullMQ
REDIS_URL="redis://localhost:6379"

# AI Inference (Groq LLM)
GROQ_API_KEY="gsk_..."
GROQ_MODEL="llama-3.3-70b-versatile"

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
CLERK_WEBHOOK_URL="https://<your-tunnel>.ngrok-free.app/api/webhooks"

# Transactional Emails (Nodemailer SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="notifications@squadup.dev"
SMTP_PASS="your_app_password"
EMAIL_FROM="SquadUp Platform <notifications@squadup.dev>"
APP_FRONTEND_URL="http://localhost:5173"
```

### 4. Database Setup & Modular Seeding
Initialize the Prisma client, push the schema to Neon, and run the modular seed:
```bash
# Push Prisma schema to Neon Database
pnpm --filter @squadup/api run db:push

# Generate Prisma Client
pnpm --filter @squadup/api run db:generate

# Run modular seeds (6 Universities, 14 Clubs, 24 Students with AI Taxonomies, 19 Events, 62 Teams)
pnpm --filter @squadup/api run db:seed
```

### 5. Start Background Infrastructure & Dev Server
```bash
# Start local Redis container
docker-compose up -d

# Start React Frontend & Express API concurrently
pnpm run dev
```

- 🌐 **Frontend UI:** `http://localhost:5173`
- ⚙️ **Backend API:** `http://localhost:3000`

> [!TIP]
> **LAN Testing on Mobile Devices:** Run `pnpm run dev:host` to bind Vite to `0.0.0.0` for local WiFi testing across phones and tablets.

---

## 🧪 Verification & Benchmarks

### Monorepo Typecheck
Run typecheck across `@squadup/shared`, `@squadup/api`, and `@squadup/web`:
```bash
pnpm turbo run typecheck
```

### Taxonomy & Recommendation Benchmark
Test the deterministic knowledge hierarchy across 10,000 teams:
```bash
pnpm --filter @squadup/api exec tsx src/taxonomy/__tests__/taxonomy.test.ts
```

---

## 📖 Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Start Dev Servers** | `pnpm run dev` |
| **Start with LAN Host** | `pnpm run dev:host` |
| **Run Monorepo Typecheck** | `pnpm run typecheck` |
| **Build Production Bundles** | `pnpm run build` |
| **Seed Database** | `pnpm --filter @squadup/api run db:seed` |
| **Push Prisma Schema** | `pnpm --filter @squadup/api run db:push` |
| **Open Prisma Studio** | `pnpm --filter @squadup/api run db:studio` |
| **Deploy Neon Buckets** | `neon deploy` |

---

## 📚 Architectural Documentation

For deep dives into design choices, mathematical formulas, and API contracts:

- 📖 **[System Overview & Workflows](docs/PROJECT_CONTEXT.md)**
- 🏛️ **[Detailed Architecture](docs/architecture.md)**
- 🗄️ **[Object Storage Specification](docs/storage.md)**
- 🗃️ **[Database Schemas & Models](docs/database.md)**
- 🧠 **[Taxonomy & Recommendation Mathematics](docs/recommendation_system.md)**
- ⚡ **[Caching Architecture (Redis & SWR)](docs/cache.md)**
- ⚙️ **[Job Queues & BullMQ Workers](docs/job_queues.md)**
- 🔌 **[REST API Endpoint Contract](docs/endpoints.md)**
- 📜 **[Architecture Decision Records (ADRs)](docs/decisions.md)**
- 🗺️ **[Roadmap & Milestone History](docs/next_tasks.md)**

---

<div align="center">

Built with ❤️ for student innovators, hackathon organizers, and collegiate builders.

</div>

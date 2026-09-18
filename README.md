# SquadUp

**SquadUp** is a professional team-forming and event-hosting platform built specifically for universities, hackathons, and tech events. It empowers students to easily scout for teammates based on demonstrated technical capabilities and structured squad roles, and allows event organizers to host and oversee events with university-level isolation.

By leveraging AI and deterministic knowledge hierarchies, SquadUp eliminates the friction of manual data entry and unstructured matchmaking:
1. **Automated AI Resume Parsing:** Parses uploaded PDF resumes into structured JSON profiles with 24-hour rate limiting and inline PDF streaming.
2. **V2 Multi-Source Evidence Extraction:** Extracts technical capabilities from claimed skills (`0.65`), practical projects (`0.85`), and formal work experience (`1.00`) with concrete snippet provenance.
3. **Deterministic 151-Node Taxonomy Matchmaking:** Evaluates candidates against structured squad positions (`TeamRole`) using an in-memory 151-node canonical knowledge hierarchy, delivering sub-15ms pure compatibility scoring and LCA decision path explanations with zero hallucinations.
4. **Real-Time Live Notifications & Email Invites:** Delivers role-based invitations via transactional SMTP emails (Nodemailer + BullMQ) and instant browser push via Redis Pub/Sub Server-Sent Events (SSE).

---

## 🚀 Features

### Implemented & Operational
- **Consolidated Node.js Backend:**
  - High-performance Express + TypeScript API managing CRUD, Clerk authentication, Prisma ORM, BullMQ queue workers, and in-process taxonomy matchmaking.
- **Asynchronous Job Queues (BullMQ & Redis):**
  - `ai-tasks`: Non-blocking PDF text extraction (`pdfjs-dist`) and Groq LLM profile synthesis (`llama-3.3-70b-versatile`).
  - `email-tasks`: Asynchronous email invitation and alert delivery via Nodemailer SMTP.
- **Deterministic 151-Node Knowledge Hierarchy:**
  - In-memory single-parent graph rooted at `computer_science` with precalculated depths and ancestry tables.
  - 3-Layer deterministic resolver: Case-sensitive exact $\to$ Normalized alias $\to$ Whole-token phrase boundary $\to$ Strict fallback (zero hallucinations).
- **Role-Based Team Formation & Matchmaking:**
  - Structured `TeamRole` modeling with custom skills and open spot tracking.
  - `bestMatchingRole` recommendation engine calculating precise compatibility scores ($0.0 - 1.0$) for open squad seats.
  - Dynamic squad capacity calculation:
    $$\text{Total Capacity} = \text{members.length} + \sum (\text{role.spots})$$
- **Teammate Invites & Candidate Applications:**
  - Role-assigned email invitations with interactive accept/decline modals (`TeamInviteModal.tsx`).
  - Candidate applications targeting specific squad roles with squad leader review dashboard (`ApplicationsPage.tsx`).
- **Real-Time Notification Pipeline:**
  - PostgreSQL notification store with TTL expirations (`expiresAt`).
  - Redis Pub/Sub stream (`GET /api/notifications/stream`) with 25-second keepalive heartbeats.
- **Protected Onboarding Flow:**
  - Route-guarded onboarding restricting `/onboarding` to non-onboarded users.
  - Searchable institution dropdown bound to Clerk Organization IDs and dual profile builder (AI resume upload or manual setup).
- **Theme Customization & Profile Isolation:**
  - Tailwind CSS v4 Semantic `@theme` tokenization with dynamic runtime `color-mix()` palette cascading.
  - Isolated client banner and theme token synchronization preventing foreign profile bleed.
- **Standard Server-Side Pagination & Redis Caching:**
  - Standard database pagination for Events and Teams (`page`, `limit`, `search`, `scope`, `sort`, `openSpotsOnly`).
  - Multi-tier Redis query caching with 5-minute list TTLs and dynamic event TTLs ($\text{event date} + 3\text{ days}$).

---

## 🏗️ Architecture & Folder Structure

SquadUp is structured as a **pnpm Turborepo**:

```text
.
├── apps
│   ├── api                  # Node.js Express Core API + Prisma + BullMQ + Taxonomy Engine
│   │   ├── prisma/          # Prisma schema (source of truth for DB)
│   │   └── src/
│   │       ├── controllers/ # Team, Event, Profile, Webhook, Notification controllers
│   │       ├── queues/      # BullMQ workers (ai.queue.ts, email.queue.ts)
│   │       ├── routes/      # Express API route declarations
│   │       ├── services/    # ResumeParser, CacheService, EmailService
│   │       ├── taxonomy/    # 151-node taxonomy hierarchy, resolver, extractor, & recsys
│   │       └── utils/       # Auth mapping utilities (Clerk to internal cuid)
│   └── web                  # React 19 (Vite) Frontend UI + Tailwind CSS v4
├── packages
│   └── shared               # Shared TypeScript types, interfaces, schemas & DTOs
├── docs                     # Comprehensive architectural documentation
│   ├── endpoints.md         # Complete REST API specification
│   ├── recommendation_system.md # 151-node taxonomy & mathematical specification
│   ├── PROJECT_CONTEXT.md   # System overview, env vars, & workflows
│   ├── database.md          # PostgreSQL schemas & decoupled taxonomy
│   ├── decisions.md         # Architecture Decision Log (ADRs)
│   └── next_tasks.md        # Roadmap & milestone history
├── docker-compose.yml       # PostgreSQL and Redis containers
└── turbo.json               # Turborepo task pipeline
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) (For PostgreSQL and Redis)
- [Node.js](https://nodejs.org/) (v18+) & [pnpm](https://pnpm.io/) (v9+)

### 2. Infrastructure Setup
Start the local PostgreSQL and Redis containers:
```bash
docker-compose up -d
```

### 3. Environment Variables
Copy `.env.example` to `.env` in the root directory and configure keys:
```bash
cp .env.example .env
```
Ensure you provide your `GROQ_API_KEY`, `DATABASE_URL`, `REDIS_URL`, Clerk authentication keys, and SMTP configuration:
```env
# AI
GROQ_API_KEY=gsk_...

# Database & Redis
DATABASE_URL=postgresql://postgres:password@localhost:5433/squadup?schema=public
REDIS_URL=redis://localhost:6379

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_WEBHOOK_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks

# SMTP Email Dispatch
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="SquadUp Platform <notifications@squadup.dev>"
APP_FRONTEND_URL=http://localhost:5173
```

### 4. Install Dependencies & Push Schema
```bash
pnpm install
cd apps/api
pnpm run db:push
pnpm run db:generate
cd ../../
```

---

## 💻 Running the Application

Start all services (React frontend and Express backend API) concurrently from the root directory:

```bash
pnpm run dev
```

- **Frontend UI:** http://localhost:5173
- **Backend API:** http://localhost:3000

To enable LAN testing across mobile devices over local WiFi:
```bash
pnpm run dev:host
```

---

## 🧪 Testing & Verification

### Monorepo Typecheck
Validate TypeScript types across all workspaces:
```bash
pnpm turbo run typecheck
```

### Taxonomy & Recommendation Engine Benchmark
Run the automated test suite and 10,000-team latency benchmark:
```bash
pnpm --filter @squadup/api exec tsx src/taxonomy/__tests__/taxonomy.test.ts
```

---

## 📖 Essential Commands Cheat Sheet

### 🗄️ Database & Prisma (`apps/api`)
```bash
cd apps/api

# Push schema changes to PostgreSQL
pnpm dotenv -e ../../.env -- npx prisma db push

# Generate Prisma Client
pnpm dotenv -e ../../.env -- npx prisma generate

# Interactive Database GUI
pnpm run db:studio
```

### 📦 Turborepo Workspaces
```bash
# Add dependency to web
pnpm add <pkg> --filter @squadup/web

# Add dependency to backend API
pnpm add <pkg> --filter @squadup/api

# Add dependency to shared package
pnpm add <pkg> --filter @squadup/shared
```

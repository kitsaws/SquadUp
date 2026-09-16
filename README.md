# SquadUp

**SquadUp** is a professional team-forming and event-hosting platform built specifically for universities, hackathons, and tech events. It empowers students to easily scout for teammates based on demonstrated technical capabilities, and allows event organizers to host and oversee events with university-level isolation.

By leveraging AI and deterministic knowledge hierarchies, SquadUp eliminates the friction of manual data entry:
1. **Automated Resume Parsing:** Automatically parses uploaded PDF resumes into clean, structured profiles using `pdfplumber` and the Groq LLM API.
2. **V2 Multi-Source Evidence Extraction:** Extracts technical capabilities not just from claimed skills, but from practical projects and professional work experience with provenance text snippets.
3. **Deterministic Taxonomy Matchmaking:** Replaces opaque vector embeddings with a validated 143-node single-parent knowledge tree, delivering ultra-fast (< 20ms over 10,000 teams), 100% explainable team recommendations without hallucinations.

---

## 🚀 Features

### Currently Implemented
- **Hybrid Microservice Architecture:** 
  - Core **Node.js (Express + TypeScript)** backend managing standard CRUD, Clerk authentication, Prisma ORM, and BullMQ queue producers.
  - Pure & stateless **Python (FastAPI)** AI microservice running text extraction, deterministic taxonomy resolution, and in-memory graph matching algorithms.
- **Asynchronous Job Queuing:** Powered by **Redis** and **BullMQ**, offloading computationally heavy resume parsing and profile ingestion from the Node event loop.
- **AI Resume Parsing with V2 Evidence Extraction:**
  - Extracts explicit skills, projects (with technologies and bullet points), and work experience.
  - Multi-source extraction maps capabilities with weighted evidence: Skills (`0.65`), Projects (`0.85`), and Work Experience (`1.00`).
- **Deterministic 143-Node Knowledge Hierarchy:**
  - Single-parent graph rooted at `computer_science`.
  - 3-Layer deterministic resolver: Case-sensitive exact $\to$ Normalized alias $\to$ Whole-token phrase boundary $\to$ Strict fallback (zero hallucinations).
- **Directional Structural Matching Engine ($U \to R$):**
  - Directional 7-rule scoring (exact match `1.0`, specific-satisfies-broad `0.95`, broad-vs-specific `0.45`, siblings `0.65`, subdomain `0.25 - 0.50`, root collision `0.00`).
  - Requirement coverage calculation and transparent Lowest Common Ancestor (LCA) decision path explanations.
- **Blazing-Fast Pre-Scoring Vector Optimization:**
  - User skills are evaluated against all 143 nodes once at request start (< 2ms).
  - Scoring 10,000 candidate teams takes ~5–10ms in pure Python.
- **Hard Event Eligibility & 3 Presentation Categories:**
  - Hard constraint filtering based on `isGlobal` and university scoping applied before scoring.
  - Pure compatibility scores ($0.0 - 1.0$) categorized into:
    - 🟢 `BEST` (Full/top technical match + Same university)
    - 🔵 `GOOD_DIFFERENT_UNIVERSITY` (Strong technical match + Cross-university)
    - 🟡 `SAME_UNIVERSITY_LOWER_SCORE` (Lower technical match + Same university)
- **Decoupled Relational Database Architecture:**
  - `UserTaxonomy` and `TeamTaxonomy` decoupled from core `User`, `Profile`, and `Team` models to avoid schema bloat.
- **Decoupled Clerk Authentication:**
  - Clerk IDs decoupled from internal database `cuid()` keys, protecting the relational schema from vendor lock-in.
- **Standard Server-Side Pagination & Redis Caching:**
  - Standard database-level pagination by default (`page`, `limit`, `search`, `scope`, `sort`) for Events and Teams.
  - High-performance Redis query caching with 5-minute list TTLs and dynamic event TTLs ($\text{event date} + 3\text{ days}$).
- **Team Applications & Roster Workflows:**
  - Candidate join requests (`TeamApplication`), leader application review, member opt-out/leave with automatic leader reassignment, and hard `isGlobal` university checks.
- **University Sub-Organizers (Clubs & Societies):**
  - Multi-tiered hierarchy: University `Organization` linked to Clerk `orgId`, with student club `Organizer` profiles and role-based officer permissions.
- **Resume Local PDF Persistence & Rate Limiting:**
  - Resumes saved to disk under `uploads/resumes/` and streamed inline via `GET /api/resume/view`.
  - 24-hour upload cooldown with developer testing bypass.
- **Real-Time AI Taxonomy Synchronization:**
  - Manual edits to profile skills or team requirements immediately re-index taxonomy nodes in real-time.


### Upcoming Focus (In Progress)
- **Frontend UI Integration (`apps/web`):** Building React components to display recommended teams with category badges, requirement fulfillment progress bars, and expandable LCA decision drawers.
- **Clerk Organization Switcher:** Embedded in the navbar for active switching between university organizations.

---

## 🏗️ Architecture & Folder Structure

SquadUp is managed as a **pnpm Turborepo**:

```text
.
├── apps
│   ├── api                  # Node.js Express Core API + Prisma + BullMQ + Taxonomy Engine
│   │   ├── prisma/          # Prisma schema (source of truth for DB)
│   │   └── src/
│   │       ├── controllers/ # Team, Event, Profile, Webhook controllers
│   │       ├── queues/      # BullMQ worker (ai.queue.ts for asynchronous resume processing)
│   │       ├── routes/      # Express API route declarations
│   │       ├── services/    # ResumeParser (pdfjs-dist + Groq LLM), CacheService
│   │       ├── taxonomy/    # 143-node taxonomy hierarchy, resolver, extractor, & recsys
│   │       └── utils/       # Auth mapping utilities (Clerk to cuid)
│   └── web                  # React (Vite) Frontend UI
├── packages
│   └── shared               # Shared TypeScript types, schemas & DTOs across the monorepo
├── docs                     # Comprehensive architectural documentation
│   ├── endpoints.md         # Complete REST API specification for frontend devs
│   ├── recommendation_system.md # Full math & engine specification
│   ├── architecture.md      # Workflows, queues, & Redis caching
│   ├── database.md          # PostgreSQL schemas & decoupled taxonomy
│   ├── decisions.md         # Architecture Decision Log (ADRs)
│   └── progress.md          # Project roadmap & state
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
Ensure you provide your `GROQ_API_KEY`, `DATABASE_URL`, `REDIS_URL`, and Clerk authentication keys.

#### Clerk Webhook Configuration
- `CLERK_WEBHOOK_SECRET`: The signing secret from the Clerk Dashboard (starts with `whsec_...`) used by Svix to verify payload authenticity.
- `CLERK_WEBHOOK_URL`: The externally reachable receiving URL where Clerk delivers webhooks.
  - **Local Development (via ngrok):** Start an ngrok tunnel to port 3000 (`ngrok http 3000`) and set:
    ```env
    CLERK_WEBHOOK_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks
    ```
    Then configure this endpoint in your Clerk Dashboard under **Webhooks**.
  - **Production:** Set to your canonical API domain:
    ```env
    CLERK_WEBHOOK_URL=https://api.squadup.dev/api/webhooks
    ```

### 4. Install Dependencies & Migrate Database
Install workspace dependencies and push the Prisma schema to PostgreSQL:
```bash
pnpm install
cd apps/api
pnpm run db:push
pnpm run db:generate
cd ../../
```

---

## 💻 Running the Application

Start all services (React frontend and Express API) concurrently from the root directory:

```bash
pnpm run dev
```

- **Frontend UI:** http://localhost:5173
- **Node.js Express API:** http://localhost:3000

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

# Visual Database Spreadsheet
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

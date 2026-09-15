# Project Context: SquadUp

## Project Overview

SquadUp is a professional team-forming and event-hosting platform built specifically for universities, hackathons, and tech events. 

**The Problem:** Finding the right teammates at university events or hackathons is often disorganized, relying on chaotic Discord channels, Slack threads, or spreadsheet tracking. Organizers lack a centralized way to oversee team formation.
**The Solution:** SquadUp provides a centralized platform where organizers can host events, and students can join teams by explicitly matching their skills (via AI-parsed profiles) against a team's requirements.

**Major Features:**
- Automated AI resume parsing to generate pristine structured JSON profiles.
- 24-hour resume rate limiting with local PDF persistence and inline browser streaming.
- V2 Multi-source Evidence Extraction from skills, projects, and work experience.
- Deterministic 143-Node Knowledge Hierarchy matching with zero hallucinations.
- Decoupled `UserTaxonomy` and `TeamTaxonomy` relational architecture.
- Real-time pure compatibility scoring (< 20ms over 10,000 teams) with LCA decision explainability.
- Event Scoping & Hard Eligibility (global vs. university-isolated events).
- Full Event and Team CRUD with standard server-side pagination by default.
- Redis Query Caching with dynamic event TTLs (event date + 3 days) and instant invalidation.
- Team Application & Opt-Out Lifecycle with institutional eligibility guards.
- University `Organization` and Sub-Organizer `Organizer` (Clubs/Societies) role-based management.

## Tech Stack

- **Frontend (In-Progress):** React (Vite)
- **Backend (API):** Node.js, Express, TypeScript
- **AI Microservice:** Python 3.10+, FastAPI, `pdfplumber`
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Clerk (with Clerk Organizations for university isolation)
- **Asynchronous Jobs/Queues:** Redis, BullMQ
- **Caching Layer:** Redis (`ioredis`)
- **AI/LLM API:** Groq API
- **Infrastructure:** Docker Compose (local Postgres and Redis), Turborepo (Monorepo management)

## Repository Structure

SquadUp is structured as a pnpm Turborepo.

| File/Directory | Purpose | When an agent should inspect it |
| -------------- | ------- | ------------------------------- |
| `apps/api/` | The core Node.js backend. | When modifying API routes, controllers, or BullMQ jobs. |
| `apps/api/prisma/schema.prisma` | The absolute source of truth for the database. | ALWAYS inspect this before interacting with database logic. |
| `apps/api/src/services/cache.service.ts` | Redis query caching & dynamic TTL calculator. | When debugging cache behavior or invalidation. |
| `apps/api/src/utils/auth.utils.ts` | Contains critical Auth mappings (Clerk to DB). | When dealing with user auth or mapping user IDs. |
| `apps/ai-service/` | The Python microservice for AI tasks. | When altering how resumes are parsed or text is embedded. |
| `apps/web/` | The React frontend UI. | When building user-facing features. |
| `packages/shared/` | Shared TypeScript interfaces and types. | When changing API payloads to ensure frontend/backend remain in sync. |
| `docs/endpoints.md` | Complete REST API specification for frontend developers. | When building UI components that interact with backend endpoints. |
| `docker-compose.yml` | Local background infrastructure. | When debugging Redis/Postgres connection issues. |

## System Overview

SquadUp utilizes a **Hybrid Microservice Architecture**.
The core Express API (`apps/api`) handles fast CRUD operations (creating teams, events, users, applications, and organizers). 
Heavy, slow, or resource-intensive tasks (like parsing a PDF resume with AI) are offloaded. The Express API pushes a job to a Redis queue (BullMQ), which is processed asynchronously. The Node worker then makes an HTTP call to the isolated Python `ai-service`, allowing Python to handle the heavy machine learning/LLM lifting without blocking the Node event loop.

## Data Flow

### Authentication Flow
1. User signs up via Clerk frontend component.
2. Clerk issues a Webhook to the Express backend (`/api/webhooks`).
3. Backend creates a new row in the Postgres `User` table, storing the `clerkId`.
4. Subsequent API calls extract the `clerkId` from the JWT and resolve it to the internal `User.id` via `getOrCreateUserByClerkId()`.

### First-Time User Onboarding Flow
1. **Onboarding Gate:** Upon sign-up / first sign-in, the web application evaluates whether the user has completed onboarding (checks if user has an associated organization or `Profile.university` is set). If not, the user is routed to `/onboarding`.
2. **Step 1 — University / Organization Selection:**
   - The user sees a dedicated screen prompting them to select their home institution.
   - Uses a responsive, **searchable dropdown menu** populated from available universities (`GET /api/organizers/universities`), filtering by name, domain, or location.
   - Each option is bound directly to the university's `clerkOrgId` (Clerk Organization ID).
   - Upon selection, the user is joined to the organization in Clerk; the database creates/synchronizes the `OrganizationMembership` and sets `Profile.university = Organization.name`.
3. **Step 2 — Profile Setup Path Selection:**
   The user chooses between two paths to build their developer profile:
   - **Build via Resume (Highlighted / Primary Recommendation):**
     - Emphasized as the fast, frictionless "smart" path.
     - User uploads their PDF resume (`POST /api/resume/upload`).
     - Offloaded to BullMQ (`ai-tasks`) and the Python AI service (`pdfplumber` + Groq LLM) to automatically extract skills, projects, and work experience, resolving canonical nodes into `UserTaxonomy`.
     - Non-blocking UI: the user sees a clear status ("Your profile is being built in the background") and can immediately proceed into the platform without waiting on a blocking spinner.
   - **Build Manually (Secondary / Fallback Path):**
     - For users without a resume handy or who prefer manual curation.
     - Structured input form for headline, degree, graduation year, bio, social/code links, and skill tags.
     - Submits via `PATCH /api/profile` and immediately triggers deterministic `AIService.resolveUserTaxonomy`.
4. **Completion:** User is redirected to the main SquadUp dashboard (`/teams` or `/events`) with full institutional context and personalized compatibility scoring active.

### Document Ingestion & Resume Flow
1. User uploads a PDF resume to `POST /api/resume/upload`.
2. Controller verifies the 24-hour rate limit (bypassed for dev testing).
3. PDF buffer is saved to disk (`uploads/resumes/:userId.pdf`) and metadata is stored in `Profile`.
4. Controller enqueues the file buffer in BullMQ (`ai-tasks`) and returns a `jobId` (HTTP 202).
5. Python AI service extracts text via `pdfplumber` and prompts Groq LLM to return typed structured JSON.
6. The Node worker upserts `Profile` and calls `AIService.resolveUserTaxonomy` to update `UserTaxonomy`.
7. Frontend can render the PDF anytime via `GET /api/resume/view` in an embedded iframe.

## External Services

- **Clerk:** Handles complete user authentication, session tokens, and Organization mappings (for scoping data to specific universities).
- **Groq API:** An ultra-fast LLM inference engine used to transform raw resume text into structured JSON.

## Environment Variables

- `DATABASE_URL`: Connection string for PostgreSQL.
- `REDIS_URL`: Connection string for Redis.
- `GROQ_API_KEY`: API key for the Groq LLM service.
- `CLERK_SECRET_KEY`: Backend secret for the Clerk SDK.
- `CLERK_WEBHOOK_SECRET`: Secret used by Svix to verify incoming Clerk webhooks.
- `CLERK_WEBHOOK_URL`: Externally reachable base/receiving URL where Clerk/Svix dispatches events (e.g. ngrok tunnel URL during local dev or production API domain).
- `BYPASS_RESUME_RATE_LIMIT`: Set to `"true"` to disable 24h upload cooldown in dev.

*(See `.env.example` in the root folder for templates).*

## Development

- **Install:** `pnpm install`
- **Run Locally:** `pnpm run dev` (Starts frontend, Express API, and FastAPI simultaneously via Turborepo).
- **Start Infrastructure:** `docker-compose up -d` (Starts Postgres and Redis).
- **Typecheck:** `pnpm turbo run typecheck`
- **Prisma Studio:** `pnpm run db:studio` (inside `apps/api`)

## Current State

The backend API is complete and verified across Events, Teams, Applications, Profiles, Resumes, and University Sub-Organizers. The system features standard server-side pagination by default, Redis caching with dynamic event TTLs, real-time taxonomy sync, and dynamic Svix Clerk webhooks. The immediate upcoming focus is building the **First-Time User Onboarding Flow** (`apps/web`), guiding users from university selection (searchable dropdown bound to `clerkOrgId`) to profile generation (highlighted AI resume parsing or manual setup).

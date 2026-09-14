# Project Context: SquadUp

## Project Overview

SquadUp is a professional team-forming and event-hosting platform built specifically for universities, hackathons, and tech events. 

**The Problem:** Finding the right teammates at university events or hackathons is often disorganized, relying on chaotic Discord channels, Slack threads, or spreadsheet tracking. Organizers lack a centralized way to oversee team formation.
**The Solution:** SquadUp provides a centralized platform where organizers can host events, and students can join teams by explicitly matching their skills (via AI-parsed profiles) against a team's requirements.

**Major Features:**
- Automated AI resume parsing to generate pristine structured JSON profiles.
- V2 Multi-source Evidence Extraction from skills, projects, and work experience.
- Deterministic 143-Node Knowledge Hierarchy matching with zero hallucinations.
- Decoupled `UserTaxonomy` and `TeamTaxonomy` relational architecture.
- Real-time pure compatibility scoring (< 20ms over 10,000 teams) with LCA decision explainability.
- Event Scoping & Hard Eligibility (global vs. university-isolated events).
- Creation of Events and Teams with email-based invitations.

## Tech Stack

- **Frontend (In-Progress):** React (Vite)
- **Backend (API):** Node.js, Express, TypeScript
- **AI Microservice:** Python 3.10+, FastAPI, `pdfplumber`
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Clerk (with Clerk Organizations for university isolation)
- **Asynchronous Jobs/Queues:** Redis, BullMQ
- **AI/LLM API:** Groq API
- **Infrastructure:** Docker Compose (local Postgres and Redis), Turborepo (Monorepo management)

## Repository Structure

SquadUp is structured as a pnpm Turborepo.

| File/Directory | Purpose | When an agent should inspect it |
| -------------- | ------- | ------------------------------- |
| `apps/api/` | The core Node.js backend. | When modifying API routes, controllers, or BullMQ jobs. |
| `apps/api/prisma/schema.prisma` | The absolute source of truth for the database. | ALWAYS inspect this before interacting with database logic. |
| `apps/api/src/utils/auth.utils.ts` | Contains critical Auth mappings (Clerk to DB). | When dealing with user auth or mapping user IDs. |
| `apps/ai-service/` | The Python microservice for AI tasks. | When altering how resumes are parsed or text is embedded. |
| `apps/web/` | The React frontend UI. | When building user-facing features. |
| `packages/shared/` | Shared TypeScript interfaces and types. | When changing API payloads to ensure frontend/backend remain in sync. |
| `docker-compose.yml` | Local background infrastructure. | When debugging Redis/Postgres connection issues. |

## System Overview

SquadUp utilizes a **Hybrid Microservice Architecture**.
The core Express API (`apps/api`) handles standard fast CRUD operations (creating teams, events, users). 
Heavy, slow, or resource-intensive tasks (like parsing a PDF resume with AI) are offloaded. The Express API pushes a job to a Redis queue (BullMQ), which is processed asynchronously. The Node worker then makes an HTTP call to the isolated Python `ai-service`, allowing Python to handle the heavy machine learning/LLM lifting without blocking the Node event loop.

## Data Flow

### Authentication Flow
1. User signs up via Clerk frontend component.
2. Clerk issues a Webhook to the Express backend (`/api/webhooks`).
3. Backend creates a new row in the Postgres `User` table, storing the `clerkId`.
4. Subsequent API calls extract the `clerkId` from the JWT and resolve it to the internal `User.id` via `getOrCreateUserByClerkId()`.

### Document Ingestion Flow (Resume Parsing)
1. User uploads a PDF resume to `/api/resume/upload`.
2. Controller adds the file buffer to the `ai-tasks` BullMQ queue and returns a `jobId` (HTTP 202).
3. The Node worker pops the job from the queue and sends an HTTP POST to `ai-service` at `http://localhost:8000/api/parse-resume`.
4. Python service uses `pdfplumber` to extract text, then uses Groq API to convert the text to structured JSON.
5. Python service returns the JSON. The Node worker then `upserts` this data into the Postgres `Profile` table.

## External Services

- **Clerk:** Handles complete user authentication, session tokens, and Organization mappings (for scoping data to specific universities).
- **Groq API:** An ultra-fast LLM inference engine used to transform raw resume text into structured JSON.

## Environment Variables

- `DATABASE_URL`: Connection string for PostgreSQL.
- `REDIS_URL`: Connection string for Redis.
- `GROQ_API_KEY`: API key for the Groq LLM service.
- `CLERK_SECRET_KEY`: Backend secret for the Clerk SDK.
- `CLERK_WEBHOOK_SECRET`: Secret to verify incoming Clerk webhooks.

*(See `.env.example` in the root folder for templates).*

## Development

- **Install:** `pnpm install`
- **Run Locally:** `pnpm run dev` (Starts frontend, Express API, and FastAPI simultaneously via Turborepo).
- **Start Infrastructure:** `docker-compose up -d` (Starts Postgres and Redis).
- **Typecheck:** `pnpm turbo run typecheck`
- **Prisma Studio:** `pnpm run db:studio` (inside `apps/api`)

## Current State

The backend API is largely feature-complete for core entities. Resume parsing via AI is fully implemented and queued gracefully. Deterministic taxonomy resolution and the V2 pure recommendation engine are fully integrated across Node, Python, and PostgreSQL. The upcoming focus area is the Frontend (`apps/web`) UI integration to display categorized recommendations and LCA explainability breakdowns.

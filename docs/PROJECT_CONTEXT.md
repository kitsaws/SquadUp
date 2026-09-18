# Project Context: SquadUp

## Project Overview

SquadUp is a professional team-forming and event-hosting platform built specifically for universities, hackathons, and tech events. 

**The Problem:** Finding the right teammates at university events or hackathons is often disorganized, relying on chaotic Discord channels, Slack threads, or spreadsheet tracking. Organizers lack a centralized way to oversee team formation.
**The Solution:** SquadUp provides a centralized platform where organizers can host events, and students can form squads and join teams by explicitly matching their demonstrated technical capabilities against structured squad roles and requirements.

**Major Features:**
- Automated AI resume parsing extracting structured JSON profiles with 24-hour rate limiting and inline browser PDF streaming.
- V2 Multi-source Evidence Extraction across self-reported skills, projects, and work experience with provenance text snippets.
- Deterministic 151-Node Single-Parent Knowledge Hierarchy matching with zero hallucinations.
- Decoupled `UserTaxonomy` and `TeamTaxonomy` relational architecture.
- Role-based precision matching (`TeamRole`) calculating best-matching roles (`bestMatchingRole`) and compatibility scores in < 15ms.
- Role-based teammate invitations with email notifications (Nodemailer SMTP via BullMQ `email-tasks`) and real-time in-app alerts (Redis Pub/Sub SSE stream).
- Interactive `TeamInviteModal` and `CreateTeamModal` with custom dark glassmorphism dropdowns, deferred leader role assignment, and dynamic squad capacity calculation:
  $$\text{Total Capacity} = \text{members.length} + \sum (\text{role.spots})$$
- Candidate role-specific applications with match scoring and squad leader management dashboard (`ApplicationsPage.tsx`).
- Event Scoping & Hard Institutional Eligibility (`isGlobal` vs. university-isolated events).
- Full Event and Team CRUD with standard server-side pagination and multi-tier Redis query caching.
- University `Organization` (Clerk Organization ID) and Sub-Organizer `Organizer` (Clubs/Societies) role-based management.
- Protected Onboarding flow with institutional university selection (searchable dropdown) and dual profile setup (AI resume or manual).
- Dedicated `UserPreferences` model for centralized theme, notification toggles, and matching preferences.
- Tailwind CSS v4 Semantic `@theme` tokenization with dynamic runtime `color-mix()` palette cascading and isolated client themes.
- Sign-out confirmation modal safeguard on user profile.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React, Clerk React SDK
- **Backend (API):** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL (with `postgresqlExtensions`)
- **Asynchronous Queues:** Redis (`ioredis`), BullMQ (`ai-tasks`, `email-tasks`)
- **Email Service:** Nodemailer (SMTP transport with HTML templates)
- **Real-Time Push:** Redis Pub/Sub multiplexed over Server-Sent Events (SSE)
- **AI/LLM Inference:** Groq API (`llama-3.3-70b-versatile`)
- **PDF Extraction:** `pdfjs-dist` (in Node.js BullMQ worker)
- **Authentication:** Clerk (with Clerk Organizations for university isolation)
- **Monorepo Management:** Turborepo, pnpm

## Repository Structure

SquadUp is structured as a pnpm Turborepo.

| File/Directory | Purpose | When an agent should inspect it |
| -------------- | ------- | ------------------------------- |
| `apps/api/` | The core Node.js backend, BullMQ workers, and in-process taxonomy engine. | When modifying API routes, controllers, taxonomy, or BullMQ background workers. |
| `apps/api/prisma/schema.prisma` | The absolute source of truth for the database schema. | ALWAYS inspect this before modifying any database interaction. |
| `apps/api/src/services/cache.service.ts` | Redis query caching & dynamic TTL calculator. | When debugging cache behavior or invalidation. |
| `apps/api/src/services/resume.parser.ts` | Node.js PDF text extraction (`pdfjs-dist`) & Groq LLM parser. | When altering how resumes are parsed or structured. |
| `apps/api/src/services/email.service.ts` | Nodemailer SMTP client for transactional emails. | When modifying email delivery or templates. |
| `apps/api/src/queues/email.queue.ts` | BullMQ email queue producer & worker. | When modifying background email dispatching. |
| `apps/api/src/taxonomy/` | 151-node taxonomy hierarchy, resolver, extractor, & recsys. | When altering skill resolution, matchmaking, or scoring logic. |
| `apps/api/src/utils/auth.utils.ts` | Contains critical Auth mappings (Clerk to internal cuid). | When dealing with user auth or mapping user IDs. |
| `apps/web/` | The React frontend UI. | When building or debugging user-facing features. |
| `packages/shared/` | Shared TypeScript interfaces, types, and DTOs. | When changing API payloads to keep frontend and backend synchronized. |
| `docs/endpoints.md` | Complete REST API specification for frontend developers. | When building UI components that interact with backend endpoints. |
| `docker-compose.yml` | Local background infrastructure (PostgreSQL & Redis). | When debugging Redis/Postgres connection issues. |

## System Overview

SquadUp utilizes a **Consolidated Node.js Backend Architecture** (`apps/api`):
1. **Core Express API:** Handles fast CRUD operations (creating teams, events, users, applications, and organizers) as well as sub-millisecond in-process deterministic taxonomy resolution and team matchmaking.
2. **Asynchronous Background Processing (BullMQ & Redis):**
   - **`ai-tasks` Queue:** Processes PDF resume uploads asynchronously using `pdfjs-dist` and Groq LLM, upserting `Profile` and resolving `UserTaxonomy` without blocking API latency.
   - **`email-tasks` Queue:** Dispatches transactional invitation and notification emails via Nodemailer SMTP.
3. **Real-Time Notification Pipeline:**
   - PostgreSQL durably stores notifications with read states and TTLs (`expiresAt`).
   - Redis Pub/Sub publishes real-time events to user channels (`sq:user:<userId>`) and campus channels (`sq:campus:<orgId>`).
   - Express SSE stream (`GET /api/notifications/stream`) pushes live notifications to connected browser clients with 25s keepalive heartbeats.

## Data Flow

### Authentication Flow
1. User signs up / logs in via Clerk frontend component.
2. Clerk issues a Webhook to the Express backend (`/api/webhooks`).
3. Backend creates or updates the row in the Postgres `User` table, storing the `clerkId`.
4. Subsequent API calls extract the `clerkId` from the JWT and resolve it to the internal `User.id` via `getOrCreateUserByClerkId()`.

### Protected First-Time User Onboarding Flow
1. **Onboarding Guard:** When an authenticated user visits the platform, `OnboardingGuard` checks `isOnboardingComplete`. If incomplete, all non-onboarding routes redirect to `/onboarding`. If already completed, attempts to visit `/onboarding` bounce back to `/`.
2. **Step 1 — University / Organization Selection:**
   - User selects their home institution using a searchable dropdown populated from `GET /api/organizers/universities`.
   - Binds to the university's `clerkOrgId` and commits membership via `POST /api/organizers/universities/select`.
3. **Step 2 — Profile Setup Path Selection:**
   - **AI Resume Upload:** Uploads PDF (`POST /api/resume/upload`), processed asynchronously via BullMQ and Groq LLM.
   - **Manual Profile Creation:** Fills structured inputs (headline, degree, skills, links) and updates profile via `PATCH /api/profile`.
4. **Step 3 — Completion:** User sees celebration modal and enters main platform with full institutional context and compatibility scoring active.

### Team Creation & Role-Based Matchmaking Flow
1. Team Leader creates a squad using `CreateTeamModal`, defining team roles with required skills and spots.
2. Leader selects their own role from the defined roles (deferred slot decrement on creation).
3. `TaxonomyService.resolveTeamTaxonomy` maps all role requirements to canonical taxonomy nodes in `TeamTaxonomy.roleTaxonomies`.
4. Candidates browse squads; `recommendation.engine.ts` scores their capability nodes against team roles in $O(1)$ time, calculating overall compatibility and attaching `bestMatchingRole`.

## External Services

- **Clerk:** Handles complete user authentication, session tokens, and Organization mappings for university isolation.
- **Groq API:** Ultra-fast LLM inference engine (`llama-3.3-70b-versatile`) transforming raw resume text into structured JSON.
- **Nodemailer / SMTP Provider (e.g. Gmail / SendGrid):** Dispatches automated email invitations and notification alerts.

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma ORM. |
| `REDIS_URL` | Redis connection string used by BullMQ queues and CacheService. |
| `GROQ_API_KEY` | API key for the Groq LLM inference service. |
| `GROQ_API_URL` | Groq endpoint (default: `https://api.groq.com/openai/v1/chat/completions`). |
| `GROQ_MODEL` | Groq model identifier (default: `llama-3.3-70b-versatile`). |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the Vite React frontend. |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the Express backend. |
| `CLERK_SECRET_KEY` | Secret key used by Express backend SDK to authenticate requests. |
| `CLERK_WEBHOOK_SECRET` | Signing secret from Clerk/Svix (`whsec_...`) to verify webhook signatures. |
| `CLERK_WEBHOOK_URL` | Externally reachable webhook receiving URL (e.g. ngrok tunnel in dev or production domain). |
| `SMTP_HOST` | Hostname of SMTP server (e.g., `smtp.gmail.com`). |
| `SMTP_PORT` | Port of SMTP server (e.g., `587` or `465`). |
| `SMTP_SECURE` | Set to `"true"` for SSL/TLS on port 465, or `"false"` for STARTTLS on port 587. |
| `SMTP_USER` | SMTP authentication username / email address. |
| `SMTP_PASS` | SMTP authentication password / App Password. |
| `EMAIL_FROM` | Sender display string (e.g., `"SquadUp Platform <notifications@squadup.dev>"`). |
| `APP_FRONTEND_URL` | Base frontend URL for email deep-links (e.g., `http://localhost:5173`). |
| `BYPASS_RESUME_RATE_LIMIT` | Set to `"true"` in development to bypass 24h resume upload cooldown. |

*(See `.env.example` in the root folder for templates).*

## Development

- **Install:** `pnpm install`
- **Run Locally:** `pnpm run dev` (Runs frontend and backend concurrently via Turborepo).
- **Run with LAN Host:** `pnpm run dev:host` (Allows testing on mobile devices over local WiFi).
- **Start Infrastructure:** `docker-compose up -d` (Starts local PostgreSQL and Redis).
- **Typecheck:** `pnpm turbo run typecheck`
- **Prisma Studio:** `pnpm run db:studio` (inside `apps/api`)

## Current State

The platform is fully operational across core product domains:
1. **Authentication & University Scoping:** Clerk authentication, organization syncing, and Svix webhooks.
2. **Protected Onboarding:** Route-protected onboarding flow with institutional search and dual profile builder (AI resume / manual).
3. **Taxonomy & Recommendation Engine:** 151-node canonical knowledge hierarchy with multi-source evidence extraction and role-based matching in sub-15ms.
4. **Squad Lifecycle & Dynamic Capacity:** Create Team modal with structured role builder, custom dark glassmorphism dropdowns, deferred leader role assignment, and dynamic team capacity engine ($Total = Members + Open Slots$).
5. **Role-Based Teammate Invites:** Invites with role badges, Nodemailer SMTP email dispatching via BullMQ, and Redis Pub/Sub Server-Sent Events (SSE) live notifications.
6. **Candidate Applications:** Role-specific applications with compatibility score computation and squad leader evaluation dashboard.
7. **Personalization & Theme Isolation:** User preferences with custom banner rendering, dynamic palette tokens, and strict local storage isolation for authenticated profiles.

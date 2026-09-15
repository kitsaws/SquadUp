# System Architecture

## Architecture Overview

SquadUp utilizes a **Hybrid Microservice Architecture** managed within a Turborepo monorepo.

The system is designed to provide ultra-fast standard web API responses while seamlessly offloading computationally heavy AI tasks. It achieves this by separating the core Node.js backend from a specialized Python AI service, connected via a Redis-backed job queue.

## Component Architecture

- **Frontend (`apps/web`):** React application built with Vite. Communicates with the Backend API over HTTP.
- **Backend API (`apps/api`):** Node.js Express application written in TypeScript. It is the primary gateway for all frontend requests, directly manages the PostgreSQL database via Prisma, acts as producer for the job queue, and interfaces with the Redis caching layer.
- **AI Service (`apps/ai-service`):** Python FastAPI application. Exists solely to run computationally heavy Python libraries (like `pdfplumber`) and interface with AI/LLM endpoints. It does *not* talk to the database directly.
- **Job Queue:** BullMQ backed by Redis. Orchestrates asynchronous communication between the Backend API and the AI Service.
- **Caching Layer:** Redis (`ioredis`) managed via `CacheService` for list queries and dynamic event TTL caching.
- **Database:** PostgreSQL.
- **Authentication:** Clerk SDK, providing JWTs and managing university organizations.

## Request/Data Flows

### 1. Document Parsing & Resume Persistence Flow

1. **User** uploads a PDF via the Frontend to `POST /api/resume/upload`.
2. **Backend API (`resume.controller.ts`)** enforces the 24-hour upload cooldown (bypassed for approved test emails and dev mode).
3. Backend writes the PDF buffer directly to disk under `uploads/resumes/:userId.pdf` and records the path in `Profile.resumePdfPath`.
4. Backend pushes a `parse-resume` job with the base64 string to the **Redis Queue** and immediately returns HTTP 202 Accepted with a `jobId`.
5. **Node Worker (`ai.queue.ts`)** pops the job and sends a blocking HTTP POST request to the **Python AI Service**.
6. **AI Service (`resume_parser.py`)** extracts raw text with `pdfplumber` and prompts **Groq API** to format text into structured JSON.
7. Node Worker receives the JSON, upserts the PostgreSQL `Profile` table, and triggers `AIService.resolveUserTaxonomy` to persist canonical node IDs and provenance evidence in `UserTaxonomy`.
8. Frontend can render the resume PDF anytime via `GET /api/resume/view` in an embedded iframe.

### 2. Query Caching & Server-Side Pagination Flow

1. Client sends a paginated request: `GET /api/events?page=1&limit=10&search=...&scope=all&sort=date_asc`.
2. **Cache Check:** Backend checks Redis key `events:list:<hash-of-params>`. If present, returns cached response in < 2ms.
3. **Database Query:** If cache miss:
   - Evaluates filter and scope criteria at the database level (`where` clause).
   - Computes total matching records (`count`).
   - Slices records via Prisma (`skip: (page - 1) * limit, take: limit`).
4. **Cache Write:** Results are cached in Redis with a 5-minute TTL (or dynamic TTL for single events).
5. **Mutation Invalidation:** Any `create`, `update`, `delete`, or member mutation triggers `CacheService.invalidatePattern("events:*")` or `CacheService.invalidatePattern("teams:*")`.

### 3. Dynamic Event TTL Strategy

For single event queries (`GET /api/events/:id`), the Redis cache TTL is calculated dynamically based on the event's scheduled date:
$$\text{TTL} = \max(300, (\text{eventDate} + 3\text{ days}) - \text{now})$$
- Capped at a maximum of 14 days (1,209,600s).
- Events that ended more than 3 days ago default to a 5-minute cache TTL.
- Guarantees fast cached access throughout the event lifecycle with automatic cleanup.

### 4. Team Creation & Requirement Taxonomy Sync Flow

1. User creates a team via `POST /api/teams` with `requirements` (e.g. `["React", "FastAPI"]`).
2. Backend calls `AIService.resolveTeamRequirements` inline (< 1ms).
3. Backend atomically creates `Team`, `TeamTaxonomy` (with pre-resolved `requirementNodeIds`), and assigns creator as `Leader`.
4. When a team updates requirements via `PATCH /api/teams/:id`, the backend automatically calls `AIService.resolveTeamRequirements` and updates `TeamTaxonomy` in real-time.

### 5. Team Application & Eligibility Guard Flow

1. Candidate applies to join a team via `POST /api/teams/:id/apply`.
2. **Hard Scoping Check:** If `team.event.isGlobal === false`:
   - Backend checks if candidate's university matches `team.university` (or `team.event.location`) or candidate's session `orgId` matches `team.orgId`.
   - If mismatch: returns HTTP 403 Forbidden.
3. Creates `TeamApplication` with `status: "PENDING"`.
4. Team leader reviews applications via `GET /api/teams/:id/applications` with candidate skills and taxonomy fit.
5. Leader accepts or rejects:
   - Accept: Updates status to `ACCEPTED` and creates `TeamMember` (`role: "Member"`).
   - Reject: Updates status to `REJECTED`.

### 6. Real-Time Recommendation Flow

1. Client sends `POST /api/teams/recommendations` with optional filters (`eventId`, `sameUniversityOnly`, `topK`).
2. Express API applies hard event eligibility filtering at the database layer (scoping to global events or matching universities).
3. Candidate teams are passed to Python AI microservice:
   - Precomputes User Pre-Scoring Vector ($O(K \times N)$ in < 2ms).
   - Scores candidates via $O(1)$ lookups (< 10ms for 10,000 teams).
   - Keeps pure `taxonomyScore` ($0.0 - 1.0$).
   - Categorizes top candidates into `BEST`, `GOOD_DIFFERENT_UNIVERSITY`, and `SAME_UNIVERSITY_LOWER_SCORE`.
   - Generates transparent, requirement-by-requirement LCA explanations.
4. Returns ranked recommendations to the client.

## Database Interaction

- **Exclusive Access:** The Node.js Express Backend (`apps/api`) has exclusive access to the PostgreSQL database. The Python AI service never queries the database directly.
- **ORM:** All queries and mutations are performed using Prisma Client.

## Authentication & Clerk Webhook Synchronization

Authentication heavily leverages Clerk, but utilizes a decoupled architecture to protect the database from vendor lock-in.

1. **Frontend Authentication:** Clerk manages frontend sessions and provides session JWTs.
2. **Decoupled Identity Mapping:** The database stores native `cuid()` values as primary keys (`User.id`, `Organization.id`). External Clerk IDs are stored in indexed, unique columns (`User.clerkId`, `Organization.clerkOrgId`).
3. **Svix Cryptographic Webhook Receiver (`/api/webhooks/clerk`):**
   - Webhook requests are verified using Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) against `CLERK_WEBHOOK_SECRET`.
   - Express handles the raw JSON buffer prior to parsing to ensure uncorrupted HMAC verification.
4. **Supported Webhook Events (9 Total):**
   - **User Lifecycle (`user.created`, `user.updated`, `user.deleted`):** Upserts internal `User` records with primary email resolution, initializes a clean `Profile`, and safely cascades deletions while invalidating Redis caches.
   - **Organization Lifecycle (`organization.created`, `organization.updated`, `organization.deleted`):** Synchronizes universities into the `Organization` table, updating metadata and gracefully unlinking events/teams upon deletion.
   - **Organization Membership Lifecycle (`organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`):**
     - Ensures both parent `Organization` and `User` exist.
     - Upserts `OrganizationMembership` tracking institutional roles (`org:admin`, `org:member`).
     - **Auto-synchronizes `Profile.university`** with the university organization name when created/updated.
     - Automatically resets `Profile.university = null` if a user leaves that institution.
     - Automatically purges corresponding Redis cache entries (`teams:*`, `events:*`).
5. **Resilient Just-In-Time Fallback:** When an authenticated request hits any protected route, `getOrCreateUserByClerkId(clerkId)` resolves the internal `cuid()`. If the user does not exist (e.g. during offline local development without public webhooks), it transparently fetches their profile from the Clerk API and seeds the record on demand.

## Architectural Constraints

- **Do not block the Node event loop:** PDF processing and LLM calls MUST be dispatched to the `ai.queue.ts` BullMQ queue.
- **Keep Python isolated and stateless:** The Python service takes payloads, runs in-memory graph algorithms, and returns results. It never queries the PostgreSQL database directly.
- **Clerk Decoupling:** Never use the Clerk string ID directly as a foreign key. Map it to the internal `cuid()` via `getOrCreateUserByClerkId()`.
- **Pure Compatibility Scores:** Never corrupt technical capability scores with university bonus math. University context is communicated via recommendation presentation categories.
- **Server-Side Pagination:** Always filter and sort at the database level before applying `skip` and `take`. Client-side pagination should not be used on raw unpaginated collections.
- **Cache Invalidation on Write:** Every entity mutation (event, team, application, member) must immediately invalidate its relevant Redis cache keys.

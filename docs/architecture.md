# System Architecture

## Architecture Overview

SquadUp utilizes a **Consolidated Node.js Backend Architecture** managed within a Turborepo monorepo.

The system is designed to provide ultra-fast standard web API responses while seamlessly offloading computationally heavy AI tasks. It achieves this using a Node.js Express backend, asynchronous Redis/BullMQ job processing, in-memory graph taxonomy algorithms, and direct Groq LLM integration.

## Component Architecture

- **Frontend (`apps/web`):** React application built with Vite. Communicates with the Backend API over HTTP.
- **Backend API (`apps/api`):** Node.js Express application written in TypeScript. It is the primary gateway for all frontend requests, directly manages the Neon PostgreSQL database via Prisma, hosts the in-process deterministic Taxonomy & Recommendation Engine, acts as producer/worker for the job queue, and interfaces with the Redis caching layer.
- **Object Storage:** Neon S3-Compatible Object Storage for candidate resumes (`resumes` bucket) managed via `StorageService` with local filesystem fallback. See **[storage.md](storage.md)** for architecture and streaming flows.
- **Job Queue:** BullMQ backed by Redis (`ai-tasks` for AI resume parsing, `email-tasks` for email invitations). See **[job_queues.md](job_queues.md)** for architecture and worker lifecycles.
- **Caching Layer:** Redis (`ioredis`) managed via `CacheService` on the backend and multi-tier SWR on the frontend. See **[cache.md](cache.md)** for key schemes and invalidation patterns.
- **Database:** Serverless PostgreSQL on Neon managed via Prisma. See **[database.md](database.md)** for data models.
- **Authentication:** Clerk SDK, providing JWTs and managing university organizations.

## Request/Data Flows

### 1. Document Parsing, Unified Schema & Resume Persistence Flow

1. **User** uploads a PDF via the Frontend to `POST /api/resume/upload`.
2. **Backend API (`resume.controller.ts`)** enforces the 24-hour upload cooldown (bypassed for approved test emails and dev mode).
3. Backend uploads the PDF buffer to **Neon S3 Object Storage** (`s3://resumes/:userId.pdf`) via `StorageService` (or saves to `uploads/resumes/:userId.pdf` as a local disk fallback) and records the path in `Profile.resumePdfPath`.
4. Backend pushes a `parse-resume` job with the base64 string to the **Redis Queue** (`ai-tasks`) and immediately returns HTTP 202 Accepted with a `jobId`.
5. **Node BullMQ Worker (`ai.queue.ts`)**:
   - Pops the job and invokes `ResumeParser.parseResume` directly in Node.
   - Extracts raw text and hyperlink annotations using `pdfjs-dist`.
   - Prompts **Groq API** with the canonical `@squadup/shared` schema (`packages/shared/schemas/profile.schema.json`) to synthesize candidate profile data:
     - **`summary`**: Sanitized via `sanitizeSummary()` to guarantee clean first-person voice without awkward third-person prefixes.
     - **`experience`**: Strictly formal corporate employment, company internships, and research fellowships. If the candidate has no formal corporate employment, returns `[]`.
     - **`achievements`**: Hackathon victories (e.g. JPMorgan Code for Good, Israeli-Indian Hackathon), coding competitions, academic honors, scholarships, and open source awards (`title`, `organization`, `award_tier`, `year`, `description`, `technologies`).
     - **`projects`**: Technical software projects with full bullet points and technology tags.
     - **`links`**: Extracts GitHub and LinkedIn URLs.
6. **Node Worker (`ai.queue.ts`)**:
   - Upserts PostgreSQL `Profile` table with `title`, `summary`, `skills`, `education`, `experience`, `achievements`, `projects`, and links.
   - **Guarantees `Profile.university` is never overwritten or altered**, preserving institutional affiliation.
   - Feeds extracted skills, projects, experience, and achievements into the in-process `TaxonomyService.resolveUserTaxonomy` to persist canonical node IDs and provenance evidence in `UserTaxonomy`.
   - Dispatches in-app notification `PROFILE_UPDATED` informing the user that parsing is complete.
7. Frontend polling receives `{ state: "completed" }` and reactive hooks instantly refresh `/api/profile`, rendering separate **Work Experience** and **Achievements & Hackathons** cards.
8. Frontend streams the original resume PDF anytime via `GET /api/resume/view` (or squad leaders via `GET /api/resume/view/:targetUserId`) directly from Neon S3.

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
2. Backend calls `TaxonomyService.resolveTeamRequirements` inline (< 1ms).
3. Backend atomically creates `Team`, `TeamTaxonomy` (with pre-resolved `requirementNodeIds`), and assigns creator as `Leader`.
4. When a team updates requirements via `PATCH /api/teams/:id`, the backend automatically calls `TaxonomyService.resolveTeamRequirements` and updates `TeamTaxonomy` in real-time.

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
3. Candidate teams are scored via in-process `TaxonomyService.getRecommendations`:
   - Precomputes User Pre-Scoring Vector ($O(K \times N)$ in < 2ms).
   - Scores candidates via $O(1)$ lookups (< 10ms for 10,000 teams).
   - Evaluates match fit strictly against open designated roles (`spots > 0` and unassigned) to provide `bestMatchingRole` (or falls back to overall team requirements if all roles are occupied).
   - Keeps pure `taxonomyScore` ($0.0 - 1.0$).
   - Categorizes top candidates into `BEST`, `GOOD_DIFFERENT_UNIVERSITY`, and `SAME_UNIVERSITY_LOWER_SCORE`.
   - Generates transparent, requirement-by-requirement LCA explanations.
4. Returns ranked recommendations to the client.

### 7. First-Time User Onboarding & Organization Assignment Flow

1. **Client-Side Onboarding Gate (`OnboardingGuard`):**
   - When an authenticated user visits any application route, the client inspects their profile status (`GET /api/profile`).
   - If the user has no university affiliation (`Profile.university === null` or empty `organizationMemberships`), the guard redirects them to `/onboarding`. Core routes (`/teams`, `/events`, `/dashboard`) remain protected.
2. **University Selection via Searchable Dropdown:**
   - The onboarding screen presents a responsive, searchable dropdown populated via `GET /api/organizers/universities`.
   - Each entry displays the institution's name, domain, location, and badge, mapped directly to its underlying `clerkOrgId` (Clerk Organization ID).
   - Upon selection, the client triggers the organization association in Clerk.
   - Clerk dispatches an `organizationMembership.created` webhook to the backend (`/api/webhooks`), which writes to `OrganizationMembership` and automatically synchronizes `Profile.university`.
3. **Profile Setup Path Selection:**
   The user chooses between two distinct profile generation paths:
   - **Path A: AI Resume Upload (Highlighted / Recommended CTA):**
     - Emphasized as the fast, frictionless experience with automated skill mapping.
     - Candidate uploads a PDF resume (`POST /api/resume/upload`), which is stored in Neon S3 Object Storage (`resumes` bucket).
     - Offloaded to BullMQ (`ai.queue.ts`) -> Node.js parser (`pdfjs-dist` + Groq LLM) to extract projects, skills, and work experience, persisting canonical node IDs in `UserTaxonomy`.
     - **Non-blocking UX:** Candidate is not trapped on a loading screen. The UI informs the user ("Your profile is being built in the background") and allows optimistic transition directly into the discovery feed.
   - **Path B: Manual Profile Builder (Secondary Fallback):**
     - Form-driven setup for candidates without an updated resume or who prefer manual input.
     - Captures bio, degree, graduation year, social links, and manual skill tags.
     - Persists via `PATCH /api/profile` and triggers real-time deterministic taxonomy re-indexing.
4. **Completion & Hand-off:**
   - The user lands on the main SquadUp discovery feed (`/teams`), where institutional event filtering (`isGlobal`) and real-time team recommendations immediately reflect their university and skill graph.

### 8. User Preferences, Dynamic Theme Cascading & Banner Sync Flow

1. **Retrieval & Auto-Provisioning:**
   - On app boot or profile visit, the frontend fetches `GET /api/preferences`.
   - If no record exists (e.g. newly registered user), the backend transparently auto-provisions a default `UserPreferences` record.
2. **Semantic Theme Tokenization & Runtime Cascading:**
   - Tailwind CSS v4 `@theme` tokens in `styles.css` define the application design system: primary brand actions, recommendation tiers (`best-fit`, `cross-campus`, `campus-explorer`), surfaces, and borders.
   - The frontend `PaletteContext` injects dynamic CSS variables into `:root`. When a user picks a preset or custom hex, `color-mix(in srgb, ...)` generates complementary hover, light background, and border shades at runtime without requiring component re-renders or page reloads.
3. **Banner Personalization & Canvas Compression:**
   - Users can configure gradient banners (two colors + angle) or upload custom imagery.
   - For images, the client runs `compressImage()` on an off-screen HTML5 canvas, downscaling large uploads to a maximum 1400px width at 0.85 JPEG quality (~150KB).
   - The compressed payload is sent to `PATCH /api/preferences` or saved via `PATCH /api/profile`.
   - The Express backend accepts up to 15MB (`express.json({ limit: "15mb" })`), avoiding HTTP 413 Payload Too Large rejections.
4. **Cross-Device & Peer Profile Delivery:**
   - The backend includes `bannerConfig` directly in `getProfile` and `getProfileById` responses.
   - This ensures custom banners persist seamlessly across devices (desktop, tablet, mobile) and render identically when peers inspect a candidate's profile.
5. **Mobile Network Testing (`pnpm dev:host`):**
   - For local mobile testing over Wi-Fi, `pnpm dev:host` binds Vite to `0.0.0.0`, while keeping standard `pnpm dev` bound strictly to `localhost` for local security.
6. **Sign-Out Confirmation Safety Guard:**
   - A dedicated confirmation modal wraps the sign-out trigger on the profile page, preventing accidental logouts on mobile touches and desktop clicks.

## Database Interaction

- **Exclusive Access:** The Node.js Express Backend (`apps/api`) has exclusive access to the Neon PostgreSQL database and Neon Object Storage.
- **ORM:** All queries and mutations are performed using Prisma Client with pooled connections.

## Authentication & Clerk Webhook Synchronization

Authentication heavily leverages Clerk, but utilizes a decoupled architecture to protect the database from vendor lock-in.

1. **Frontend Authentication:** Clerk manages frontend sessions and provides session JWTs.
2. **Decoupled Identity Mapping:** The database stores native `cuid()` values as primary keys (`User.id`, `Organization.id`). External Clerk IDs are stored in indexed, unique columns (`User.clerkId`, `Organization.clerkOrgId`).
3. **Environment-Configurable Svix Webhook Receiver (`/api/webhooks`):**
   - The externally reachable receiving URL is configured dynamically via `CLERK_WEBHOOK_URL`, allowing seamless tunneling in local development (e.g. ngrok or Cloudflare Tunnels) and production domain routing without hardcoding URLs in code.
   - Webhook requests are cryptographically verified using Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) against `CLERK_WEBHOOK_SECRET`.
   - Express intercepts the raw JSON buffer prior to parsing to ensure uncorrupted HMAC verification.
4. **Supported Webhook Events (9 Total):**
   - **User Lifecycle (`user.created`, `user.updated`, `user.deleted`):** Upserts internal `User` records with primary email resolution, initializes a clean `Profile`, handles squad leadership succession on account deletion, and safely cascades deletions while invalidating Redis caches.
   - **Organization Lifecycle (`organization.created`, `organization.updated`, `organization.deleted`):** Synchronizes universities into the `Organization` table, updating metadata and gracefully unlinking events/teams upon deletion.
   - **Organization Membership Lifecycle (`organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`):**
     - Ensures both parent `Organization` and `User` exist.
     - Upserts `OrganizationMembership` tracking institutional roles (`org:admin`, `org:member`).
     - **Auto-synchronizes `Profile.university`** with the university organization name when created/updated.
     - Automatically resets `Profile.university = null` if a user leaves that institution.
     - Automatically purges corresponding Redis cache entries (`teams:*`, `events:*`).
5. **Resilient Just-In-Time Fallback:** When an authenticated request hits any protected route, `getOrCreateUserByClerkId(clerkId)` resolves the internal `cuid()`. If the user does not exist (e.g. during offline local development without public webhooks), it transparently fetches their profile from the Clerk API and seeds the record on demand.

## Architectural Constraints

- **Do not block the Node event loop:** PDF processing, S3 uploads, and LLM calls MUST be dispatched to the `ai.queue.ts` BullMQ queue.
- **In-Memory Deterministic Taxonomy:** Matchmaking and taxonomy resolution run entirely in-process in Node.js with sub-millisecond tree traversals.
- **Clerk Decoupling:** Never use the Clerk string ID directly as a foreign key. Map it to the internal `cuid()` via `getOrCreateUserByClerkId()`.
- **Pure Compatibility Scores:** Never corrupt technical capability scores with university bonus math. University context is communicated via recommendation presentation categories.
- **Server-Side Pagination:** Always filter and sort at the database level before applying `skip` and `take`. Client-side pagination should not be used on raw unpaginated collections.
- **Cache Invalidation on Write:** Every entity mutation (event, team, application, member) must immediately invalidate its relevant Redis cache keys.

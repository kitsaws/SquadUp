# Architecture Decision Log

This log records important architectural decisions made during the development of SquadUp. Future AI agents should consult this file before attempting to "refactor" or fundamentally change existing patterns.

---

## [Decoupled Clerk Authentication]

### Decision
The primary keys (`id`) in the PostgreSQL `User` table are generated internally via Prisma's `cuid()`. The external authentication ID provided by Clerk is stored in a separate unique column named `clerkId`. All API routes intercept the Clerk JWT, look up the `clerkId`, and fetch the internal `cuid()` before performing database relations.

### Context
Using a third-party vendor's ID format (e.g., `user_2Jk...`) directly as a primary and foreign key across dozens of relational tables creates immense vendor lock-in. 

### Consequences
- **Positive:** If SquadUp ever migrates away from Clerk to Auth0, Firebase, or custom JWTs, the database relations (`Profile`, `Team`, `Event`) remain perfectly intact. Only the `clerkId` column needs to be mapped to the new provider.
- **Negative:** Requires an extra database lookup (`getOrCreateUserByClerkId`) on authenticated routes to resolve the user's internal identity.

### Status
Accepted

---

## [Hybrid Microservice Architecture (Node + Python)]

### Decision
The application is split into two backend services: a Node.js Express API and a Python FastAPI service. They communicate asynchronously via a Redis/BullMQ job queue.

### Context
Parsing PDFs (`pdfplumber`) and running complex data science/LLM tasks is significantly easier and more robust in the Python ecosystem. However, Node.js and TypeScript are superior for building fast, type-safe web APIs and managing standard database CRUD.

### Consequences
- **Positive:** The Node event loop is never blocked by heavy CPU-bound tasks like text extraction. The Python service remains stateless and scalable.
- **Negative:** Increased infrastructural complexity. Requires running Redis and maintaining two separate codebases/deployment pipelines.

### Status
Accepted

---

## [Clerk Organizations for Educational Institutions]

### Decision
Universities and colleges are modeled using **Clerk Organizations** rather than custom PostgreSQL hierarchy tables. The `orgId` is simply stored as an optional string on the `Event` and `Team` models.

### Context
Building a custom system to verify university emails, manage domains, and handle organizational invites is massively complex. Clerk natively supports "Verified Domains" (e.g., auto-enrolling anyone with a `@stanford.edu` email into the Stanford organization).

### Consequences
- **Positive:** Zero code required to manage university membership verification. 
- **Negative:** Event and Team data fetching must be carefully scoped using the `orgId` present in the user's active session token to ensure data isolation between universities. (Events can opt-out by setting `isGlobal: true`).

### Status
Accepted

---

## [Deterministic Knowledge Graph Taxonomy Over Dense Embeddings]

### Decision
Replaced planned vector embeddings (`pgvector`) with a deterministic, single-parent 143-node knowledge hierarchy rooted at `computer_science`. Taxonomy representations are decoupled into dedicated `UserTaxonomy` and `TeamTaxonomy` tables.

### Context
Dense vector embeddings suffer from hallucinations, opacity, and "black-box" similarity drifts where unrelated technologies score spuriously high. Furthermore, embedding inference introduces latency and compute costs. By contrast, a single-parent hierarchy enables deterministic 7-case directional scoring, microsecond LCA lookups, precomputed user scoring vectors (< 20ms over 10,000 teams), and transparent, explainable reasoning paths for every match.

### Consequences
- **Positive:** Zero hallucinations; fully transparent plain-English LCA explanations; compact in-memory graph search; database schemas remain decoupled.
- **Negative:** Requires maintaining a canonical vocabulary and alias map for newly emerging technologies.

### Status
Accepted

---

## [Separation of Event Eligibility, Pure Compatibility Scoring, and University Categorization]

### Decision
Separated matchmaking into three decoupled stages:
1. **Hard Event Eligibility:** Filtered at query time based on `isGlobal` and university scoping.
2. **Pure Compatibility Scoring:** Mathematical technical capability score ($0.0 - 1.0$) with no university bonus math.
3. **Recommendation Categorization:** Top candidates are categorized into `BEST`, `GOOD_DIFFERENT_UNIVERSITY`, and `SAME_UNIVERSITY_LOWER_SCORE`.

### Context
Attempting to blend university into a numerical formula (e.g. 80% technical + 20% university) caused moderate local candidates to artificially outrank superior cross-university technical matches on global events, distorting the meaning of the score.

### Consequences
- **Positive:** The score remains an uncorrupted, interpretable measure of technical skill. Eligibility constraints are enforced cleanly before ranking.
- **Negative:** Frontend UI must support rendering badges and visual tiers for distinct recommendation categories.

### Status
Accepted

---

## [Server-Side Pagination by Default for Event and Team Directories]

### Decision
Standardized all directory endpoints (`GET /api/events`, `GET /api/teams`) on database-level server-side pagination (`page` defaulting to 1, `limit` defaulting to 10). When dataset-affecting filters change on the frontend, the client requests a newly filtered page starting at `page=1`.

### Context
Attempting to handle pagination purely on the frontend while relying on server-side limits leads to split data states where filters miss items located on subsequent pages. Conversely, loading the entire database to the client degrades performance as the platform scales.

### Consequences
- **Positive:** Scales gracefully to millions of events and teams. Memory usage remains bounded on both client and server.
- **Negative:** Requires an HTTP round-trip whenever filters or pages change (mitigated by Redis caching).

### Status
Accepted

---

## [Multi-Tiered University (Organization) and Sub-Organizer (Clubs/Societies) Hierarchy]

### Decision
Modeled universities via `Organization` (matching Clerk's `clerkOrgId`) and university clubs/societies via `Organizer` with role-based member permissions (`OrganizerMember`). Events maintain their primary contact (`organizerId` -> `User`), but can be optionally linked to an `organizerProfileId` -> `Organizer`.

### Context
University hackathons and tech events are rarely organized by isolated individuals. They are hosted by university chapters (e.g. ACM, IEEE, GDSC) or hackathon committees with multi-person leadership teams.

### Consequences
- **Positive:** Allows student clubs to establish persistent profiles, co-organize events, and delegate administrative rights to club officers.
- **Negative:** Requires checking club membership roles (`ADMIN`) when modifying club-hosted events.

### Status
Accepted

---

## [Redis Query Caching with Dynamic Event TTL and Invalidation on Mutation]

### Decision
Integrated Redis caching for directory queries (`events:list:*`, `teams:list:*`) with a 5-minute TTL, and single event queries (`event:<id>`) with dynamic TTLs ($\max(300, \text{event date} + 3\text{ days} - \text{now})$ capped at 14 days). Mutations trigger instant cache invalidation.

### Context
Event and team listings are read-heavy and queried frequently by students browsing opportunities. Dynamic TTL ensures active events remain hot in cache until their conclusion, automatically expiring afterward.

### Consequences
- **Positive:** Response times for cached listings drop to < 2ms. Database load is minimized.
- **Negative:** Mutation endpoints must carefully call cache invalidation patterns to prevent stale data.

### Status
Accepted

---

## [Resume PDF Local Storage, Inline Streaming, and 24-Hour Rate Limiting with Allowlist]

### Decision
Uploaded PDF resumes are saved locally to disk (`uploads/resumes/:userId.pdf`) with streaming endpoints (`/api/resume/view`) for inline browser display. Users are rate-limited to 1 resume upload per 24 hours (tracked via `Profile.lastResumeUploadedAt`), with a configurable bypass for developer/tester emails.

### Context
Re-parsing resumes repeatedly incurs Groq API and microservice costs. Storing the PDF allows teammates and organizers to view the original resume directly on the candidate profile without re-uploading.

### Consequences
- **Positive:** Prevents LLM cost exploitation and server flooding. Provides an authentic PDF viewing experience on the frontend.
- **Negative:** Requires disk storage management for PDF files.

### Status
Accepted

---

## [Team Application Lifecycle and Institutional Scoping Guard]

### Decision
Introduced a formal `TeamApplication` join model with candidate join requests and leader review decisions. Enforced a hard server-side check that prevents users from applying to teams belonging to non-global events of other universities.

### Context
Beyond leaders inviting users via email, candidates need a discovery mechanism to request to join open teams. Institutional events must enforce student eligibility before applicants can enter team rosters.

### Consequences
- **Positive:** Eliminates disorganized messaging channels for team joining. Enforces institution isolation safely at the API layer.
- **Negative:** Frontend must reflect application states (`PENDING`, `ACCEPTED`, `REJECTED`) and disable the Apply button proactively when non-global universities mismatch.

### Status
Accepted


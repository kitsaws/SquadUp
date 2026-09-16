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

## [Consolidated Node.js Backend Architecture]

### Decision
The backend is consolidated entirely into a single Node.js TypeScript codebase (`apps/api`), removing the previous standalone Python `apps/ai-service`. Asynchronous background processing is preserved using Redis and BullMQ.

### Context
Python was originally introduced for embedding/ML-heavy workloads (`pgvector`, sentence transformers) and PDF parsing (`pdfplumber`). However, the recommendation system evolved into a deterministic single-parent knowledge graph hierarchy that runs entirely in-memory with sub-millisecond tree traversals. The remaining AI task—synthesizing candidate profiles from resumes—is handled via direct Groq LLM API calls with structured JSON output and in-memory `pdfjs-dist` text extraction. Maintaining a separate Python microservice runtime introduced unnecessary infrastructure complexity, network hop latency, and multi-language maintenance overhead.

### Consequences
- **Positive:** Greatly simplified infrastructure; eliminated cross-service HTTP failure modes; reduced local development and deployment footprint; taxonomy resolution and recommendations execute in-process in <2ms; full type safety across backend and shared packages.
- **Negative:** None for the current feature set. If heavy local ML/computational vision models are genuinely required in future versions, a dedicated ML worker service can be reintroduced at that time.

### Status
Accepted (Supersedes prior Hybrid Microservice Architecture)

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

---

## [Full 9-Event Clerk Webhook Synchronization and Automatic Profile Alignment]

### Decision
Support all 9 Clerk webhook events across users, organizations, and memberships with cryptographic Svix verification (`/api/webhooks/clerk`). Membership creation/updates automatically synchronize the user's `Profile.university` with the organization name and persist internal roles (`OrganizationMembership`). When a user departs an organization, `Profile.university` resets to `null`.

### Context
Users authenticate and join university organizations via Clerk. Storing memberships in the internal database enables seamless relational joins for clubs, events, and teams without making blocking HTTP calls to Clerk during user queries.

### Consequences
- **Positive:** Instant profile alignment with zero manual input by the student. Completely decoupled database identity model with high-speed query performance and immediate Redis cache invalidation.
- **Negative:** Requires active webhook delivery in production and Svix signature verification. Local development relies on `getOrCreateUserByClerkId()` fallback or webhook tunneling.

### Status
Accepted

---

## [First-Time User Onboarding Flow & Dual Profile Creation Model]

### Decision
Implement a dedicated first-time user onboarding journey (`/onboarding`) protected by a client-side route guard (`OnboardingGuard`):
1. **University Selection:** Users without an active organization membership (`Profile.university === null`) must select their institution from a searchable dropdown populated from `GET /api/organizers/universities` and linked to `clerkOrgId`.
2. **Dual Profile Creation (Resume-First):** Users choose how to complete their profile, with AI Resume Parsing (`POST /api/resume/upload`) prominently highlighted as the recommended fast path, and Manual Entry (`PATCH /api/profile`) provided as a secondary fallback.
3. **Optimistic Non-Blocking UX:** Resume parsing does not block navigation. Users are shown a clear background processing indicator and allowed to enter the main application immediately while BullMQ and the Python AI service process the document.

### Context
SquadUp's core algorithms rely on institutional affiliation (for `isGlobal` scoping and university-tier recommendation categorizations) and structured skill taxonomy nodes (for LCA recommendation explainability). If new users navigate directly to teams without an organization or skills, compatibility scores are zero and team applications to local events fail with HTTP 403 Forbidden. Guiding new users through a streamlined two-step onboarding sequence directly solves this cold-start dilemma.

### Consequences
- **Positive:** Eliminates cold-start scoring blanks, ensures zero unauthorized cross-institutional applications, and maximizes profile completion rates by offering instant AI resume ingestion with zero manual typing required.
- **Negative:** Adds a mandatory onboarding step for new users and requires client-side route guarding on protected routes until an organization is chosen.

### Status
Accepted

---

## [Dedicated UserPreferences Entity & Centralized Settings Persistence]

### Decision
Store user preferences (interface theme mode, palette presets, custom primary hex, banner configuration, notification toggles, and matching defaults) in a dedicated PostgreSQL table `UserPreferences` with a 1:1 cascade relationship to `User`, rather than overloading `Profile` or keeping preferences purely in client-side `localStorage`.

### Context
Users customize their experience via themes, notification settings, and profile banners. Keeping these preferences solely in client `localStorage` causes them to vanish across devices (e.g. configuring a theme or banner on a desktop browser did not sync to mobile or appear to peers viewing the profile). Storing them directly in `Profile` would conflate academic/technical credentials (skills, degree, resume) with ephemeral presentation and notification preferences.

### Consequences
- **Positive:** Full cross-device synchronization (desktop, tablet, mobile) and consistent banner rendering for visiting peers. Clear separation of concerns between user identity/credentials and presentation/notification preferences.
- **Negative:** Requires an extra database table and dedicated `GET /api/preferences` and `PATCH /api/preferences` endpoints with auto-provisioning logic.

### Status
Accepted

---

## [Tailwind CSS v4 Semantic @theme Tokenization & Runtime Palette Cascading]

### Decision
Declare centralized semantic design tokens in `styles.css` using Tailwind CSS v4 `@theme` (e.g. `--color-primary-action`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-border`, `--color-surface-*`, `--color-border-main`, recommendation tiers). Dynamically cascade active theme colors at runtime via `PaletteContext` utilizing CSS `color-mix(in srgb, ...)`.

### Context
Hardcoding arbitrary utility colors (`bg-blue-600`, `text-blue-500`, `#2563eb`) across dozens of components led to inconsistent contrast, broken dark-mode variants, and an inability to support user-selected themes, color presets, or banner-driven primary accents.

### Consequences
- **Positive:** Single source of truth for color tokens. Selecting a palette preset or syncing banner colors instantly updates primary buttons, badges, rings, and borders application-wide without requiring component re-renders or page refreshes.
- **Negative:** Requires disciplined use of semantic tokens instead of quick ad-hoc Tailwind color utilities.

### Status
Accepted

---

## [Client-Side Canvas Compression & High-Capacity Payload Configuration for Banners]

### Decision
Implement client-side HTML5 canvas compression (`compressImage`) in `EditProfileModal` to scale uploaded banner images to a maximum width of 1400px at 0.85 JPEG quality (~150KB), while concurrently expanding Express's default JSON payload limit from 100KB to 15MB (`express.json({ limit: "15mb" })`).

### Context
Standard uncompressed smartphone or camera photos range from 3MB to 12MB. Express's default 100KB body parser silently failed with HTTP 413 "Payload Too Large" when users uploaded banners, causing them to fall back to `localStorage` caching and fail cross-device sync.

### Consequences
- **Positive:** Fast mobile uploads, zero server rejection, minimal database storage footprints, and instant image delivery across devices.
- **Negative:** Canvas compression occurs on the client's device, using slight CPU during the image selection step.

### Status
Accepted

---

## [Sign-Out Confirmation Safety Guard on User Profile]

### Decision
Wrap the user profile sign-out action with an explicit modal confirmation dialog requiring the user to confirm before invoking `clerk.signOut()`.

### Context
On mobile screens and tight responsive viewports, the sign-out button is located adjacent to settings and edit controls. Direct execution of sign-out upon a single touch led to accidental session terminations, causing frustration and requiring re-authentication.

### Consequences
- **Positive:** Completely prevents accidental logouts. Clear, reassuring UX dialog with cancel option.
- **Negative:** Adds one extra click for intentional logouts.

### Status
Accepted

---

## [Isolated Localhost Development with On-Demand LAN Binding (dev:host)]

### Decision
Keep default `npm run dev` / `pnpm dev` bound strictly to `localhost` (`127.0.0.1`), and provide an explicit separate script `pnpm dev:host` (`turbo dev:host` -> `vite --host`) to expose the frontend to the local area network (`0.0.0.0`) on demand.

### Context
Developers need to preview the application on physical mobile devices connected to the same Wi-Fi network. However, binding to `0.0.0.0` by default exposes the local development server to every device on public or shared networks (e.g. university Wi-Fi, coffee shops), posing security risks.

### Consequences
- **Positive:** Secure by default on all developer environments while remaining trivial to spin up network-accessible testing with a single command (`pnpm dev:host`).
- **Negative:** Requires running a different npm script when testing on a phone.

### Status
---

## [Separation of Work Experience from Hackathons & Achievements]

### Decision
Model formal corporate/startup employment and internships under `experience`, while segregating hackathon victories, coding competitions, awards, and honors under a distinct `achievements` array in both the database schema (`Profile.achievements`) and shared TypeScript contracts (`AchievementItem`).

### Context
College student candidates frequently list hackathon wins (e.g. JPMorgan Code for Good, Israeli-Indian Hackathon) under awards or project headings. Early parsing heuristics placed these achievements into `experience`, misrepresenting hackathons as corporate employment and corrupting candidate work profiles.

### Consequences
- **Positive:** Accurate candidate profiling where recruiters and teammates see clear separation between professional employment and hackathon victories. Hackathon achievements have customized metadata (`award_tier`, `organization`, `year`). Both categories feed into the taxonomy engine for skills evidence.
- **Negative:** Requires an extra UI card on the profile page and an additional database field.

### Status
Accepted

---

## [Immutability of University Affiliation in Resume Ingestion]

### Decision
`Profile.university` must **never** be overwritten, updated, or inferred from resume text during PDF parsing. It is strictly determined and governed by Clerk Organization memberships and educational institution verification.

### Context
Resume parsing initially attempted to infer the candidate's college name from the first entry of `education`. However, in SquadUp, `university` establishes an institutional trust anchor that scopes campus-only squad filtering, event eligibility, and organization memberships. Allowing unstructured LLM resume text to overwrite this field could break university scoping or misclassify institutional affiliation.

### Consequences
- **Positive:** University affiliation remains secure, immutable, and consistent across organization-scoped events and teams.
- **Negative:** Candidates attending unverified or non-Clerk colleges cannot set their university simply by typing it in a resume.

### Status
Accepted

---

## [Unified Monorepo Schema for Python & TypeScript Resume Ingestion]

### Decision
The Python AI microservice (`apps/ai-service/resume_parser.py`) loads its extraction JSON schema dynamically from the shared monorepo package `@squadup/shared` (`packages/shared/schemas/profile.schema.json`), which mirrors `@squadup/shared/src/types/user.types.ts`.

### Context
Maintaining duplicate, hardcoded schema shapes in Python and TypeScript led to schema drift where new fields (such as `achievements` or hyperlinks) existed in one service but were dropped in the other.

### Consequences
- **Positive:** Single source of truth. Any schema change in `@squadup/shared` immediately shapes the LLM prompt in Python and the typechecker in TypeScript.
- **Negative:** The Python service requires file path access to `packages/shared/schemas` in local monorepo development.

## [Academic Email Domain Verification & Hover Reasoning Popup]

### Decision
A candidate student is designated as **Verified Student** (`isVerifiedStudent: true`) if and only if their active account email address shares the verified domain registered with their primary academic `Organization` (e.g. `aarav.sharma@thapar.edu` $\leftrightarrow$ `@thapar.edu` for TIET). The frontend displays an interactive `VerificationBadge` that renders a hover/click card explaining the verification reasoning, required academic domain, and institutional context.

### Context
Merely selecting a university or belonging to an organization in Clerk does not guarantee that a candidate is an active, enrolled student unless their email domain matches the institution's official registrar domain. Recruiter trust and campus-isolated hackathon integrity require clear visibility into whether a student's institutional affiliation is verified or unverified.

### Consequences
- **Positive:** Transparent trust signals for recruiters and hackathon organizers. Students clearly understand why their status is verified or unverified with actionable guidance.
- **Negative:** Students with personal email addresses (e.g. `@gmail.com`) attached to university accounts will show as "Unverified Student" until they link their `.edu` email.

### Status
Accepted

---

## [Cascade Propagation of Clerk Organization Updates to Profiles and Teams]

### Decision
When an `organization.updated` or `organization.deleted` webhook event is processed (or during JIT authentication reconciliation in `auth.utils.ts`), changes to the organization's name or metadata automatically cascade to all associated member records in `Profile.university` and `Team.university`.

### Context
Renaming a university in Clerk previously left member candidate profiles and university-scoped teams holding stale institution strings, causing mismatched filtering and scoring anomalies across the platform.

### Consequences
- **Positive:** Complete data consistency across `Organization`, `Profile`, and `Team` tables whenever institutional metadata changes in Clerk.
- **Negative:** Requires bulk database updates and instant Redis cache purges on organization mutation events.

### Status
Accepted

---

## [Pitch-Ready Multi-Campus Database Seeding with In-Process Taxonomy Resolution]

### Decision
The database seeder (`prisma/seed.ts`) generates simulated students, clubs, events, and teams across 4 verified Clerk organizations (TIET, BITS Pilani, VIT Vellore, IIT Delhi) using our deterministic `TaxonomyService` in-process rather than dispatching LLM API calls.

### Context
Populating a pitch-ready demonstration dataset with 66 teams and 24 student profiles using external LLM calls would be slow, costly, and subject to rate limits. Because SquadUp features an in-process deterministic 143-node taxonomy resolver, all canonical node IDs and provenance evidence can be generated instantaneously with 100% reproducible graph integrity.

### Consequences
- **Positive:** Sub-second database seeding with zero external API dependencies or costs. Complete data richness supporting live multi-campus product demonstrations.
- **Negative:** None.

### Status
Accepted






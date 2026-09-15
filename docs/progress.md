# Project Progress & Handoff State

This document provides a snapshot of the current state of the SquadUp project. It should be updated after significant coding sessions.

## Current Focus

The immediate next priority is implementing the **First-Time User Onboarding Flow** (`apps/web`):
1. **First-Time Onboarding Gate & Route Guard:** Detecting new/incomplete users (`Profile.university === null` or no organization membership) and redirecting them to `/onboarding`.
2. **University/Organization Selection Screen:** A clean, searchable dropdown menu of educational institutions linked directly to their `clerkOrgId` (Clerk Organization ID), updating institutional membership and synchronizing `Profile.university`.
3. **Profile Creation Choice Screen:** Presenting users with two paths to build their profile:
   - **Upload Resume (Highlighted / Primary CTA):** Automated AI resume parsing that extracts skills, projects, and work experience to populate the `UserTaxonomy` graph with zero manual typing.
   - **Build Manually (Secondary / Fallback):** Intuitive manual form entry for bio, degree, links, and skill tags.

## Completed

- **Dynamic Clerk Webhook & Svix Ingestion:**
  - Decoupled external webhook receiver URL via `CLERK_WEBHOOK_URL` environment variable.
  - Full Svix cryptographic verification with detailed real-time terminal event logging (`Svix verified [organizationMembership.created]...`).
  - Auto-synchronization between Clerk organizations and database `Organization`, `OrganizationMembership`, and `Profile.university`.
- **Hybrid Monorepo Infrastructure:** Turborepo configuration successfully runs `web`, `api`, and `ai-service` concurrently.
- **Background Jobs:** Redis and BullMQ are fully operational, gracefully passing large buffers between Node and Python.
- **AI Resume Parsing:** The Python microservice uses `pdfplumber` to extract text and the Groq LLM API to return structured candidate JSON with extracted technologies per project and experience item.
- **Deterministic Knowledge Hierarchy Engine:**
  - 143-node canonical tree rooted at `computer_science`.
  - 3-layer deterministic resolver (case-sensitive exact, normalized aliases, whole-token phrase matching).
  - V2 Multi-source Evidence Extractor (skills: 0.65, projects: 0.85, experience: 1.00) with concrete provenance snippets.
  - Directional 7-rule structural pair scoring and coverage aggregation.
  - In-memory User Pre-Scoring Vector optimization (< 20ms over 10,000 teams).
- **Core API & Full CRUD:**
  - **Events API (`/api/events`):**
    - Standard server-side pagination by default (`page`, `limit`, `search`, `scope`, `sort`).
    - Redis query caching (5-minute list TTL) and dynamic event TTL (seconds until event + 3 days).
    - Single event details with team count and team previews.
    - Create, Update, and Delete routes with organizer/club-admin authorization and instant cache invalidation.
    - Listing teams registered under an event.
  - **Teams API (`/api/teams`):**
    - Server-side pagination and filtering by `eventId`, `myTeams`, `search`, and `sort`.
    - Real-time `TeamTaxonomy` synchronization when team requirements change.
    - Delete team and team member removal with leader authorization.
    - Email invites lifecycle: send (`POST /:id/invites`), list pending (`GET /invites/my-invites`), accept (`POST /invites/:id/accept`), decline (`POST /invites/:id/decline`), and cancel (`DELETE /:id/invites/:id`).
    - Team Application lifecycle: apply (`POST /:id/apply`), withdraw (`DELETE /:id/apply`), review applications (`GET /:id/applications`), accept (`POST /applications/:id/accept`), and reject (`POST /applications/:id/reject`).
    - Member opt-out (`DELETE /:id/leave`) with automatic leadership transfer to the next member (or team deletion if sole member).
    - Push-down DB filtering + pure taxonomy scoring recommendations (`POST /api/teams/recommendations`).
  - **User & Profile API (`/api/profile`):**
    - Profile retrieval with full user details, active teams, pending invites, and taxonomy nodes.
    - Profile updates (`PATCH /api/profile`) with automatic real-time `UserTaxonomy` re-indexing when skills or projects change.
    - Public candidate profile viewing (`GET /api/profile/:userId`).
  - **Resume PDF Storage & Rate Limiting (`/api/resume`):**
    - Local disk persistence of uploaded resume PDFs under `uploads/resumes/`.
    - Inline browser streaming routes (`GET /api/resume/view` and `GET /api/resume/view/:targetUserId`) for rendering in `<iframe src="...">` or viewer.
    - 24-hour rate limit per user tracked on `Profile.lastResumeUploadedAt` with HTTP 429 response.
    - Testing/dev bypass for designated emails (`nagpalswastik@gmail.com`, `razediff0@gmail.com`) and `BYPASS_RESUME_RATE_LIMIT=true`.
  - **University & Sub-Organizers API (`/api/organizers`):**
    - University `Organization` model mapping to Clerk `orgId` (`/universities`).
    - Sub-organizer `Organizer` model for university clubs and societies (e.g. ACM, Robotics, GDSC).
    - Role-based membership (`OrganizerMember`) allowing club admins to create and manage events.
  - **Comprehensive 9-Event Clerk Webhooks (`/api/webhooks/clerk`):**
    - Cryptographic verification via Svix (`CLERK_WEBHOOK_SECRET`).
    - Full handling for `user.created`, `user.updated`, and `user.deleted` with profile initialization and cache invalidation.
    - Full handling for `organization.created`, `organization.updated`, and `organization.deleted` with metadata synchronization and cascade cleanup.
    - Full handling for `organizationMembership.created`, `organizationMembership.updated`, and `organizationMembership.deleted` with internal `OrganizationMembership` tracking (`org:admin` vs `org:member`).
    - **Automatic synchronization of `Profile.university`** with organization name when joining/updating, and resetting to `null` upon leaving.
- **Decoupled Relational Database:**
  - `UserTaxonomy` (1:1 with `User`) and `TeamTaxonomy` (1:1 with `Team`).
  - `Organization`, `OrganizationMembership`, `Organizer`, `OrganizerMember`, and `TeamApplication` models.
  - `Profile` updated with `resumePdfPath`, `resumeOriginalName`, and `lastResumeUploadedAt`.
- **Decoupled Auth:** Clerk webhooks and internal database `cuid()` generation are fully separated using `getOrCreateUserByClerkId`.
- **Type Safety:** `@squadup/shared` package maintains absolute cross-boundary typing for events, teams, applications, organizers, profiles, and recommendations.

## Client-Side & Frontend Constraints to Note

1. **`isGlobal` Team Application Check:**
   When an event is non-global (`event.isGlobal === false`), the backend rejects applications from users of different institutions with HTTP 403 Forbidden.
   *Future Frontend Guideline:* When rendering team cards, check `team.event.isGlobal`. If false and the user's university does not match the team/event, disable or hide the "Apply" button proactively with a tooltip indicating institutional restriction.
2. **Server-Side Pagination Reset:**
   The frontend should request a new server-filtered page whenever search, university scope, or sort changes, always resetting to `page=1`.

## In Progress

- **First-Time User Onboarding Architecture (`apps/web`):**
  - Designing the guided Onboarding Flow and client-side route guards (`/onboarding`).
  - Specifying the searchable university dropdown mapped to `clerkOrgId`.
  - Defining the dual profile creation path: Highlighted AI Resume Parsing (recommended primary CTA) vs. Manual Profile Builder.
- **Frontend UI (`apps/web`):**
  - Building components to display paginated Events and Teams.
  - Rendering recommended teams with category badges and LCA breakdown drawers.
  - Embedding resume PDF viewer in user profile.
  - Clerk Organization Switcher in Navbar for university switching.

## Known Issues

- **Windows Prisma Locking:** Running `npx prisma db push` while Next/Vite dev servers are actively holding DLL locks can occasionally throw `EPERM` errors. (Workaround: stop dev server, push schema, restart).

## Next Steps

1. **First-Time User Onboarding (`apps/web`):**
   - Implement `/onboarding` route and gate:
     - User signs up / logs in -> system checks if `Profile.university` is set or user belongs to an organization.
     - **Screen 1 (University/Organization Selection):** Searchable dropdown consuming `/api/organizers/universities`, bound to `clerkOrgId`. Triggers Clerk org membership & auto-syncs `Profile.university`.
     - **Screen 2 (Profile Setup Path Selection):**
       - **Option A (Highlighted/Promoted):** "Upload Resume" -> dispatches to `POST /api/resume/upload` for async LLM parsing & taxonomy resolution, showing clear background processing status with optimistic continuation.
       - **Option B (Secondary/Manual):** "Build Manually" -> intuitive form modal/view updating `PATCH /api/profile`.
2. **Frontend Events & Teams Directory:** Build React views connecting to `GET /api/events` and `GET /api/teams` with pagination and search.
3. **Frontend Application & Invite Modals:** Provide UI for candidates to apply and for leaders to review applicants.
4. **Frontend Recommendations View:** Render team recommendation cards with category badges and expandable requirement breakdown accordions.

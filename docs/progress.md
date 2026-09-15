# Project Progress & Handoff State

This document provides a snapshot of the current state of the SquadUp project. It should be updated after significant coding sessions.

## Current Focus

The core backend (Events, Teams, Users, Profiles, Resumes, Applications, and University Sub-Organizers) is fully implemented and tested. The primary upcoming focus is the **Frontend UI integration** (`apps/web`):
1. Connecting the React frontend to the new paginated Events & Teams APIs with search and filter controls.
2. Integrating Team Application flows with client-side checks for `isGlobal`.
3. Consuming the recommendation endpoint (`POST /api/teams/recommendations`) and rendering cards with category badges and expandable LCA decision drawers.

## Completed

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
- **Decoupled Relational Database:**
  - `UserTaxonomy` (1:1 with `User`) and `TeamTaxonomy` (1:1 with `Team`).
  - `Organization`, `Organizer`, `OrganizerMember`, and `TeamApplication` models.
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

- **Frontend UI (`apps/web`):**
  - Building components to display paginated Events and Teams.
  - Rendering recommended teams with category badges and LCA breakdown drawers.
  - Embedding resume PDF viewer in user profile.
  - Clerk Organization Switcher in Navbar for university switching.

## Known Issues

- **Windows Prisma Locking:** Running `npx prisma db push` while Next/Vite dev servers are actively holding DLL locks can occasionally throw `EPERM` errors. (Workaround: stop dev server, push schema, restart).

## Next Steps

1. **Frontend Events & Teams Directory:** Build React views connecting to `GET /api/events` and `GET /api/teams` with pagination and search.
2. **Frontend Application & Invite Modals:** Provide UI for candidates to apply and for leaders to review applicants.
3. **Frontend Recommendations View:** Render team recommendation cards with category badges and expandable requirement breakdown accordions.

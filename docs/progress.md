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

- **Backend Consolidation & Pure Node.js Architecture (Completed):**
  - Consolidated all AI & Resume processing from `Prototyping/ResumeToProfile` directly into `apps/api/src/services/resume.parser.ts` using `pdfjs-dist` and direct Groq LLM API integration.
  - Fully ported the 143-node Deterministic Knowledge Graph Taxonomy & V2 Recommendation System from Python to TypeScript under `apps/api/src/taxonomy/`.
  - Achieved 100% test parity with the Python baseline across all 7 test suites, with sub-25ms recommendation latency over 10,000 teams.
  - Decommissioned and completely removed `apps/ai-service`, eliminating multi-language maintenance overhead and cross-process HTTP hops.
- **Dynamic Clerk Webhook & Svix Ingestion:**
  - Decoupled external webhook receiver URL via `CLERK_WEBHOOK_URL` environment variable.
  - Full Svix cryptographic verification with detailed real-time terminal event logging (`Svix verified [organizationMembership.created]...`).
  - Auto-synchronization between Clerk organizations and database `Organization`, `OrganizationMembership`, and `Profile.university`.
- **Streamlined Monorepo Infrastructure:** Turborepo configuration now runs `web` and `api` cleanly in pure TypeScript.
  - **Experience & Achievements Separation**: Formal corporate employment and internships are stored under `experience`, while hackathons (e.g. JPMorgan Code for Good, Israeli-Indian Hackathon), coding competitions, and awards are stored under `Profile.achievements`.
  - **PDF Hyperlink Extraction**: `pdfplumber` now extracts embedded PDF hyperlink annotations (`page.hyperlinks`), ensuring candidates' GitHub and LinkedIn profile links are captured accurately.
  - **University Immutability**: `Profile.university` is protected as an immutable institutional anchor governed strictly by Clerk Organizations and cannot be altered by resume text.
  - **Frontend UI & Reactive Refresh**: Dedicated Achievements & Hackathons card with trophy badges, and instant profile re-fetching via `JobContext` upon BullMQ completion.
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
- **Frontend Design System & Semantic Theme Tokenization (`apps/web`):**
  - Configured Tailwind CSS v4 `@theme` directive in `styles.css` declaring full semantic design tokens: brand primary & derivatives (`--color-primary-action`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-border`), recommendation tiers (`--color-best-fit*`, `--color-cross-campus*`, `--color-campus-explorer*`), and structural foundations (`--color-canvas`, `--color-surface*`, `--color-border-main`, `--color-text-*`).
  - Dynamic runtime color cascading via `PaletteContext` utilizing CSS `color-mix(in srgb, ...)`. Selecting a preset or syncing banner colors instantly propagates across buttons, badges, rings, and accents without component re-renders.
  - Systematically refactored all 11 components and 8 pages, eliminating hardcoded `blue-*` classes and arbitrary hexes.
- **UserPreferences Database Model & Persistence:**
  - Added `UserPreferences` in PostgreSQL (Prisma) with 1:1 cascade relation to `User`.
  - Stored fields: `themeMode` (`system` | `light` | `dark`), `palettePreset`, `primaryColor`, `bannerConfig` (`Json`), notification settings (`emailNotifications`, `teamInvitesNotification`, `applicationUpdates`, `marketingEmails`), and matching preferences (`defaultCampusOnly`, `openToCollaboration`, `preferredRoles`).
  - Auto-provisioned on user registration and profile sync via `auth.utils.ts`.
  - Dedicated REST endpoints: `GET /api/preferences` and `PATCH /api/preferences` with payload whitelisting.
- **User Preferences Modal (`UserPreferencesModal.tsx`):**
  - Sleek 3-tab settings dialog:
    1. **Theme & Appearance**: Light/Dark/System theme selector, Palette preset cards, custom primary color picker, and banner sync toggle.
    2. **Notifications**: Master email toggle, squad invite alerts, application updates, and digest toggles.
    3. **Squads & Matching**: Default campus-only filter toggle, Open to collaboration status toggle, and preferred roles selector.
  - Integrated into the Profile action menu and synced with PostgreSQL.
- **Banner Customization, Canvas Compression & Cross-Device Sync:**
  - Dynamic banner editor supporting custom CSS gradients (two-color pickers, angle slider) and image upload.
  - Expanded Express body limits to 15MB (`express.json({ limit: "15mb" })`) to support image data payloads.
  - Client-side canvas compression (`compressImage`) automatically downscaling images to max 1400px width at 0.85 JPEG quality (~150KB), ensuring instant mobile loading and zero server rejections.
  - Direct delivery of `bannerConfig` on `getProfile` and `getProfileById` responses so custom banners render immediately across all devices and for visiting peers.
- **Profile Experience & Safety:**
  - "Preferences & Settings" action button integrated into the profile identity card.
  - Explicit Sign Out Confirmation Modal to prevent accidental logout.
  - Collapsible sections for skills, experience items, and project cards.
  - Direct links for GitHub and LinkedIn profiles, and click-to-copy email with toast notification.
- **Mobile Development Host Script:**
  - Added dedicated `pnpm dev:host` (`npm run dev:host`) script to bind Vite to `0.0.0.0` on demand for testing on mobile devices over local Wi-Fi, while keeping `npm run dev` private to `localhost` by default.
- **Academic Email Domain Verification & Interactive Tooltip Badge (`Profile.tsx` & `Badges.tsx`):**
  - **Backend Verification Engine:** Evaluates candidate email against the verified academic domain of their primary `Organization` (`profile.controller.ts`), returning `isVerifiedStudent`, `verificationReason`, `organizationDomain`, and `organizationName`.
  - **Interactive Hover / Click Tooltip Component:** New reusable `VerificationBadge` component displays 🟢 Verified Student (`bg-emerald-50`), 🟡 Unverified Student (`bg-amber-50`), or ⚪ Unaffiliated (`bg-slate-100`) with an interactive card popup detailing email match status, required domain, and institutional context.
- **Pitch-Ready Multi-Campus Database Seeding (`apps/api/prisma/seed.ts`):**
  - **4 Live Clerk Organizations:** Thapar Institute of Engineering and Technology, Patiala (`org_3IHwqmkzEfISGzP4JQGimqIz8WM`), BITS Pilani (`org_3JQVBHND2wFmpI3bj5UDt1RN1Ox`), VIT Vellore (`org_3JQUvvNw3HUuVOdvT0Degv4aUg4`), and IIT Delhi (`org_3JQUuDymGDy0LSpF4pXCbxV6rii`).
  - **14 Sub-Organizers (Clubs & Societies):** ACM TIET, MLSC TIET, OWASP TIET, GDSC TIET, CCS TIET, IEEE BITS, Coding Club BITS, APOGEE Committee, ACM VIT, CSI VIT, IEEE-CS VIT, DevClub IITD, ACM IITD, Tryst Committee.
  - **24 Simulated Students with In-Process Taxonomy Resolution:** Zero LLM cost; canonical taxonomy nodes and provenance evidence are generated in-process via `TaxonomyService.resolveUserTaxonomy`.
  - **20 Hackathons & Tech Events:** 14 campus-scoped events + 6 global inter-university hackathons (ICHL 2026, Global AI Agents Championship, TreeHacks, Cal Hacks, FinTech Frontier, Open Source Founders Weekend).
  - **66 Teams with Deterministic Requirement Taxonomies:** Requirements resolved into canonical graph nodes via `TaxonomyService.resolveTeamRequirements`, activating `BEST`, `GOOD_DIFFERENT_UNIVERSITY`, and `SAME_UNIVERSITY_LOWER_SCORE` recommendation badges.
  - **Interactive Demo State for Presenter (Swastik Nagpal):** Assigned as Lead of *NeuralSync AI Agents* with 2 pending applications (Aarav Sharma & Riya Patel) to review and accept/reject during product pitch.
- **Webhook Organization Cascade Updates (`webhook.controller.ts` & `auth.utils.ts`):**
  - Cascades organization name/metadata updates directly to member `Profile.university` and `Team.university` records upon `organization.updated` and `organization.deleted` events.
  - JIT dynamic profile alignment ensures `Profile.university` remains synchronised with the user's primary organization during API requests.
- **Decoupled Relational Database:**
  - `UserTaxonomy` (1:1 with `User`), `TeamTaxonomy` (1:1 with `Team`), and `UserPreferences` (1:1 with `User`).
  - `Organization`, `OrganizationMembership`, `Organizer`, `OrganizerMember`, and `TeamApplication` models.
  - `Profile` updated with `resumePdfPath`, `resumeOriginalName`, and `lastResumeUploadedAt`.
- **Decoupled Auth:** Clerk webhooks and internal database `cuid()` generation are fully separated using `getOrCreateUserByClerkId`.
- **Type Safety:** `@squadup/shared` package maintains absolute cross-boundary typing for events, teams, applications, organizers, profiles, preferences, and recommendations.

## Client-Side & Frontend Constraints to Note

1. **`isGlobal` Team Application Check:**
   When an event is non-global (`event.isGlobal === false`), the backend rejects applications from users of different institutions with HTTP 403 Forbidden.
   *Future Frontend Guideline:* When rendering team cards, check `team.event.isGlobal`. If false and the user's university does not match the team/event, disable or hide the "Apply" button proactively with a tooltip indicating institutional restriction.
2. **Server-Side Pagination Reset:**
   The frontend should request a new server-filtered page whenever search, university scope, or sort changes, always resetting to `page=1`.

## In Progress

- **First-Time User Onboarding Flow (`apps/web`):**
  - Implementing the guided Onboarding Flow and client-side route guard (`/onboarding`).
  - Implementing the searchable university dropdown mapped to `clerkOrgId`.
  - Implementing the dual profile creation path: Highlighted AI Resume Parsing (recommended primary CTA) vs. Manual Profile Builder.

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


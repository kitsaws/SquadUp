# Project Progress & Handoff State

This document provides a snapshot of the current state of the SquadUp project. It should be updated after significant coding sessions.

## Current Focus

Following the completion of **Task 3: "Create Team" UI & Page Integrations with Dynamic Slot Decrementing**, immediate upcoming focus is **Task 4: Candidate Role-Specific Applications & Matching Triage**.

- **Task 6 / Phase 1: High-Risk Infrastructure & Anti-Pattern Fixes (Completed ✅):**
  - **Prisma Singleton Architecture (`apps/api/src/lib/prisma.ts`):**
    - Established global singleton `PrismaClient` with environment-based logging and hot-reload client caching on `globalThis`.
    - Eliminated database connection pool exhaustion across the backend by replacing all 10 independent `new PrismaClient()` calls (`auth.utils.ts`, `notification.service.ts`, `ai.queue.ts`, `team.controller.ts`, `event.controller.ts`, `organizer.controller.ts`, `profile.controller.ts`, `preferences.controller.ts`, `resume.controller.ts`, `webhook.controller.ts`, `prisma/seed.ts`).
  - **Frontend Shared Utilities & Icon Normalization (`apps/web`):**
    - Created `date.utils.ts` with centralized `formatTimeAgo()` relative timestamp helper.
    - Created `url.utils.ts` with `formatGithubUrl()` and `formatLinkedinUrl()` supporting protocols, `@handle`, and `github.com/...` strings.
    - Created `components/icons/SocialIcons.tsx` with shared SVG `GithubIcon` and `LinkedinIcon`.
    - Cleaned redundant copy-pasted implementations from `Profile.tsx`, `EditProfileModal.tsx`, `TeamDetailPage.tsx`, and `CandidateApplicationTile.tsx`.
  - **Frontend API DTO Deduplication (`apps/web/src/services/api.ts`):**
    - Purged over 280 lines of duplicate interface declarations from `services/api.ts`.
    - Directly imported and re-exported canonical DTOs from `@squadup/shared` (`PaginatedResponse`, `EventItem`, `TeamItem`, `TeamMember`, `TeamRoleItem`, `UserProfileResponse`, `IncomingApplicationItem`, `CandidateApplicationItem`, `TeamInviteItem`, `NotificationDTO`, `UserPreferences`).
    - Reduced `services/api.ts` from 925 lines down to 647 lines with 100% backward compatibility.
  - **Verification & Quality Gate:**
    - Full workspace typecheck (`pnpm typecheck`) passed with 0 errors across `@squadup/shared`, `@squadup/api`, and `@squadup/web`.
    - API test suite (`pnpm test`) passed with 0 errors.
    - Production build (`pnpm build`) transformed 2,011 modules in 4.56s without bundle issues.

- **Task 6 / Phase 3: Frontend Mega-Page & Mega-Modal Modularization (Completed ✅):**
  - **`TeamDetailPage.tsx` Modularization (`apps/web/src/components/team-detail/`):**
    - Reduced from **1,556 lines** down to **~829 lines** (with root orchestrator component).
    - Extracted 6 focused subcomponents:
      - `TeamHero.tsx`: Team banner, recommendation/scope badges, edit team trigger, action buttons (Join, Manage, Leave).
      - `TeamRolesGrid.tsx`: Role cards, vacancy telemetry, optimal best role match indicators, skill tags.
      - `TeamRosterList.tsx`: Active roster members, leader badges, remove member actions.
      - `TeamInvitesSection.tsx`: Pending outbound team invites list with cancel invite triggers.
      - `TeamApplicationsSection.tsx`: Candidate incoming applications with triage actions (Accept, Reject).
      - `TeamCandidateDossier.tsx`: Comprehensive slide-over dossier inspecting applicant verified skills, score ring, academic background, experience, and projects.
  - **`TeamsPage.tsx` Modularization (`apps/web/src/components/teams-page/`):**
    - Reduced from **1,360 lines** down to **~360 lines**.
    - Extracted custom hook and components:
      - `useTeamsFilter.ts`: Encapsulates search debouncing, tier/campus/spots filtering, sorting, SWR caching with `CacheService`, and pagination state.
      - `TeamsFilterBar.tsx`: Search bar, filter popover dropdown, sort menu, and view mode toggle (Cards vs Tiles).
      - `TeamsInspectorDrawer.tsx`: Slide-over inspection drawer with score ring, role breakdowns, and actions.
      - `TeamsPagination.tsx`: Bottom pagination controls.
  - **`CreateTeamModal.tsx` Modularization (`apps/web/src/components/create-team/`):**
    - Reduced from **1,258 lines** down to **~150 lines** orchestrator.
    - Extracted 4 step modules and types:
      - `create-team.types.ts`: Preset templates (`Full-Stack Web App`, `AI / ML Product`, `Mobile App Squad`, `Custom Squad`), interfaces, popular skill suggestions.
      - `StepSelectEvent.tsx`: Dual-mode event selector (locked event banner vs searchable dropdown).
      - `StepTeamDetails.tsx`: Squad name input and 1-click architecture preset cards.
      - `StepRoleBuilder.tsx`: Dynamic role positions builder, slot count stepper, skill tag input, and mandatory leader role selection.
      - `StepInviteMembers.tsx`: Email invite row with custom role select dropdown and pending invites list.
    - Preserved 100% backward compatibility via re-export from `apps/web/src/components/CreateTeamModal.tsx`.
  - **`Profile.tsx` Modularization (`apps/web/src/components/profile/`):**
    - Reduced from **1,128 lines** down to **~410 lines**.
    - Extracted 7 subcomponents:
      - `ProfileHeader.tsx`: Dynamic banner, avatar, student verification badge, name/title, email copy button, social links (GitHub & LinkedIn), resume PDF link, quick action buttons, about bio, and academic background card.
      - `ProfileSquads.tsx`: Active squad memberships and pending candidate applications.
      - `ProfileSkills.tsx`: Verified skills tag grid with collapsible header.
      - `ProfileExperience.tsx`: Engineering work experience with collapsible bullet points and tech tags.
      - `ProfileAchievements.tsx`: Hackathons & honors with award tiers and collapsible descriptions.
      - `ProfileProjects.tsx`: Public projects with collapsible descriptions and tech tags.
      - `SignOutConfirmModal.tsx`: Logout confirmation dialog.
  - **`EditProfileModal.tsx` Modularization (`apps/web/src/components/edit-profile/`):**
    - Reduced from **1,027 lines** down to **~150 lines** orchestrator.
    - Extracted 4 modules:
      - `edit-profile.types.ts`: `BannerConfig`, `GRADIENT_PRESETS`, modal props.
      - `ResumeDropzoneView.tsx`: Drag-and-drop resume PDF upload and background ingestion trigger.
      - `ManualEditForm.tsx`: Direct editing for full name, headline, bio, skills manager, social links, and degree.
      - `BannerCustomizer.tsx`: Live banner preview, preset gradient chips, color/angle pickers, image uploader with automatic compression, and workspace theme synchronization toggle.
    - Preserved 100% backward compatibility via re-export from `apps/web/src/components/EditProfileModal.tsx`.
  - **Verification & Quality Gate:**
    - Full workspace typecheck (`pnpm typecheck`) passed with 0 errors across `@squadup/shared`, `@squadup/api`, and `@squadup/web`.
    - Backend test suite (`pnpm --filter @squadup/api test`) passed with 0 errors.

- **Task 6 / Phase 2: Backend Controller & Service Layer Modularization (Completed ✅):**
  - **Massive Deconstruction of 2,728-Line God Controller (`team.controller.ts`):**
    - Extracted core team business logic into dedicated services in `apps/api/src/services/`:
      - `team.service.ts` (~500 lines): `calculateTeamMaxCapacity`, `listTeams`, `getTeamById`, `createTeam`, `updateTeam`, `deleteTeam`, `leaveTeam`, `removeTeamMember`.
      - `application.service.ts` (~350 lines): `applyToTeam`, `withdrawApplication`, `withdrawApplicationById`, `getMyApplications`, `getIncomingApplications`, `getApplicationById`, `getTeamApplications`, `acceptApplication`, `rejectApplication`.
      - `invite.service.ts` (~250 lines): `sendTeamInvites`, `getMyInvites`, `acceptInvite`, `declineInvite`, `cancelInvite`.
      - `organization.service.ts` (~250 lines): `createOrganization`, `listOrganizations`, `getOrganizationByClerkId`, `selectUniversity`, `createOrganizer`, `listOrganizers`, `getOrganizerById`, `updateOrganizer`, `addOrganizerMember`, `removeOrganizerMember`.
      - `utils/date.utils.ts`: backend timestamp formatting utility.
  - **Domain Controllers Split (`apps/api/src/controllers/`):**
    - `team.controller.ts`: Reduced from **2,728 lines** down to **~230 lines** focusing strictly on team CRUD and member roster operations.
    - `application.controller.ts` (~210 lines): Handles all candidate application queries and reviewer triage.
    - `invite.controller.ts` (~160 lines): Handles team email/notification invites, user invites, accept/decline flows.
    - `recommendation.controller.ts` (~85 lines): Handles squad recommendations with user profile taxonomy analysis.
    - `organization.controller.ts` (~85 lines): Handles University Organizations (`/universities`).
    - `organizer.controller.ts`: Reduced from **565 lines** down to **~180 lines** focusing strictly on Sub-Organizers (Clubs/Societies) while re-exporting university handlers for complete backward compatibility.
  - **Route Updates & Backwards Compatibility:**
    - Updated `apps/api/src/routes/team.routes.ts` and `apps/api/src/routes/application.routes.ts` to cleanly import from modular domain controllers.
    - Preserved 100% backward compatibility for all API endpoint contracts and external imports via re-exports on `team.controller.ts`.
  - **Verification & Quality Gate:**
    - Workspace typecheck (`pnpm typecheck`) passed with 0 errors across `@squadup/shared`, `@squadup/api`, and `@squadup/web`.
    - API test suite (`pnpm test`) passed with 0 errors.
    - Production build (`pnpm build`) passed with 0 errors.

- **Strict Open-Role Capacity Guard in AI Recommendation Engine & UI (Completed):**
  - **Backend Engine & AI Service:**
    - Filtered candidate roles in `recommendation.engine.ts` strictly to open roles (`!r.assigned_to_id && (r.spots === undefined ? true : r.spots > 0)`).
    - Guaranteed that filled roles ($spots \le 0$ or assigned) are never evaluated or recommended as `bestMatchingRole`.
    - Implemented fallback to general team requirement scoring (`bestMatchingRole: null`) when all squad roles are filled.
    - Forwarded `spots` and `assignedToId` in `AIService.getRecommendations` mapping.
    - Added automated parity test suite verifying open vs filled role recommendations.
  - **Frontend UI & Presentation Safeguards:**
    - `SmartRecommendationPanel.tsx`: Added `isBestRoleAvailable` guard to hide the "Optimal Role Match" highlight card if the role is filled or has 0 spots remaining.
    - `TeamDetailPage.tsx`: Added `activeBestMatchingRole` memo to ensure only open roles are highlighted with `⭐ Best Match` or passed to application modals.
    - `TeamsPage.tsx` & `ApplyTeamModal.tsx`: Guarded optimal role banners and pre-selection to open positions.

- **Task 3 — "Create Team" Feature, Interactive Role Builder & Dynamic Slot Decrementing Model (Completed):**
  - **Comprehensive `CreateTeamModal.tsx` Component:**
    - Dual-mode operation: Locked event banner context (when opened from `EventDetailPage`) vs. Searchable fuzzy-filtered event select (when opened from `TeamsPage`).
    - Squad Name input with length validation and instant feedback.
    - 1-Click Architecture Preset Templates (*Full-Stack Web App*, *AI / ML Product*, *Mobile App Squad*, *Custom Squad*) populating pre-configured role positions and skill sets.
    - Interactive Role Builder: Allows adding/removing positions, custom title autocomplete, slot count stepper (min 1, max 8), and tag input with quick-add skill suggestions (`React`, `TypeScript`, `Node.js`, `FastAPI`, `PostgreSQL`, `Docker`, `PyTorch`, `Figma`, etc.).
    - Mandatory Leader Role Selection: Team lead designates their role from the configured roles array; on team creation, their claimed role atomically decrements open spots by 1.
    - Initial Role-Assigned Invites: Enables adding teammate emails with designated role assignments, immediately dispatching in-app alerts and BullMQ background emails upon creation.
  - **Dynamic Slot Decrementing & Capacity Lifecycle Across Modules:**
    - Standardized `spots === 0` full-capacity model across backend API and frontend views.
    - `createTeam`: Persists leader's claimed role with `spots = Math.max(0, initialSpots - 1)` and `assignedToId: leaderUser.id`.
    - `acceptInvite`: Atomically decrements `spots` by 1; when `spots === 0`, marks `assignedToId`.
    - `acceptApplication`: Decrements `spots` by 1 for open roles on the team.
    - `leaveTeam` / `removeTeamMember`: Atomically increments `spots` by 1 (`spots: spots + 1`) and resets `assignedToId: null`, reopening the slot for recruitment.
    - `recommendation.engine.ts`: Evaluates candidate match fit prioritizing open roles (`spots > 0`).
  - **Multi-Page Integrations:**
    - **`EventDetailPage.tsx`**: Added institutional eligibility verification (`isGlobal || profile.university === event.location`) and rendered primary "Start a Squad" CTA in Quick Actions card and empty state.
    - **`TeamsPage.tsx`**: Added prominent "Create Team" primary button in header banner alongside Refresh.
    - **`RoleSelectDropdown.tsx` & `ApplyTeamModal.tsx`**: Filter open roles strictly by `(r.spots ?? 1) > 0`.
    - **`TeamCard.tsx` & `TeamTile.tsx`**: Updated open roles display and capacity telemetry.


- **Task 2 — Role-Based Teammate Invites, Lifecycle Modals, Email Queue & Live Notifications (Completed):**
  - **Relational Notification Database Model & TTL Support:**
    - Created `Notification` model in PostgreSQL (Prisma) with `userId`, `type` (`TEAM_INVITE`, `APPLICATION_RECEIVED`, `APPLICATION_ACCEPTED`, `APPLICATION_REJECTED`, `TEAM_JOINED`, `TEAM_MEMBER_LEFT`, `EVENT_ANNOUNCEMENT`), `title`, `message`, `link`, `data`, `isRead`, and `expiresAt` (TTL auto-expiration).
    - Added database indexes on `[userId, isRead]`, `[userId, createdAt]`, and `[expiresAt]` for high-concurrency feed performance.
    - Updated `TeamInvite` model with `roleId`, `role` (`TeamRole`), `roleTitle`, and `roleSkills` snapshot array.
    - Updated `UserPreferences` with `eventNotifications` toggle.
  - **Redis Pub/Sub & HTTP Server-Sent Events (SSE) Multiplexing:**
    - Created `PubSubService` (`pubsub.service.ts`) managing persistent Redis publisher and subscriber clients with automatic reconnection.
    - Multiplexes per-user channels (`sq:user:<userId>`) and campus-wide broadcast channels (`sq:campus:<orgId>`) into live SSE connections.
    - SSE stream endpoint (`GET /api/notifications/stream`) with Bearer token authentication and 25s keepalive heartbeats.
  - **Comprehensive Notification Service & Lifecycle Integration:**
    - Created `NotificationService` (`notification.service.ts`) honoring user preference guards (`teamInvitesNotification`, `applicationUpdates`, `eventNotifications`).
    - Wired notifications across all squad and event lifecycle events:
      - **Squad Invitation Dispatch** $\to$ `TEAM_INVITE` notification with deep link to candidate modal.
      - **Candidate Application Submission** $\to$ `APPLICATION_RECEIVED` notification sent to squad leader.
      - **Application Accepted** $\to$ `APPLICATION_ACCEPTED` notification with team dossier link.
      - **Application Declined** $\to$ `APPLICATION_REJECTED` notification with `XCircle` styling.
      - **Teammate Accepts Squad Invite** $\to$ `TEAM_JOINED` notification sent to squad leader and sender; atomically claims designated role spot (`assignedToId`).
      - **Teammate Leaves Squad** $\to$ `TEAM_MEMBER_LEFT` notification sent to squad leader; role unassigned (`assignedToId: null`) and marked vacant.
      - **Squad Leader Leaves Squad** $\to$ Leadership transferred to earliest remaining member, new leader receives notification.
      - **Teammate Removed by Leader** $\to$ `TEAM_MEMBER_LEFT` notification sent to removed member; role unassigned.
      - **New College Event Created** $\to$ `EVENT_ANNOUNCEMENT` notification broadcast to all students of that campus organization.
  - **Asynchronous Email Notification Queue (BullMQ & Nodemailer):**
    - Created `email.queue.ts` (`email-tasks` BullMQ queue) and worker processing queued email jobs with retry policies and exponential backoff.
    - Implemented `EmailService` (`email.service.ts`) with Nodemailer SMTP transport for automated team invite emails with dynamic join links.
  - **Robust Cache Invalidation Strategy (`cache.service.ts`):**
    - Implemented pattern-based multi-key invalidation (`invalidateTeam`) scanning and purging `team:<id>*`, `teams:list:*`, `teams:*`, and `events:*` to prevent stale cache entries across user-specific and anonymous views.
    - Reduced `getTeamById` cache TTL to 120s for tight consistency.
  - **Interactive Team Invite Modal (`TeamInviteModal.tsx`) & Role Selection Dropdown (`RoleSelectDropdown.tsx`):**
    - High-aesthetic modal presenting squad title, host event badge, sender name, designated role title, and required technologies & skills with `SkillTag` badges.
    - Dedicated Accept and Decline actions with loading spinners, error handling, and instant navigation.
    - Dropdown with custom option rendering, vacant role filtering, and dynamic badge display.
  - **Squad Dossier Upgrades (`TeamDetailPage.tsx`):**
    - Role selector dropdown in Leader Invite section displaying available spots and technologies for each position.
    - Outgoing pending invitations list with email, assigned role, relative timestamp, and Leader Cancel action.
    - Candidate invitation banner alerting invited users directly when viewing the team, with "Review & Accept Invite" button opening `TeamInviteModal`.
    - Dynamic member card actions showing "Leave Squad" button for active members and occupant badges ("Filled by You" vs "Filled by [Name]").
  - **Global Real-Time Notification Bell, Popover & Floating Toast (`Navbar.tsx` & `NotificationContext.tsx`):**
    - Created `NotificationContext` with fetch-based SSE stream reader supporting Bearer JWT auth, optimistic updates, and toast alerts.
    - Connected Navbar notification bell to live unread badge, popover dropdown with category icons (`Sparkles`, `Calendar`, `CheckCircle2`, `XCircle`, `UserMinus`, `UserCheck`, `Users`), relative timestamps (`formatTimeAgo`), mark single/all as read, and empty state.
    - Added floating real-time SSE toast banner with 1-click navigation and dismiss.
  - **User Preferences Modal Toggle:**
    - Added "Campus Event Announcements" toggle to `UserPreferencesModal.tsx` synchronized with PostgreSQL and `UserPreferences`.

- **Task 1 — TeamRole Model, 151-Node Taxonomy Hierarchy & Role-Based Recommendation Engine (`apps/api`, `apps/web`):**
  - **Relational `TeamRole` Database Model:**
    - Added `TeamRole` in PostgreSQL (Prisma) with 1:N relationship to `Team` (`onDelete: Cascade`), supporting `title`, `skills`, `spots`, `assignedToId`, and pre-resolved `requirementNodeIds`.
    - Synced through Prisma ORM and added to `@squadup/shared` types.
  - **Expanded Single-Parent Taxonomy Hierarchy (151 Nodes):**
    - Expanded `taxonomy_tree.json` to 151 single-parent rooted nodes under `computer_science` domain tree.
    - Preserved single-parent strictness (LCA solvable in microsecond tree traversal) while allowing multi-role concept duplication under distinct subdomains.
    - Updated `TaxonomyResolver.resolveAll()` to support multi-source entity context and automatic duplicate resolution.
  - **Role-Based Pure Taxonomy Recommendation Engine (`recommendation.engine.ts`):**
    - Upgraded recommendation engine to evaluate fit on a per-role basis for teams with configured roles, deriving the candidate's optimal matching role (`bestMatchingRole`).
    - Propagates `roleTitle`, `score`, `fulfilledCount`, `totalCount`, and `skills` to clients.
  - **Deep Structural Explainability & Hierarchy Path Tracing (`explain.ts`, `SmartRecommendationPanel.tsx`):**
    - Enriched explainability engine to explicitly report requirement depth ($L_r$), candidate skill depth ($L_u$), lowest common ancestor intersection node ($L_{lca}$), graph distance $d$, and exact relationship categorization.
    - Integrated visual breadcrumb trace bar in `SmartRecommendationPanel.tsx` with graph distance, relationship badges, and allotted score calculations.
    - Added internal smooth scrolling (`max-h-[calc(100vh-6rem)] overflow-y-auto`) and sticky layout in `SmartRecommendationPanel.tsx`.
  - **Role-Based UI & Badges across Teams Directory & Squad Dossier:**
    - **`TeamCard.tsx` & `TeamTile.tsx`:** Replaced flat requirement tags with **`Roles Needed:`** grid displaying 3-tier color-coded role badges (🟢 Green for perfect match $\ge 85\%$, 🟡 Yellow for partial match $\ge 40\%$, ⚪ Grey for open vacancies) and Leader/Member badges.
    - **`TeamsPage.tsx` (Inspection Drawer):** Upgraded preview drawer with structured `Role : Technologies Needed` cards, `⭐ Recommended Role` badge, and dynamic action footer preventing redundant applications when already a member or leader.
    - **`TeamDetailPage.tsx`:** Upgraded candidate and leader dossiers with structured role technologies, candidate matching indicators, and member/leader action controls.
    - **`ApplyTeamModal.tsx`:** Restricted role selection strictly to configured team roles and highlighted `⭐ Recommended Role`.
  - **Pitch-Ready Multi-Campus Database Reseeding (`prisma/seed.ts`):**
    - Reseeded database with structured `TeamRole` records across 66 teams and 24 users.
    - Recomputed canonical taxonomy nodes and multi-source evidence in-process via `TaxonomyService.resolveUserTaxonomy` and `resolveTeamRoles`.

- **First-Time User Onboarding Flow with Dynamic Navbar Progression (`apps/web`):**
  - **Dynamic Navbar Progression Bar:** Adapts on `/onboarding` to render an animated 2-step progress track (`1. Select Campus` $\to$ `2. Build Profile`) with percentage badges (`50% Complete` $\to$ `Step 2 of 2` $\to$ `Ready`), active step ring accents, and completed step checkmarks.
  - **Step 1 — Searchable University Selector (`UniversitySearchSelect.tsx`):**
    - Live fuzzy search filtering institutions by name, location, and verified email domain.
    - Institutional cards displaying university emblem/logo, location badges, and domain tags (`@thapar.edu`, `@bits-pilani.ac.in`, etc.).
    - Independent / Unaffiliated option for unaffiliated students.
    - Full keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
  - **Institutional Safety Modals (`UniversityReminderModal.tsx`):**
    - **University Confirmation Reminder:** Confirms the student's selected campus and informs them that institutional selection governs campus-only event eligibility.
    - **Independent Warning Modal:** Informs unaffiliated students that they will only have access to Global hackathons and open teams.
  - **Deferred University Backend Commit:** University choice is preserved in local state during Step 1 and atomically committed to the database only when the user finishes onboarding in Step 2.
  - **Step 2 — Dual Profile Creation (`ProfileChoiceCards.tsx`):**
    - **Option A (AI Resume Upload — Primary Recommended CTA):** Prominent gradient styling with "Recommended — Takes 10s" badge, drag-and-drop PDF dropzone (`ResumeDropzone.tsx`), file preview card with remove action, and explicit **"Generate Profile"** button (does not auto-trigger on file drop).
    - **Optimistic Non-Blocking Processing (`ResumeProcessingNotice.tsx`):** Submits to BullMQ (`POST /api/resume/upload`) and provides an immediate "Start Exploring SquadUp" CTA without trapping the user on a loading screen.
    - **Option B (Manual Profile Builder — Secondary Fallback):** Compact modal form (`ManualProfileModal.tsx`, `max-w-lg`) capturing headline, degree, bio, links, and curated skill tag suggestions with instant real-time taxonomy sync (`PATCH /api/profile`).
  - **Onboarding Completed Celebration Modal (`OnboardingCompletedModal.tsx`):**
    - Displays celebration checkmark badge, confirmed university/independent status, and direct navigation buttons to **"Browse Events"** (`/events`) and **"Explore Squads & Teams"** (`/teams`).
  - **Client-Side Route Guarding (`OnboardingGuard.tsx`):** Protects application routes and gracefully redirects incomplete profiles to `/onboarding`. Resolved authentication race conditions using `hasInitialProfileLoaded` and non-forced exit handling.
  - **Backend University Selection Endpoint (`POST /api/organizers/universities/select`):** Atomic backend handler in `organizer.controller.ts` establishing `OrganizationMembership` and `Profile.university`.

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
    - Testing/dev bypass for designated emails via `RATE_LIMIT_BYPASS_EMAILS` and `BYPASS_RESUME_RATE_LIMIT=true`.
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
  - Configured Tailwind CSS v4 `@theme` directive in `styles.css` declaring full semantic design tokens: brand primary & derivatives (`--color-primary-action`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-border`), recommendation tiers (`--color-best-fit*`, `--color-cross-campus*`, `--color-campus-explorer*`), and structural foundations (`--color-canvas`, `--color-surface`, `--color-surface-dim`, `--color-border-main`, `--color-text-main`, `--color-text-muted`).
  - Strict global theme cascading via `PaletteContext` and CSS custom properties on `document.documentElement` (`:root` and `.dark`), eliminating all hardcoded `bg-white`, `text-slate-*`, `border-slate-*`, and per-component `dark:*` overrides across all 28 components and pages.
  - Curated Presets: `SquadUp 2.0 Default`, `Dark Theme` (replaces legacy Midnight preset with automatic dark mode synchronization), `Emerald Focus`, and `High Contrast Slate`.
  - Dynamic runtime color cascading utilizing CSS `color-mix(in srgb, ...)`. Selecting a preset or customizing primary color instantly propagates across buttons, badges, rings, and accents without component re-renders.
  - Zero-error TypeScript compilation across both `apps/web` and `apps/api`.
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
- **Explainable Taxonomy Skill Badges & Score-Based Matching (`apps/web`):**
  - Standardized color-coding across `TeamCard.tsx`, `TeamTile.tsx`, `TeamDetailPage.tsx`, and `SmartRecommendationPanel.tsx`:
    - 🟢 **Green (`score === 1.0`)**: 100% exact taxonomy node match.
    - 🟡 **Yellow (`0 < score < 1.0`)**: Partial / related taxonomy match with explainability details.
    - ⚪ **Gray (`score === 0`)**: Missing requirement.
  - Enabled skill explainability tooltips and details on `TeamDetailPage.tsx` and recommendation panels for all candidates, even when ineligible, enhancing transparency.
- **Squad Leader Access Control & Card Capacity Refinements (`Profile.tsx`, `TeamCard.tsx`, `HomeDashboard.tsx`):**
  - "Manage Team" action button is strictly constrained to squad leaders; non-leaders and visiting peers receive a clean "View Team" navigation link.
  - Normalized team capacity indicators (`members.length / maxCapacity`) across shared card components.
- **Infinite Re-Fetch Loop Resolution & User Context Stabilization (`UserContext.tsx`, `Profile.tsx`):**
  - Eliminated rapid-fire cascading render loops and infinite 304 re-fetch cycles for `/api/profile` and `/api/applications/my-applications`.
  - Removed dynamic object dependency `profile` from `refreshProfile`'s `useCallback` dependency array in `UserContext.tsx`.
  - Scoped `fetchProfileData` in `Profile.tsx` to `[urlId, isOwner]`, decoupling background applications fetching from local state updates.
  - Fixed background resume ingestion listener to strictly fire upon the true-to-false completion transition of `isUploading`.
- **Banner & User Preferences Multi-Tier Caching & Persistence (`profile.controller.ts`, `preferences.controller.ts`, `EditProfileModal.tsx`, `UserPreferencesModal.tsx`):**
  - Joined `UserPreferences` in `profile.controller.ts` `updateProfile` to guarantee `bannerConfig` is preserved when editing bio, headline, or skills.
  - Automatic L1/L2 and Redis cache invalidation (`sq:profile:`, `sq:public_profile:`) upon saving preferences or banners.
  - Isolated color picker and theme options in `UserPreferencesModal.tsx` to prevent application-wide re-renders during slider/wheel interactions, deferring global changes until "Save Preferences" is clicked.
  - Automatic database persistence of theme mode toggles from `Navbar.tsx` and `PaletteContext.tsx` via `PATCH /api/preferences`.
- **Clerk Organization Membership Cloud Synchronization (`auth.utils.ts`, `organizer.controller.ts`, `Onboarding.tsx`):**
  - Implemented `linkUserToOrganization` using Clerk Backend SDK (`clerkClient.organizations.createOrganizationMembership`), automatically provisioning cloud memberships and capturing `clerkMemberId` in PostgreSQL.
  - Integrated `useClerk().setActive({ organization: clerkOrgId })` in `Onboarding.tsx` so Clerk's frontend session and issued JWT tokens recognize the active university organization immediately.
- **Strict Open-Role Capacity Guard for AI Recommendations (`recommendation.engine.ts`, `ai.service.ts`, `SmartRecommendationPanel.tsx`, `TeamDetailPage.tsx`, `TeamsPage.tsx`, `ApplyTeamModal.tsx`):**
  - **Backend Filtering:** Recommendation engine filters role evaluation strictly for open roles (`!r.assigned_to_id && (r.spots === undefined ? true : r.spots > 0)`). Falls back to team-level requirement evaluation when all roles are filled (`bestMatchingRole: null`).
  - **Frontend Safeguards:** Prevents displaying "Optimal Role Match" cards or applying recommended badges to full/closed positions.
- **Squad Dashboard View for All Squad Members & Read-Only Delegation (`TeamDetailPage.tsx`, `team.controller.ts`, `CandidateApplicationTile.tsx`):**
  - **Unified Squad View:** Regular squad members now see the Squad Dashboard layout (telemetry metrics, configured roles, incoming application telemetry, and squad roster).
  - **Mutation Restrictions:** Accept/Decline candidate applications, kicking teammates, and sending or cancelling invitations are restricted strictly to the Squad Leader.
  - **Recommendation Isolation:** The Candidate Recommendation panel and apply flows are restricted exclusively to prospective candidates (non-members and unauthenticated visitors).
- **Squad Roles & Allocations UI with Multi-Slot Member Attribution (`TeamDetailPage.tsx`):**
  - Upgraded the squad roles section into a clear card grid showing Role Title, status badge (`Filled` or `X Open`), member attribution (`Filled by <Name>`) with profile links, and support for listing multiple members assigned to multi-slot roles in the same card.
  - Formatted "TECHNOLOGIES NEEDED" section with rounded technology skill tags.
- **Custom Confirmation Modal Framework (`ConfirmModal.tsx` & `TeamDetailPage.tsx`):**
  - Replaced browser `alert()` and `confirm()` dialogs with styled, accessible modal dialogs supporting multiple variants (`danger`, `warning`, `primary`) and async loading states for leaving squads, removing members, cancelling invites, and withdrawing applications.
- **Organization-Based Campus Eligibility Enforcement (`EventDetailPage.tsx`, `event.controller.ts`, `TeamDetailPage.tsx`):**
  - Replaced free-text university string checks with Clerk `orgId` / `organizationMemberships` verification as the single source of truth for restricted event participation and squad formation eligibility.
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

- **Student Squad Discovery & Event Exploration:**
  - Continued enhancements to team recommendation sorting and application lifecycle notifications.

## Known Issues

- **Windows Prisma Locking:** Running `npx prisma db push` while Next/Vite dev servers are actively holding DLL locks can occasionally throw `EPERM` errors. (Workaround: stop dev server, push schema, restart).

## Next Steps

1. **Team Card Institutional Restriction Tooltip:** Add proactive visual indicators on non-global event team cards when the viewing student's university differs from the team's host institution.
2. **Squad Discovery Filter Enhancements:** Add multi-tag filtering across skills and roles on the `/teams` page.


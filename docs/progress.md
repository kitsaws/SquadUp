# Project Progress & Handoff State

This document provides a snapshot of the current state of the SquadUp project. It should be updated after significant coding sessions.

## Current Focus

The primary focus is completing the **Frontend UI integration** (`apps/web`) to consume the new recommendation endpoint (`POST /api/teams/recommendations`), render candidate teams with visual category badges (`BEST`, `GOOD_DIFFERENT_UNIVERSITY`, `SAME_UNIVERSITY_LOWER_SCORE`), and display interactive LCA explainability decision trees.

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
- **Core API Routes:** 
  - `POST /api/events/create` (Supports global and org-scoped events).
  - `POST /api/teams` (Atomic team creation + automatic `TeamTaxonomy` resolution).
  - `POST /api/teams/recommendations` (Push-down DB filtering + pure taxonomy scoring + categorization).
  - `POST /api/teams/invites/:inviteId/accept`
- **Decoupled Relational Database:**
  - `UserTaxonomy` (1:1 with `User`, storing `taxonomyNodeIds`, `rawSkills`, and `evidence` JSON).
  - `TeamTaxonomy` (1:1 with `Team`, storing `requirementNodeIds` and `rawRequirements`).
  - Removed obsolete vector embeddings from `Profile` and `Team`.
- **Decoupled Auth:** Clerk webhooks and internal database `cuid()` generation are fully separated using the `getOrCreateUserByClerkId` helper.
- **Type Safety:** `@squadup/shared` package maintains absolute cross-boundary typing for recommendation DTOs, evidence items, and categories.

## In Progress

- **Frontend UI (`apps/web`):** The React frontend exists but requires UI components to consume the recommendation API (e.g. Teams directory, category badges, requirement fulfillment progress bars, and expandable LCA decision drawers).
- **Clerk Organization Switcher:** Needs to be embedded in the React frontend Navbar so users can actively switch between universities.

## Not Yet Implemented (Planned)

- **Clerk Webhooks in Production:** Currently, local development relies heavily on the `getOrCreateUserByClerkId` fallback because Clerk webhooks cannot easily hit `localhost` without ngrok. A public endpoint is required for production.

## Known Issues

- **Windows Prisma Locking:** Running `npx prisma db push` while the Next/Vite dev servers are running on Windows can occasionally throw `EPERM` errors because the query engine DLL is locked. (Workaround: Stop the server, push, restart).

## Recent Changes

- Replaced vector embeddings with deterministic 143-node knowledge hierarchy matching.
- Added `UserTaxonomy` and `TeamTaxonomy` decoupled Prisma models and migrated database.
- Implemented V2 multi-source extraction in Python AI service with provenance evidence snippets.
- Implemented User Pre-Scoring Vector optimization for recommendation engine (~10–20ms for 10,000 teams).
- Added `POST /api/teams/recommendations` endpoint with database push-down filtering and 3-category presentation (`BEST`, `GOOD_DIFFERENT_UNIVERSITY`, `SAME_UNIVERSITY_LOWER_SCORE`).
- Created comprehensive technical documentation in `docs/recommendation_system.md`.

## Next Steps

1. **Frontend Recommendations View:** Build React components to call `POST /api/teams/recommendations` and render recommended team cards with category badges and expandable requirement breakdown accordions.
2. **Event Scoping UI:** Allow users to filter teams by event or view global recommendations.


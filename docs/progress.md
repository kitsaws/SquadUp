# Project Progress & Handoff State

This document provides a snapshot of the current state of the SquadUp project. It should be updated after significant coding sessions.

## Current Focus

The primary focus is completing the **Frontend UI integration** and establishing the **Semantic Search Vector Matchmaking**.

## Completed

- **Hybrid Monorepo Infrastructure:** Turborepo configuration successfully runs `web`, `api`, and `ai-service` concurrently.
- **Background Jobs:** Redis and BullMQ are fully operational, gracefully passing large buffers between Node and Python.
- **AI Resume Parsing:** The Python microservice uses `pdfplumber` to extract text and the Groq LLM API to successfully return a strictly typed JSON profile.
- **Core API Routes:** 
  - `POST /api/events/create` (Supports global and org-scoped events).
  - `POST /api/teams` (Wraps team creation and invites in a Prisma transaction).
  - `POST /api/teams/invites/:inviteId/accept`
- **Decoupled Auth:** Clerk webhooks and internal database `cuid()` generation are fully separated using the `getOrCreateUserByClerkId` helper.
- **Database Architecture:** All Prisma schemas are strictly defined, deployed locally, and the `@squadup/shared` package maintains absolute type-safety between the backend and frontend.

## In Progress

- **Frontend UI (`apps/web`):** The React frontend exists but requires UI components to consume the robust backend API (e.g., Event creation forms, Team organization dashboards, and Resume upload interfaces).
- **Clerk Organization Switcher:** Needs to be embedded in the React frontend Navbar so users can actively switch between universities.

## Not Yet Implemented (Planned)

- **Vector Semantic Search:** The database uses `pgvector`, and models have `Unsupported("vector(384)")` fields, but no embedding model (e.g., HuggingFace `all-MiniLM-L6-v2` or OpenAI `text-embedding-3-small`) has been wired up to generate these vectors.
- **Matchmaking Algorithm:** The logic to perform Cosine Similarity searches between a `Profile.embedding` and a `Team.requirementEmbedding`.
- **Clerk Webhooks in Production:** Currently, local development relies heavily on the `getOrCreateUserByClerkId` fallback because Clerk webhooks cannot easily hit `localhost` without ngrok. A public endpoint is required for production.

## Known Issues

- **Windows Prisma Locking:** Running `npx prisma db push` while the Next/Vite dev servers are running on Windows can occasionally throw `EPERM` errors because the query engine DLL is locked. (Workaround: Stop the server, push, restart).

## Recent Changes

- Refactored the entire authentication flow to decouple the `User.id` primary key from the `clerkId`.
- Updated `schema.prisma` to include `orgId` on Teams and Events, enabling Clerk Organization scoping.
- Added `isGlobal` to Events.
- Resolved a critical bug where the internal Postgres `cuid()` was being mistakenly passed to the AI background queue instead of the expected `clerkId`.

## Next Steps

1. **Frontend Integration:** Start building the React frontend pages to interact with `/api/events/create`, `/api/teams`, and `/api/resume/upload`.
2. **Embeddings:** Add a small Python endpoint in the `ai-service` to convert JSON profile summaries into 384-dimensional dense vectors and store them in Postgres.

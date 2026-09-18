# 🤖 Welcome, AI Agent!

If you are a new AI coding agent joining this session, **STOP and read this document first.**

This is **SquadUp**, a professional team-forming and event-hosting platform built specifically for universities, hackathons, and tech events. It uses AI to parse resumes into structured profiles and matches students to squads and specific team roles using an in-memory 151-node canonical knowledge hierarchy.

## 📖 Required Reading Before Proceeding

To avoid breaking existing functionality, you must read the following architectural documents before modifying any application logic, database schemas, or infrastructure:

1. **[PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)**: High-level overview of the tech stack, repository structure, environment variables, and workflows.
2. **[recommendation_system.md](docs/recommendation_system.md)**: Complete guide to the 151-node taxonomy hierarchy, V2 multi-source extraction, role-based matching (`bestMatchingRole`), pure compatibility scoring, and categorization.
3. **[database.md](docs/database.md)**: Detailed breakdown of all 16 PostgreSQL models, Prisma relations, decoupled taxonomy tables, and Clerk authentication decoupling.
4. **[endpoints.md](docs/endpoints.md)**: Complete REST API specification and developer contract for frontend developers.
5. **[next_tasks.md](docs/next_tasks.md)**: Feature roadmap and milestone history.
6. **[cache.md](docs/cache.md)**: Redis L3 distributed caching, frontend multi-tier SWR, cache keys, TTLs, and invalidation rules.
7. **[job_queues.md](docs/job_queues.md)**: BullMQ background queues (`ai-tasks`, `email-tasks`), worker lifecycles, and asynchronous processing.
8. **[decisions.md](docs/decisions.md)**: Architecture Decision Log (ADRs). Read this so you don't undo intentional design choices.

## 🏛️ Source of Truth

- **Database:** `apps/api/prisma/schema.prisma` is the absolute source of truth for data models. Do not guess the schema; inspect this file.
- **Types:** `packages/shared/src/` contains the source of truth for cross-boundary API typings and DTOs.
- **Auth:** Clerk handles authentication. We decoupled our database primary keys (`cuid`) from Clerk IDs. See `database.md` for details on the `clerkId` mapping.

## ⚠️ Critical Constraints & Conventions

1. **Do NOT mutate `id` logic:** Our internal database uses `cuid()` for primary keys, but uses `clerkId` to identify users mapped from Clerk. Never assume `req.auth.userId` matches a Postgres `id`. Always use the helper `getOrCreateUserByClerkId()` in `apps/api/src/utils/auth.utils.ts`.
2. **Never block the event loop with AI or Email tasks:**
   - Resume parsing and AI profile synthesis must always be offloaded to BullMQ (`ai.queue.ts`).
   - Transactional email dispatching must always be offloaded to BullMQ (`email.queue.ts`).
3. **Monorepo Boundaries:** Code shared between frontend and backend MUST go into `@squadup/shared`. Do not duplicate types across apps.
4. **Clerk Organizations & University Scoping:** `Event` and `Team` models are scoped using `orgId` (mapping to a university). Respect the `isGlobal` boolean flag when fetching global vs. organization-scoped data.
5. **Squad Capacity Calculation Rule:** Team capacity is dynamically computed as:
   $$\text{Total Capacity} = \text{members.length} + \sum (\text{role.spots})$$
   Never hardcode or default team capacity to 4 when roles are defined.
6. **Theme & LocalStorage Isolation:** Only the authenticated profile owner (`isOwner === true`) may mutate global theme tokens via `updateToken` or write banner configs to `localStorage`. Viewing public/candidate profiles must never mutate the viewer's theme.

## 📝 Updating Documentation

If you implement a major new feature, change the database schema, or alter a core architecture flow:
1. Update `docs/database.md` if schema changed.
2. Update `docs/endpoints.md` if routes or contracts changed.
3. Update `docs/next_tasks.md` with new milestones.
4. Log any major architectural decisions in `docs/decisions.md`.

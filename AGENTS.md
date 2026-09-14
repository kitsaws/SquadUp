# 🤖 Welcome, AI Agent!

If you are a new AI coding agent joining this session, **STOP and read this document first.**

This is **SquadUp**, a professional team-forming and event-hosting platform built specifically for universities, hackathons, and tech events. It uses AI to parse resumes into structured profiles and eventually match students to teams semantically.

## 📖 Required Reading Before Proceeding

To avoid breaking existing functionality, you must read the following architectural documents before modifying any application logic, database schemas, or infrastructure:

1. **[PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)**: High-level overview of the tech stack, repository structure, and workflows.
2. **[architecture.md](docs/architecture.md)**: Details the hybrid microservice architecture, queues, and request flows.
3. **[decisions.md](docs/decisions.md)**: The Architecture Decision Log. Read this so you don't undo intentional design choices.
4. **[database.md](docs/database.md)**: Details on PostgreSQL, Prisma, decoupled taxonomy models, and the Clerk authentication decoupling.
5. **[recommendation_system.md](docs/recommendation_system.md)**: Complete guide to the 143-node taxonomy hierarchy, V2 multi-source extraction, pure compatibility scoring, and categorization.
6. **[progress.md](docs/progress.md)**: The current state of the project, including completed features and immediate next steps.

## 🏛️ Source of Truth

- **Database:** `apps/api/prisma/schema.prisma` is the absolute source of truth for data models. Do not guess the schema; inspect this file.
- **Types:** `packages/shared/src/` contains the source of truth for cross-boundary API typings.
- **Auth:** Clerk handles authentication. We decoupled our database primary keys (`cuid`) from Clerk IDs. See `database.md` for details on the `clerkId` mapping.

## ⚠️ Critical Constraints & Conventions

1. **Do NOT mutate `id` logic:** Our internal database uses `cuid()` for primary keys, but uses `clerkId` to identify users mapped from Clerk. Never assume `req.auth.userId` matches a Postgres `id`. Always use the helper `getOrCreateUserByClerkId()` in `apps/api/src/utils/auth.utils.ts`.
2. **Never block the event loop with AI tasks:** Resume parsing and AI generation must always be offloaded to BullMQ (`ai.queue.ts`) which forwards it to the Python `ai-service`.
3. **Monorepo Boundaries:** Code shared between frontend and backend MUST go into `@squadup/shared`. Do not duplicate types.
4. **Clerk Organizations:** `Event` and `Team` models are scoped using `orgId` (which maps to a university). Respect the `isGlobal` boolean flag when fetching global vs. organization-scoped data.

## 📝 Updating Documentation

If you implement a major new feature, change the database schema, or alter a core architecture flow:
1. Update `docs/progress.md`.
2. Update `docs/database.md` if schema changed.
3. Log any major architectural decisions in `docs/decisions.md`.

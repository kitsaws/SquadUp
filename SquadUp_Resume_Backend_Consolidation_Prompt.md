# SquadUp 2.0 — Resume-to-Profile Backend Consolidation

You are working on the SquadUp 2.0 repository.

## Important Path Context

- `main/` is the actual current SquadUp project.
- `Prototyping/ResumeToProfile/` is a separate prototype containing the Node.js implementation of Resume → Profile processing.
- The documentation inside `main/` is **UP TO DATE** and represents the current intended architecture and business logic. Treat it as authoritative project context.
- However, before modifying implementation, inspect the relevant source code to understand the exact current state and avoid duplicating or replacing functionality that already exists.

---

# Objective

We are consolidating SquadUp's backend by removing the separate Python `apps/ai-service`.

The original reason for the Python service was the AI/embedding-heavy architecture. The current SquadUp architecture still uses the AI service according to the project documentation, but the recommendation system is now deterministic taxonomy-based and the remaining AI functionality we need is primarily Resume → Profile.

The Node.js ResumeToProfile prototype in:

```text
Prototyping/ResumeToProfile/
```

contains business logic and implementation details that we want to carry into:

```text
main/apps/api/
```

The goal is to integrate that proven Node implementation into the existing SquadUp backend while preserving the current architecture's important properties:

- current Prisma schema
- current API contracts
- Redis
- BullMQ
- asynchronous resume processing
- current profile/taxonomy business logic
- current resume persistence/rate limiting

---

# Core Requirements

## 1. KEEP THE CURRENT DATABASE SCHEMA

The existing Prisma schema in:

```text
main/apps/api/prisma/schema.prisma
```

must remain the source of truth.

Do **not** redesign the Profile/User/UserTaxonomy/TeamTaxonomy schema just to make the migration easier.

The migrated resume parser must produce data compatible with the current schema and existing API contracts.

If the prototype's output structure differs from the current schema, adapt the prototype's business logic to the current schema rather than changing the schema unnecessarily.

---

## 2. KEEP THE EXISTING ASYNCHRONOUS JOB ARCHITECTURE

We explicitly want to retain Redis + BullMQ.

The desired flow is:

```text
Frontend
    ↓
POST /api/resume/upload
    ↓
Resume controller
    ↓
Save PDF + enqueue BullMQ job
    ↓
HTTP 202 + jobId
    ↓
Node BullMQ worker
    ↓
Resume text extraction
    ↓
Groq / LLM call
    ↓
Structured Resume → Profile transformation
    ↓
UserTaxonomy resolution/synchronization
    ↓
PostgreSQL
```

Do **not** turn resume parsing into a synchronous HTTP request.

The API request should not wait for PDF extraction or LLM inference.

The purpose of this migration is to remove the Python service boundary, **not** to remove background processing.

---

# 3. STUDY THE PROTOTYPE BEFORE IMPLEMENTING

Thoroughly inspect:

```text
Prototyping/ResumeToProfile/
```

Understand exactly:

- how the PDF is read
- how text is extracted
- which Node packages/libraries are used
- how extracted text is cleaned/prepared
- how the Groq API is called
- which model/configuration is used
- how prompts are constructed
- how structured output is requested/validated
- how the response is parsed
- how malformed/partial LLM responses are handled
- how errors are handled
- how retries/failures are handled, if present
- how resume sections are transformed into Profile-compatible data
- any helper functions or parsing utilities that contain important business logic

Do **not** merely reproduce the prototype's folder structure.

Carry over the actual useful business logic and implementation approach.

In particular, preserve the prototype's:

- text extraction approach
- parsing libraries/tools
- Groq/backend call mechanism
- prompt/structured-output strategy
- validation/transformation logic
- error handling

while integrating those pieces properly into the existing SquadUp backend.

---

# 4. INSPECT THE CURRENT NODE BACKEND

Before changing anything, inspect the current implementation under:

```text
main/apps/api/
```

Especially:

- resume controller
- resume routes
- BullMQ queue/worker implementation
- Redis configuration
- profile service/controller
- taxonomy services
- Prisma schema
- shared DTO/types
- existing resume status endpoint
- environment configuration
- any existing Groq integration
- any existing AI service abstraction

Understand what is already implemented before replacing anything.

There may already be Node-side logic that should be retained.

---

# 5. REMOVE THE PYTHON SERVICE ONLY AFTER MIGRATION

Once the Resume → Profile functionality has been successfully migrated into Node:

- remove the dependency on `apps/ai-service`
- remove Node → Python HTTP calls
- remove Python-specific environment variables/configuration if they are no longer needed
- remove Python service startup from Turborepo
- remove Python service startup/dependencies from Docker/local development if applicable
- remove obsolete Python-specific queue payloads
- remove dead AI-service client code
- remove obsolete Python-specific dependencies from the Node project if applicable

Do **not** delete anything until you have traced its usages.

Search the entire repository for references to:

- `ai-service`
- Python service URLs
- AI service HTTP clients
- old taxonomy endpoints
- old recommendation service calls
- old resume parsing endpoints
- queue payloads referencing Python
- environment variables used exclusively by the Python service

---

# 6. PRESERVE EXISTING SQUADUP BUSINESS LOGIC

Do not accidentally regress existing behavior such as:

- 24-hour resume upload rate limiting
- developer/test bypass
- local PDF persistence
- resume streaming/view endpoint
- BullMQ job status
- Profile upsert/update behavior
- UserTaxonomy synchronization
- evidence/provenance generation
- current taxonomy structure
- current authentication/user mapping
- current API response contracts

The existing schema and backend behavior should continue to work.

---

# 7. TAXONOMY INTEGRATION

The current SquadUp architecture uses deterministic taxonomy matching rather than embeddings.

The resume parser should therefore ultimately feed the existing Node-side taxonomy pipeline.

Do not reintroduce embeddings.

Do not create a second taxonomy implementation.

Do not duplicate taxonomy resolution logic if it already exists in the Node backend.

Reuse the existing taxonomy resolver/services wherever possible.

---

# 8. PRESERVE API CONTRACTS

Do not unnecessarily change:

```text
POST /api/resume/upload
GET  /api/resume/status/:jobId
GET  /api/resume/view
GET  /api/resume/view/:targetUserId
GET  /api/profile
```

The frontend should ideally require zero changes for this migration.

If a contract genuinely needs to change, explain why before making the change.

---

# 9. ENVIRONMENT VARIABLES

Inspect both:

```text
main/.env.example
Prototyping/ResumeToProfile/.env.example
```

and any relevant configuration files.

Determine which prototype environment variables are actually required.

The final Node implementation should use the appropriate existing SquadUp environment-variable conventions.

Do not hardcode secrets, API keys, service URLs, or model configuration.

If the prototype and main project use different variable names, consolidate them into the existing SquadUp convention.

---

# 10. DO NOT OVERENGINEER

The purpose of this migration is to **SIMPLIFY** the architecture.

Do not replace one unnecessary abstraction with three new abstractions.

The desired result is conceptually:

```text
Express API
    ↓
BullMQ
    ↓
Node worker
    ↓
Resume parser
    ↓
Groq
    ↓
Profile + Taxonomy
```

Keep the implementation modular enough to maintain, but don't create a fake microservice architecture inside the Node application.

---

# 11. DOCUMENTATION AND SOURCE OF TRUTH

The documentation under:

```text
main/docs/
```

is current and should be used as architectural context.

In particular, consult:

- `docs/architecture.md`
- `docs/decisions.md`
- `docs/database.md`
- `docs/endpoints.md`
- `docs/progress.md`
- `docs/recommendation_system.md`

Use the documentation to understand the intended architecture and constraints.

Use the actual source code to determine exact implementation details before editing.

If documentation and implementation appear to disagree, do not immediately assume either is wrong. Investigate the discrepancy and preserve the currently intended architecture unless the source clearly demonstrates that a documented component has already been intentionally replaced.

---

# 12. IMPLEMENTATION PROCESS

## PHASE 1 — AUDIT

Before making code changes, inspect:

```text
main/docs/
main/apps/api/
main/apps/ai-service/
main/apps/web/ relevant resume/profile code
main/packages/shared/
main/apps/api/prisma/schema.prisma
Prototyping/ResumeToProfile/
```

First understand the documented architecture, then trace the actual implementation.

Do **not** modify code during this phase.

Return a concise migration plan covering:

- current documented architecture
- current actual resume-processing flow
- prototype ResumeToProfile flow
- business logic that needs to move
- existing Node functionality to preserve/reuse
- BullMQ integration changes
- dependencies required
- environment variables involved
- files that will be created/modified/deleted
- potential regressions

Do not start a giant speculative refactor.

---

## PHASE 2 — MIGRATION

Implement the smallest clean migration that:

- moves the prototype's useful Resume → Profile business logic into Node
- integrates it with the existing BullMQ worker
- preserves the current Prisma schema
- preserves current API contracts
- reuses existing Node taxonomy logic
- preserves rate limiting and resume persistence
- removes the Python HTTP boundary

---

## PHASE 3 — VERIFICATION

Run the relevant:

- TypeScript typechecks
- tests
- linting if configured
- build
- Prisma/client validation if relevant

Also verify the complete resume flow conceptually:

```text
PDF upload
    ↓
24h rate limit
    ↓
PDF persistence
    ↓
BullMQ enqueue
    ↓
worker
    ↓
PDF text extraction
    ↓
Groq call
    ↓
structured profile
    ↓
Profile persistence
    ↓
UserTaxonomy synchronization
    ↓
job completion/status
```

Make sure failure states do not leave the system in an inconsistent state.

---

## PHASE 4 — CLEANUP

Only after the Node implementation works:

- remove `apps/ai-service`
- remove dead Python integration code
- remove obsolete dependencies/configuration
- update Turborepo configuration
- update Docker/local development configuration if needed
- update environment examples
- update relevant architecture/decision documentation

Do not remove files merely because they "look unused". Verify references first.

---

# 13. DOCUMENTATION UPDATE

Once implementation is complete, update the relevant architecture documentation to reflect the new reality.

In particular, update the architectural decision describing the old:

```text
Hybrid Microservice Architecture (Node + Python)
```

to explain that:

- Python was originally introduced for embedding/ML-heavy workloads
- the recommendation architecture subsequently became deterministic taxonomy-based
- remaining resume AI processing is now handled asynchronously inside the Node backend
- BullMQ/Redis remains the asynchronous boundary
- a separate ML service can be introduced later if genuinely required by future workloads

The documentation should describe the actual implementation while retaining the historical reasoning where useful.

---

# 14. IMPORTANT NON-GOALS

Do **NOT**:

- redesign the Prisma schema
- reintroduce embeddings
- rewrite the recommendation engine
- redesign the taxonomy
- remove BullMQ
- make resume parsing synchronous
- redesign the frontend
- change authentication architecture
- refactor unrelated backend modules
- make broad stylistic changes across the repository
- blindly copy prototype code without adapting it to SquadUp's current architecture

This is a focused architectural consolidation.

---

# FINAL EXPECTED STATE

The final architecture should be:

```text
    ┌───────────────┐
    │ React / Web   │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Node / Express│
    │ API           │
    └───────┬───────┘
            │
            ├───────────────┐
            │               │
            ▼               ▼
       PostgreSQL       Redis/BullMQ
                            │
                            ▼
                       Node Worker
                            │
                            ▼
                     Resume Parser
                            │
                            ▼
                         Groq API
                            │
                            ▼
                   Profile + Taxonomy
```

There should be **NO runtime dependency on**:

```text
main/apps/ai-service
```

after the migration.

Start with **PHASE 1 (audit)**.

Do not make code changes until you have inspected both the current implementation and the prototype and produced the migration plan.

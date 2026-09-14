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

## [Hybrid Microservice Architecture (Node + Python)]

### Decision
The application is split into two backend services: a Node.js Express API and a Python FastAPI service. They communicate asynchronously via a Redis/BullMQ job queue.

### Context
Parsing PDFs (`pdfplumber`) and running complex data science/LLM tasks is significantly easier and more robust in the Python ecosystem. However, Node.js and TypeScript are superior for building fast, type-safe web APIs and managing standard database CRUD.

### Consequences
- **Positive:** The Node event loop is never blocked by heavy CPU-bound tasks like text extraction. The Python service remains stateless and scalable.
- **Negative:** Increased infrastructural complexity. Requires running Redis and maintaining two separate codebases/deployment pipelines.

### Status
Accepted

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

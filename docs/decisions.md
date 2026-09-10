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

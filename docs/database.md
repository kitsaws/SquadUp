# Database Architecture

## Database Technology

SquadUp uses **PostgreSQL**, managed entirely through the **Prisma ORM**.
It utilizes deterministic knowledge hierarchies and decoupled taxonomy join tables for high-performance matchmaking.

## Schema Overview

The absolute source of truth for the database is `apps/api/prisma/schema.prisma`.

### `User`
- **Purpose:** The core identity of a person in the system.
- **Important Fields:**
  - `id`: Internal `cuid()`. The primary key used across all relations.
  - `clerkId`: Unique string mapping to the external Clerk authentication system.
- **Relationships:** Has one `Profile`, has one `UserTaxonomy`, owns many `Event`s, belongs to many `Team`s, sends many `TeamInvite`s.

### `Profile`
- **Purpose:** Stores the AI-parsed resume profile data for a user.
- **Important Fields:**
  - `skills`, `education`, `experience`, `projects`: Rich JSON/Array data extracted from resumes.
- **Relationships:** Belongs to one `User`.

### `UserTaxonomy`
- **Purpose:** Decoupled technical capability and evidence index for recommendations.
- **Important Fields:**
  - `taxonomyNodeIds`: String array of canonical taxonomy node IDs (e.g. `["react", "fastapi", "docker"]`).
  - `rawSkills`: Original input skill strings for auditing.
  - `evidence`: JSON array of `TaxonomyEvidenceItem` capturing source section (`skills`, `projects`, `experience`), concrete snippet text, and aggregated strength weight.
- **Relationships:** 1:1 relation with `User`.

### `Event`
- **Purpose:** Represents a hackathon, university project fair, or global gathering.
- **Important Fields:**
  - `orgId`: An optional Clerk Organization ID. If present, the event is scoped exclusively to members of that organization (e.g., "Stanford University").
  - `isGlobal`: Boolean. If true, overrides `orgId` scoping, allowing anyone to view and join.
- **Relationships:** Has many `Team`s. Organized by one `User`.

### `Team`
- **Purpose:** A group of users forming a squad under a specific event.
- **Important Fields:**
  - `orgId`: Inherited Clerk Organization scoping.
  - `requirements`: String array of requested roles and technologies.
- **Relationships:** Belongs to one `Event`. Has one `TeamTaxonomy`. Has many `TeamMember`s and `TeamInvite`s.

### `TeamTaxonomy`
- **Purpose:** Decoupled technical requirement index for recommendations.
- **Important Fields:**
  - `requirementNodeIds`: String array of canonical requirement node IDs pre-resolved from requirement strings.
  - `rawRequirements`: Original input requirement strings.
- **Relationships:** 1:1 relation with `Team`.

### `TeamMember` & `TeamInvite`
- **Purpose:** Join tables managing team rosters and pending email invitations.

## User/Auth Relationship

A critical architectural pattern in this database is the decoupled Authentication model.

While Clerk manages passwords, OTPs, and issues JWTs, the database **does not use Clerk's ID as a Primary Key or Foreign Key**.

1. An incoming API request provides a JWT containing a Clerk `userId` (e.g., `user_2...`).
2. The API queries `prisma.user.findUnique({ where: { clerkId: userId } })`.
3. The resulting internal Postgres `id` (e.g., `cm0...`) is then used for all subsequent `WHERE` clauses and foreign key relations (such as `Profile.userId` or `Event.organizerId`).

## Migrations

Because Prisma is used, direct SQL migrations are rare.
- During local development, schema changes are applied using `npx prisma db push`.
- The `pgvector` extension must be installed in the Postgres instance. The `docker-compose.yml` file provisions a customized `pgvector/pgvector:pg16` image that has this extension pre-installed.

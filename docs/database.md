# Database Architecture

## Database Technology

SquadUp uses **PostgreSQL**, managed entirely through the **Prisma ORM**.
It utilizes the **`pgvector`** PostgreSQL extension to enable high-performance vector similarity search for future AI matchmaking features.

## Schema Overview

The absolute source of truth for the database is `apps/api/prisma/schema.prisma`.

### `User`
- **Purpose:** The core identity of a person in the system.
- **Important Fields:**
  - `id`: Internal `cuid()`. The primary key used across all relations.
  - `clerkId`: Unique string mapping to the external Clerk authentication system.
- **Relationships:** Has one `Profile`, owns many `Event`s, belongs to many `Team`s, sends many `TeamInvite`s.

### `Profile`
- **Purpose:** Stores the AI-parsed resume data and semantic embeddings for a user.
- **Important Fields:**
  - `skills`, `education`, `experience`, `projects`: Rich JSON/Array data extracted from resumes.
  - `embedding`: An `Unsupported("vector(384)")` field used by `pgvector` to store the semantic representation of the profile.
- **Relationships:** Belongs to one `User`.

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
  - `requirementEmbedding`: Vector representation of what the team is looking for (e.g. "React Developer").
- **Relationships:** Belongs to one `Event`. Has many `TeamMember`s and `TeamInvite`s.

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

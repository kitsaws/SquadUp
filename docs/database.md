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
- **Relationships:** Has one `Profile`, has one `UserTaxonomy`, has one `UserPreferences`, owns many `Event`s, belongs to many `Team`s, sends many `TeamInvite`s, owns `Organizer` profiles, holds `OrganizerMember` and `OrganizationMembership` memberships, and submits `TeamApplication`s.

### `Profile`
- **Purpose:** Stores the AI-parsed resume profile data for a user.
- **Important Fields:**
  - `skills`, `education`, `experience`, `projects`: Rich JSON/Array data extracted from resumes.
  - `university`: Name of the user's university (auto-synchronized via Clerk webhooks).
  - `resumePdfPath`: Path to the stored PDF file on disk.
  - `resumeOriginalName`: Original filename of the uploaded resume.
  - `lastResumeUploadedAt`: Timestamp of the most recent resume upload (for 24h cooldown).
- **Relationships:** Belongs to one `User`.

### `UserTaxonomy`
- **Purpose:** Decoupled technical capability and evidence index for recommendations.
- **Important Fields:**
  - `taxonomyNodeIds`: String array of canonical taxonomy node IDs (e.g. `["react", "fastapi", "docker"]`).
  - `rawSkills`: Original input skill strings for auditing.
  - `evidence`: JSON array of `TaxonomyEvidenceItem` capturing source section (`skills`, `projects`, `experience`), concrete snippet text, and aggregated strength weight.
- **Relationships:** 1:1 relation with `User`.

### `UserPreferences`
- **Purpose:** Stores user-specific customization, theme settings, notification configurations, and default matching preferences.
- **Important Fields:**
  - `themeMode`: Interface mode (`"light"` | `"dark"` | `"system"`).
  - `palettePreset`: Active color palette preset (`"default"` | `"midnight"` | `"emerald"` | `"slate"` | `"custom"`).
  - `primaryColor`: Optional custom brand hex override (e.g. `"#2563eb"`).
  - `bannerConfig`: Rich JSON object storing `{ type: "gradient" | "image" | "default", gradient?: { color1, color2, angle }, imageUrl?: string, syncTheme: boolean }`.
  - `emailNotifications`, `teamInvitesNotification`, `applicationUpdates`, `marketingEmails`: Granular boolean notification toggles.
  - `defaultCampusOnly`: Boolean setting to pre-filter squad searches to the user's university.
  - `openToCollaboration`: Boolean availability flag for squad recruiters.
  - `preferredRoles`: String array of preferred role tags (e.g. `["Frontend", "AI / ML"]`).
- **Relationships:** 1:1 relation with `User` (`onDelete: Cascade`).

### `Organization` (University)
- **Purpose:** Represents an academic institution / university mapped to a Clerk Organization.
- **Important Fields:**
  - `clerkOrgId`: Unique string matching the Clerk Organization ID (e.g., `org_stanford`).
  - `name`: e.g. "Stanford University".
  - `slug`: Unique lowercase slug (e.g. `stanford`).
  - `domain`: University email domain (e.g. `stanford.edu`).
- **Relationships:** Has many `Organizer` profiles (clubs/societies), `OrganizationMembership` members, `Event`s, and `Team`s.

### `OrganizationMembership`
- **Purpose:** Tracks a user's verified university affiliation and role in an `Organization`.
- **Important Fields:**
  - `clerkMemberId`: Unique Clerk membership ID (e.g. `orgmem_...`).
  - `organizationId`: Foreign key to internal `Organization`.
  - `userId`: Foreign key to internal `User`.
  - `role`: Role string (`org:admin`, `org:member`).
- **Relationships:** Cascade-deleted when parent `Organization` or `User` is deleted. Synchronizes with `Profile.university`.

### `Organizer` (University Sub-Organizers / Clubs / Societies)
- **Purpose:** Represents student clubs, societies, or event-hosting committees (e.g., "ACM at UCLA", "HackSC Organizing Committee").
- **Important Fields:**
  - `name`: Club name.
  - `slug`: Unique slug.
  - `orgId`: Optional Clerk Organization link (University).
  - `ownerId`: The User who created the club.
- **Relationships:** Belongs to `Organization` (optional), owned by `User`, has many `OrganizerMember`s and `Event`s.

### `OrganizerMember`
- **Purpose:** Role-based membership join table for sub-organizers.
- **Important Fields:**
  - `role`: "ADMIN" | "MEMBER". Admins have full rights to manage events and member rosters for this entity.

### `Event`
- **Purpose:** Represents a hackathon, university project fair, or global gathering.
- **Important Fields:**
  - `organizerId`: Contact lead User.
  - `organizerProfileId`: Optional link to `Organizer` (club/society).
  - `orgId`: An optional Clerk Organization ID (university scoping).
  - `isGlobal`: Boolean. If true, overrides `orgId` scoping, allowing anyone to view and join.
- **Relationships:** Has many `Team`s. Organized by one `User`, optionally associated with one `Organizer` and `Organization`.

### `Team`
- **Purpose:** A group of users forming a squad under a specific event.
- **Important Fields:**
  - `orgId`: Inherited Clerk Organization scoping.
  - `requirements`: String array of requested roles and technologies.
  - `university`: Optional university affiliation.
- **Relationships:** Belongs to one `Event`. Has one `TeamTaxonomy`. Has many `TeamMember`s, `TeamInvite`s, and `TeamApplication`s.

### `TeamTaxonomy`
- **Purpose:** Decoupled technical requirement index for recommendations.
- **Important Fields:**
  - `requirementNodeIds`: String array of canonical requirement node IDs pre-resolved from requirement strings.
  - `rawRequirements`: Original input requirement strings.
- **Relationships:** 1:1 relation with `Team`.

### `TeamMember` & `TeamInvite`
- **Purpose:** Join tables managing team rosters and pending email invitations.

### `TeamApplication`
- **Purpose:** Join table managing candidate join requests for teams.
- **Important Fields:**
  - `status`: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN".
  - `message`: Optional application note.
- **Relationships:** Join between `Team` and `User`.

## User/Auth Relationship

A critical architectural pattern in this database is the decoupled Authentication model.

While Clerk manages passwords, OTPs, and issues JWTs, the database **does not use Clerk's ID as a Primary Key or Foreign Key**.

1. An incoming API request provides a JWT containing a Clerk `userId` (e.g., `user_2...`).
2. The API queries `prisma.user.findUnique({ where: { clerkId: userId } })`.
3. The resulting internal Postgres `id` (e.g., `cm0...`) is then used for all subsequent `WHERE` clauses and foreign key relations.

## Migrations

Because Prisma is used, direct SQL migrations are rare.
- During local development, schema changes are applied using `npx prisma db push`.
- The `pgvector` extension must be installed in the Postgres instance. The `docker-compose.yml` file provisions a customized `pgvector/pgvector:pg16` image that has this extension pre-installed.

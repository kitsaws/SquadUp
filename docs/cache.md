# ⚡ SquadUp Caching Architecture & Reference Guide

This document is the **authoritative reference** for all caching mechanisms within SquadUp across the backend (Redis L3) and frontend (L1 Memory + L2 Web Storage with SWR). 

Agents modifying data mutations, queries, or performance flows **must** follow the patterns and key schemes documented here.

---

## 📂 Core Files

| Scope | File | Description |
| :--- | :--- | :--- |
| **Backend Core** | `apps/api/src/services/cache.service.ts` | Centralized Redis `CacheService` with helpers for get, set, del, pattern scan, team invalidation, and dynamic TTL computation. |
| **Backend Controllers** | `apps/api/src/controllers/team.controller.ts` | Team queries (list + detail) with user-scoped keys and team mutation invalidations. |
| | `apps/api/src/controllers/event.controller.ts` | Event queries (list + detail) with dynamic event date TTLs and event mutation invalidations. |
| | `apps/api/src/controllers/profile.controller.ts` | User profile & public profile caching (30 min TTL). |
| | `apps/api/src/controllers/webhook.controller.ts` | Clerk Webhooks: Global cache flushing on user or organization changes. |
| | `apps/api/src/queues/ai.queue.ts` | Cache invalidation upon async AI profile synthesis completion. |
| **Frontend Core** | `apps/web/src/services/cache.service.ts` | Multi-tier client cache (L1 Memory Map + L2 LocalStorage/SessionStorage) with Stale-While-Revalidate (SWR). |
| **Frontend Consumers** | `apps/web/src/services/api.ts` | Client API layer implementing SWR caching and client-side prefix invalidations. |
| | `apps/web/src/pages/TeamsPage.tsx` | SWR instantaneous paint from session cache for team discovery. |
| | `apps/web/src/contexts/UserContext.tsx` | Synchronous initial render hydration from client profile cache. |

---

## 1. 🏗️ Backend Redis Cache Architecture

SquadUp uses [ioredis](https://github.com/redis/ioredis) via a shared client configured in `apps/api/src/services/cache.service.ts`.

### Redis Key Topologies & TTL Specifications

| Key Pattern | Scope | Purpose | TTL | Invalidation Triggers |
| :--- | :--- | :--- | :--- | :--- |
| `team:${teamId}:${callerDbId}` (Member/Leader) | Per-User | Single team details formatted for an active squad member or leader (includes private member details & status). | 600s (10 min) | Any team mutation (edit, delete, member add/remove/leave, invite accept/decline/cancel, application accept/reject/withdraw). |
| `team:${teamId}:${callerDbId}` (Non-Member) | Per-User | Single team details for authenticated prospective applicant / non-member viewer. | 1800s (30 min) | Any team mutation. |
| `team:${teamId}:anon` | Public | Single team details for unauthenticated / anonymous viewers. | 1800s (30 min) | Any team mutation. |
| `teams:list:${JSON.stringify(filterParams)}` | Query-Scoped | Paginated, filtered, and sorted team discovery lists (page, limit, eventId, search, campus, tier, openSpotsOnly, sort). | 300s (5 min) | Any team creation, update, deletion, member change, or application acceptance. |
| `event:${eventId}` | Entity | Single event details. | **Dynamic** (Formula: `(eventDate + 3d) - now`, min 300s, max 14d) | Event updates or deletions (`event.controller.ts`). |
| `events:list:${page}:${limit}:${search}:${type}:${status}:${campus}` | Query-Scoped | Paginated and filtered event listing. | 300s (5 min) | Event creation, update, or deletion. |
| `profile:${userId}` | Per-User | Full private profile for authenticated user. | 1800s (30 min) | Profile updates (`profile.controller.ts`) or AI resume processing (`ai.queue.ts`). |
| `public_profile:${userId}` | Public | Sanitized public profile for team member inspection. | 1800s (30 min) | Profile updates or AI resume processing. |

---

## 2. 🧹 Backend Invalidation Strategy & Helper Methods

Because team detail keys are scoped per user (`team:${id}:${callerDbId}` and `team:${id}:anon`), simple `redis.del("team:${id}")` **will fail** to clear user-specific caches.

Always use the standardized helper methods in `CacheService`:

```typescript
import { CacheService } from "../services/cache.service.js";

// 1. Invalidate a specific team and its related listings across all viewers:
await CacheService.invalidateTeam(teamId);

// 2. Invalidate all team & event caches (e.g. in webhooks or global org updates):
await CacheService.invalidateAllTeams();

// 3. Invalidate a single key:
await CacheService.del(`profile:${userId}`);

// 4. Invalidate keys by pattern (uses SCAN to avoid blocking Redis):
await CacheService.invalidatePattern("events:list:*");
```

### What `CacheService.invalidateTeam(teamId)` Executes

When `CacheService.invalidateTeam(teamId)` is called, it concurrently purges:
1. `team:${teamId}` (exact key)
2. `team:${teamId}*` (scans and removes all per-user and anonymous snapshots)
3. `team:${teamId}:*`
4. `teams:list:*` (all paginated team query listings)
5. `teams:*`
6. `events:*` (event listings and squad telemetry)

### What `CacheService.invalidateProfile(userId?: string, clerkId?: string)` Executes

When `CacheService.invalidateProfile(userId, clerkId)` is called with a specific user's identifiers, it **strictly isolates** invalidation to that user without flushing other users' cached data:
1. `profile:${userId}` and `profile:${clerkId}` (exact user profile keys)
2. `public_profile:${userId}` and `public_profile:${clerkId}` (exact public profile keys)
3. Cursor-based SCAN deletion of `profile:${userId}*`, `profile:${clerkId}*`, `public_profile:${userId}*`, and `public_profile:${clerkId}*`
4. Cursor-based SCAN deletion of `recs:${userId}*`, `recs:${clerkId}*`, `recommendations:${userId}*`, and `recommendations:${clerkId}*`

> **Note on Scope Isolation:** Global invalidation (`profile:*`, `public_profile:*`, `recs:*`) is **only** executed when `CacheService.invalidateProfile()` is called with no arguments (e.g. system-wide maintenance or tests). Supplying a user ID never evicts unrelated profiles.

### Membership & Squad Lifecycle Invalidation Matrix

| User Action | Backend Trigger | Cache Invalidation Executed | Strategy |
| :--- | :--- | :--- | :--- |
| **Direct Profile Edit** | `profile.controller.ts` (`PATCH /api/profile`) | `CacheService.invalidateProfile(userId, clerkId)` + Redis warm | **Returns Canonical Profile** (L1/L2 & `UserContext` updated directly) |
| **Select University** | `organization.controller.ts` (`POST /api/organizers/universities/select`) | `CacheService.invalidateProfile(userId, clerkId)` | **Returns Canonical Profile** (L1/L2 & `UserContext` updated directly) |
| **Sync Clerk Data** | `profile.controller.ts` (`POST /api/profile/sync-clerk`) | `CacheService.invalidateProfile(userId, clerkId)` + Redis warm | **Returns Canonical Profile** |
| **Resume Parsed (BullMQ)** | `ai.queue.ts` (`aiWorker.process`) | `CacheService.invalidateProfile(userId, clerkId)` | Invalidation triggers frontend debounced revalidation |
| **Create Team** | `TeamService.createTeam` | `CacheService.invalidateTeam(teamId)` + `CacheService.invalidateProfile(creatorId)` | Invalidate + Revalidate |
| **Delete / Dissolve Team** | `TeamService.deleteTeam` | `CacheService.invalidateTeam(teamId)` + `CacheService.invalidateProfile` for all members | Invalidate + Revalidate |
| **Leave Team** | `TeamService.leaveTeam` | `CacheService.invalidateTeam(teamId)` + `CacheService.invalidateProfile` for departing user and new leader | Invalidate + Revalidate |
| **Remove Member** | `TeamService.removeTeamMember` | `CacheService.invalidateTeam(teamId)` + `CacheService.invalidateProfile` for removed user and leader | Invalidate + Revalidate |
| **User Deletion (Webhook)** | `TeamService.handleUserDeletion` | `CacheService.invalidateTeam` + `CacheService.invalidateProfile` for deleted user and new leader | Invalidate + Revalidate |
| **Accept Application** | `ApplicationService.acceptApplication` | `CacheService.invalidateTeam(teamId)` + `CacheService.invalidateProfile` for candidate & reviewer | Invalidate + Revalidate |
| **Accept Invite** | `InviteService.acceptInvite` | `CacheService.invalidateTeam(teamId)` + `CacheService.invalidateProfile(userId)` | Invalidate + Revalidate |
| **Org / Membership Webhook**| `webhook.controller.ts` (`org.updated`, `membership.created/updated/deleted`) | `CacheService.invalidateProfile(userId, clerkId)` for affected members | Invalidate + Revalidate |

---

## 3. 🖥️ Frontend Multi-Tier & SWR Caching

`apps/web/src/services/cache.service.ts` provides a hybrid client cache designed for zero-latency UI transitions and instant page rendering.

### Multi-Tier Architecture & Responsibilities

- **L1 (In-Memory `Map`)**: Sub-millisecond synchronous lookups within the active browser session. Holds hot profiles, team details, and query results.
- **L2 (Web Storage)**: Persistent client storage.
  - `localStorage`: Used for `sq:profile:${clerkId}`, `sq:profile:${userId}`, and `sq:profile:active_user` (30 min TTL) for instant hydration on page refresh before Clerk auth completes.
  - `sessionStorage`: Used for `sq:public_profile:${userId}` (5 min TTL) and `sq:teams:list:*` (2 min TTL) for smooth navigation.
- **L3 (Redis)**: Distributed cache across instances (`profile:${dbId}`, 30 min TTL; `team:${id}:${viewerId}`, 10-30 min TTL).

### Setting a Profile vs. Invalidating a Profile

SquadUp distinguishes between two explicit cache operations on the frontend:

1. **Set Active Profile (`CacheService.setProfile(profile: UserProfileResponse)`)**:
   - Used when a mutation returns a complete canonical profile (e.g. `updateProfile`, `selectUniversity`).
   - Populates L1 and L2 under `sq:profile:${clerkId}`, `sq:profile:${userId}`, and `sq:profile:active_user`.
   - Clears dependent recommendation (`sq:recs:`) and team (`sq:teams:`) caches.
   - Emits an `onProfileUpdate` event to subscribed listeners (`UserContext`) to update React state with **zero latency** and no additional network requests.

2. **Invalidate Profile (`CacheService.invalidateProfile(userScope?: string)`)**:
   - Used when profile data is stale but a complete canonical profile is not yet available in the client (e.g. background resume job completion, team membership changes).
   - Purges matching keys from L1 and L2.
   - Emits an `onProfileInvalidated(userScope)` event to subscribed listeners (`UserContext`).

### React Synchronization & Event Bridge (`UserContext`)

`UserContext` subscribes to both `CacheService` events with resilient safeguards:
- **Instant Update (`onProfileUpdate`)**: When a canonical profile arrives, `UserContext` updates its state immediately if the profile matches the signed-in user.
- **Debounced Revalidation (`onProfileInvalidated`)**: When an invalidation occurs:
  - Scope is checked: invalidating an unrelated candidate's public profile does **not** trigger a refetch of the active user's profile.
  - Revalidation calls are **debounced by 100ms** to coalesce rapid successive events into a single `GET /api/profile?bypassCache=true`.
  - In-flight requests are **deduplicated** via `inFlightRefreshRef`.
  - Stale responses are prevented from overwriting newer state via `lastFetchedAtRef` timestamp tracking.

### Frontend Cache Keys & Storage Targets

| Frontend Key | Storage Type | TTL | Purpose |
| :--- | :--- | :--- | :--- |
| `sq:profile:${clerkId}` | `localStorage` | 30 Minutes | Canonical profile keyed by Clerk User ID. Instant hydration on reload. |
| `sq:profile:${userId}` | `localStorage` | 30 Minutes | Canonical profile keyed by internal PostgreSQL CUID. |
| `sq:profile:active_user` | `localStorage` | 30 Minutes | Fallback key for active authenticated user. |
| `sq:public_profile:${userId}` | `sessionStorage` | 5 Minutes | Candidate & teammate profile modal inspections. |
| `sq:teams:list:${params}` | `sessionStorage` | 2 Minutes | Instant back-navigation and filter switching on `/teams`. |
| `sq:recs:${userScope}` | `sessionStorage` | 15 Minutes | AI Team Recommendations list. |

### Frontend Invalidation Pattern in `api.ts`

When any mutating API method executes in `apps/web/src/services/api.ts`, client caches must be invalidated before returning to the UI:

```typescript
removeMember: async (teamId: string, userId: string): Promise<{ message: string }> => {
  const res = await request<{ message: string }>(`/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
  });
  
  // Flush frontend SWR snapshots
  CacheService.invalidatePrefix("sq:teams:");
  CacheService.invalidatePrefix("sq:recs:");
  
  return res;
}
```

---

## 4. ⚠️ Developer Rules & Constraints

1. **Never use exact `del("team:${id}")`:** Because team responses differ based on the viewer's role (`isLeader`, `isMember`), cache keys have caller suffixes (`team:<id>:<callerId>`). Always use `CacheService.invalidateTeam(id)`.
2. **Never block on `SCAN` loops:** `CacheService.invalidatePattern` uses non-blocking cursor scans (`COUNT 100`) rather than dangerous `KEYS *` commands.
3. **Handle Redis Connection Failures Gracefully:** `CacheService` catches Redis connectivity errors silently and allows queries to fall back to the PostgreSQL database without crashing the Express server.
4. **Invalidate in Queues:** When background workers update user or team records (e.g. `aiWorker` updating `Profile` and `UserTaxonomy`), they must explicitly invalidate the corresponding cache keys (`CacheService.del(\`profile:${userInDb.id}\`)`).

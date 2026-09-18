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
| | `apps/api/src/controllers/profile.controller.ts` | User profile & public profile caching (5 min TTL). |
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
| `team:${teamId}:${callerDbId}` | Per-User | Single team details formatted for an authenticated viewer (includes viewer's `isLeader`, `isMember`). | 120s (2 min) | Any team mutation (edit, delete, member add/remove/leave, invite accept/decline/cancel, application accept/reject/withdraw). |
| `team:${teamId}:anon` | Public | Single team details for unauthenticated / anonymous viewers. | 120s (2 min) | Any team mutation. |
| `teams:list:${JSON.stringify(filterParams)}` | Query-Scoped | Paginated, filtered, and sorted team discovery lists (page, limit, eventId, search, campus, tier, openSpotsOnly, sort). | 120s (2 min) | Any team creation, update, deletion, member change, or application acceptance. |
| `event:${eventId}` | Entity | Single event details. | **Dynamic** (Formula: `(eventDate + 3d) - now`, min 300s, max 14d) | Event updates or deletions (`event.controller.ts`). |
| `events:list:${page}:${limit}:${search}:${type}:${status}:${campus}` | Query-Scoped | Paginated and filtered event listing. | 300s (5 min) | Event creation, update, or deletion. |
| `profile:${userId}` | Per-User | Full private profile for authenticated user. | 300s (5 min) | Profile updates (`profile.controller.ts`) or AI resume processing (`ai.queue.ts`). |
| `public_profile:${userId}` | Public | Sanitized public profile for team member inspection. | 300s (5 min) | Profile updates or AI resume processing. |

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

### Standard Team Mutation Pattern

Whenever creating an endpoint that modifies team state in `apps/api/src/controllers/team.controller.ts`, always invoke `CacheService.invalidateTeam(...)` right after database writes:

```typescript
// Example: removing a member, leaving a team, or accepting an invite
await prisma.teamMember.delete({ where: { id: targetMember.id } });

// Correct Cache Invalidation:
await CacheService.invalidateTeam(teamId);
```

---

## 3. 🖥️ Frontend Multi-Tier & SWR Caching

`apps/web/src/services/cache.service.ts` provides a hybrid client cache designed for zero-latency UI transitions and instant page rendering.

### Multi-Tier Architecture

```
User Action / Navigation
         │
         ▼
┌──────────────────┐
│ L1: Memory Map   │ ──(Fresh Hit)──────► Return Instant Data (< 1ms)
└────────┬─────────┘
         │ (Miss or Expired)
         ▼
┌──────────────────┐
│ L2: Web Storage  │ ──(Fresh Hit)──────► Warm L1 & Return Instant Data (< 5ms)
│ (Local / Session)│
└────────┬─────────┘
         │ (Stale Hit or Miss)
         ▼
┌──────────────────┐
│ SWR Strategy     │ ──(Stale Hit)──────► Return Stale Data immediately,
│                  │                      fire background fetcher,
│                  │                      notify onBackgroundUpdate
└────────┬─────────┘
         │ (Total Miss)
         ▼
┌──────────────────┐
│ Backend API Call │ ──(Awaited)────────► Populate L1 & L2, return fresh data
└──────────────────┘
```

### Frontend Cache Keys & Storage Targets

| Frontend Key | Storage Type | TTL | Purpose |
| :--- | :--- | :--- | :--- |
| `sq:profile:${userId}` | `localStorage` | 24 Hours | Instant profile hydration on page reload before Clerk session check finishes. |
| `sq:public_profile:${userId}` | `sessionStorage` | 15 Minutes | Candidate & teammate profile modal inspections. |
| `sq:teams:list:${params}` | `sessionStorage` | 2 Minutes | Instant back-navigation and filter switching on `/teams`. |
| `sq:recs:${userScope}` | `sessionStorage` | 15 Minutes | AI Team Recommendations list. |
| `sq:events:popular` | `sessionStorage` | 15 Minutes | Home dashboard event highlights. |

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

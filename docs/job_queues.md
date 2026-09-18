# ⚙️ SquadUp Job Queues Architecture & Reference Guide

This document is the **authoritative reference** for all asynchronous background processing, queue topologies, BullMQ workers, and job execution lifecycles in SquadUp.

Agents adding background tasks or modifying asynchronous workers **must** follow the queue structures and connection conventions documented here.

---

## 📂 Core Files

| Scope | File | Description |
| :--- | :--- | :--- |
| **AI Task Queue** | `apps/api/src/queues/ai.queue.ts` | BullMQ Queue & Worker for async resume parsing (Gemini 2.5 Flash), profile extraction, and V2 taxonomy auto-tagging. |
| **Email Task Queue** | `apps/api/src/queues/email.queue.ts` | BullMQ Queue & Worker for transactional email dispatches (team invitations) via Nodemailer. |
| **Email Service** | `apps/api/src/services/email.service.ts` | HTML email template engine and SMTP transport handler. |
| **AI Python Microservice** | `apps/api/src/services/ai.service.ts` | HTTP client communicating with Python FastAPI / Google Gemini 2.5 Flash parser. |
| **Shared Types** | `packages/shared/src/index.ts` | Type definitions for queue job payloads (`ParseResumeJobData`, `TeamInvitationEmailPayload`). |
| **Server Bootstrap** | `apps/api/src/index.ts` | Express server startup that spins up workers alongside the HTTP listener. |

---

## 1. 🏗️ Queue Architecture Overview

SquadUp uses [BullMQ](https://docs.bullmq.io/) backed by Redis to offload heavy computation, external API calls, and email I/O from the main Express HTTP event loop.

```
                  ┌───────────────────────────────┐
                  │    Express HTTP Controller    │
                  └──────────────┬────────────────┘
                                 │ Enqueue Job
                                 ▼
                     ┌───────────────────────┐
                     │   Redis (BullMQ Queue)│
                     └───────────┬───────────┘
                                 │ Pulls Job
        ┌────────────────────────┴────────────────────────┐
        ▼                                                 ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│     Queue: "ai-tasks"         │         │    Queue: "email-tasks"       │
│  Worker: `aiWorker`           │         │  Worker: `emailWorker`        │
├───────────────────────────────┤         ├───────────────────────────────┤
│ • Resume PDF/DOCX Parsing     │         │ • Team Invitation Emails      │
│ • Google Gemini 2.5 Flash     │         │ • Responsive HTML Rendering   │
│ • Multi-Source Taxonomy Tagging│        │ • SMTP Non-blocking Delivery  │
│ • Profile & UserTaxonomy DB   │         │ • Exponential Backoff Retries │
│ • Profile Cache Invalidation  │         │ • Concurrency: 5              │
└───────────────────────────────┘         └───────────────────────────────┘
```

---

## 2. 🤖 Queue 1: `ai-tasks` (Resume & Profile Synthesis)

Defined in: `apps/api/src/queues/ai.queue.ts`

### Queue Details
- **Queue Name:** `ai-tasks`
- **Trigger:** When a user uploads a resume file via `POST /api/profile/resume`.
- **Payload (`ParseResumeJobData`):**
  ```typescript
  export interface ParseResumeJobData {
    userId: string;       // Clerk User ID
    fileBuffer: string;   // Base64-encoded resume buffer
    filename: string;     // Original filename (e.g., "resume.pdf")
  }
  ```

### Processing Pipeline
1. **Base64 Decode:** Reconstructs the binary buffer from the base64 job payload.
2. **AI Microservice Call:** Invokes `AIService.parseResume(buffer, filename)` which queries Google Gemini 2.5 Flash to extract structured candidate information (skills, education, experience, achievements, projects, title, summary, social links).
3. **Database User Linkage:** Verifies the user exists using `getOrCreateUserByClerkId(userId)`.
4. **Profile Upsert:** Updates or creates the `Profile` record in PostgreSQL with sanitized fields (preserving university linkage).
5. **Taxonomy Evidence Tagging:** Calls `AIService.resolveUserTaxonomy(userId, profileData)` to map skills across the 143-node taxonomy hierarchy with multi-source evidence.
6. **UserTaxonomy Upsert:** Persists assigned `taxonomyNodeIds`, `rawSkills`, and `evidence` in `UserTaxonomy`.
7. **Cache Purge:** Invalidates the user's cached profile via `CacheService.del(\`profile:${userInDb.id}\`)`.

---

## 3. 📧 Queue 2: `email-tasks` (Transactional Email Dispatch)

Defined in: `apps/api/src/queues/email.queue.ts`

### Queue Details
- **Queue Name:** `email-tasks`
- **Trigger:** When a squad leader invites a student via `POST /api/teams/:id/invites`.
- **Payload (`EmailJobData`):**
  ```typescript
  export type EmailJobData = {
    type: "SEND_TEAM_INVITATION";
    payload: {
      toEmail: string;
      teamName: string;
      eventTitle: string;
      senderName: string;
      inviteId: string;
      teamId: string;
      roleTitle?: string | null;
      roleSkills?: string[];
    };
  };
  ```

### Queue Configuration & Retry Strategy
```typescript
export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000, // 3s, 6s, 12s
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
```

### Worker Configuration
- **Concurrency:** 5 parallel jobs.
- **Worker Execution:** Invokes `EmailService.sendTeamInvitationEmail(job.data.payload)`.
- **Enqueuing Helper:** `queueTeamInvitationEmail(payload)` encapsulates enqueuing with an automatic fallback to direct non-blocking dispatch if the Redis queue fails to accept the job.

---

## 4. ⚙️ Redis Connection Requirements for BullMQ

> [!IMPORTANT]
> BullMQ **requires** `maxRetriesPerRequest: null` on its `ioredis` instances. Standard Redis clients configured with retry limits will cause BullMQ workers to crash on startup.

Each queue file initializes its connection as follows:

```typescript
import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
```

---

## 5. 🔑 Environment Variables

To operate the queue workers, ensure the following environment variables are configured in `.env`:

```ini
# Redis Connection (Used by BullMQ & CacheService)
REDIS_URL="redis://localhost:6379"

# Transactional Email (Nodemailer SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="notifications@squadup.dev"
SMTP_PASS="your_app_password_here"
EMAIL_FROM="SquadUp Team <notifications@squadup.dev>"
APP_FRONTEND_URL="http://localhost:5173"
```

---

## 6. ⚠️ Developer Rules & Guidelines

1. **Never Call External I/O Synchronously in Controllers:** Any operation taking > 200ms (AI models, PDF parsers, SMTP servers) must be dispatched via a BullMQ queue.
2. **Always Type Job Payloads:** Payloads must have matching interfaces defined in `@squadup/shared` to avoid type mismatches between producers and consumers.
3. **Handle Dead Letter / Failed Jobs:** Always set `removeOnFail: false` for mission-critical jobs so failed jobs can be inspected or replayed.
4. **Clean up Resources:** Invalidate relevant caches (`CacheService`) within worker handlers once database writes are finalized.

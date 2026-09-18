# SquadUp 2.0 — Feature Roadmap & Milestone History

This document outlines the sequential implementation history and future roadmap for SquadUp following the completion of all primary V2 platform milestones.

---

## 📋 Milestone History (All Primary Tasks Completed ✅)

```
[Task 1: TeamRole Schema & 151-Node Taxonomy Scoring Engine] (COMPLETED ✅)
       │
       ▼
[Task 2: Role-Based Teammate Invites, Lifecycle Modals & Live Notifications Backend (with Redis Pub/Sub & SMTP)] (COMPLETED ✅)
       │
       ▼
[Task 3: "Create Team" UI, Structured Role Builder, Custom Dropdown & Capacity Engine] (COMPLETED ✅)
       │
       ▼
[Task 4: Candidate Role-Specific Applications & Leader Evaluation] (COMPLETED ✅)
       │
       ▼
[Task 5: Protected Onboarding Route & Theme/LocalStorage Isolation Safeguards] (COMPLETED ✅)
```

---

### ✅ Task 1: TeamRole Schema & Taxonomy Scoring Engine (Completed)
- **Implemented:**
  - `TeamRole` model in Prisma supporting designated positions (`title`, `skills`, `spots`, `assignedToId`).
  - 151-node single-parent canonical knowledge hierarchy (`taxonomy_tree.json`) with precomputed depths and LCA indices.
  - Multi-source evidence extraction from Skills (`0.65`), Projects (`0.85`), and Work Experience (`1.00`).
  - Pre-scoring vector optimization evaluating 10,000 teams in < 15ms.
  - Role-level compatibility scoring (`bestMatchingRole`) matching candidates to specific open positions in teams.

---

### ✅ Task 2: Role-Based Teammate Invites, Lifecycle Modals & Live Notifications Backend (Completed)
- **Implemented:**
  - `Notification` model with TTL (`expiresAt`) and read status tracking in PostgreSQL.
  - `POST /api/teams/:id/invites` supporting role-assigned invites with technology tags.
  - Redis Pub/Sub multiplexed over Server-Sent Events (`GET /api/notifications/stream`) with 25s keepalive heartbeats.
  - Nodemailer SMTP email worker in BullMQ (`email-tasks`) dispatching branded invitation emails with deep links.
  - Interactive `TeamInviteModal.tsx` on `TeamDetailPage` displaying role badges, required stack, and accept/decline actions.
  - Live Navbar notification bell with unread badge counter and real-time toast popups.

---

### ✅ Task 3: "Create Team" UI, Structured Role Builder, Custom Dropdown & Capacity Engine (Completed)
- **Implemented:**
  - Modal with custom `RoleSelectDropdown` adhering to SquadUp dark glassmorphism aesthetics.
  - Structured multi-role builder with requirements tagging and customizable open spots.
  - Team leader self-assignment dropdown with deferred slot decrement on submission.
  - Dynamic squad capacity engine across backend and frontend:
    $$\text{Total Capacity} = \text{members.length} + \sum (\text{role.spots})$$
  - Seamless integration on `EventDetailPage` and `TeamsPage`.

---

### ✅ Task 4: Candidate Role-Specific Applications & Leader Evaluation (Completed)
- **Implemented:**
  - Role selection within `ApplyTeamModal.tsx` allowing applicants to target specific open roles.
  - Candidate compatibility score calculation against target role requirements.
  - Squad Leader dashboard (`ApplicationsPage.tsx`) displaying candidate match scores, skills provenance, and acceptance/rejection actions.

---

### ✅ Task 5: Protected Onboarding Route & Theme Isolation (Completed)
- **Implemented:**
  - Route protection restricting `/onboarding` strictly to non-onboarded authenticated users, automatically bouncing onboarded users to `/`.
  - Profile theme isolation: Viewing public candidate profiles (`/profile/:id`) no longer mutates the viewer's theme tokens or `localStorage`.
  - Memoized callbacks in `PaletteContext` preventing React infinite update depth loops.

---

## 🔮 Future Platform Enhancements

1. **Real-Time Squad In-App Messaging / Chat:**
   - Dedicated team channels powered by Redis Pub/Sub and WebSocket/SSE for coordinated hackathon communication.
2. **Organizer Event Analytics Dashboard:**
   - Visual statistics on student registrations, role distributions, skill supply-and-demand graphs, and squad formation rates.
3. **Automated Teammate Matchmaking Suggestions:**
   - "Recommended Teammates" drawer for squad leaders looking for candidates with specific missing skill nodes.
4. **Discord & Slack Webhook Integrations:**
   - Direct broadcast of team invites, application acceptances, and event announcements into university Discord/Slack servers.

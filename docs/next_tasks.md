# SquadUp 2.0 — Prioritized Next Tasks Roadmap

This document outlines the sequential implementation roadmap for upcoming SquadUp features following **Task 1: TeamRole Model & Taxonomy Recommendation Engine Upgrade (Completed)**.

---

## 📋 Task Breakdown & Priority Order

```
[Task 1: TeamRole Schema & Taxonomy Scoring Engine] (COMPLETED ✅)
       │
       ▼
[Task 2: Role-Based Teammate Invites, Lifecycle Modals & Live Notifications Backend (with Redis Pub/Sub)] (CURRENT FOCUS 🎯)
       │
       ▼
[Task 3: "Create Team" Modals & Page Action Integrations]
       │
       ▼
[Task 4: Candidate Role-Specific Applications]
```

---

### 🔹 Task 2: Role-Based Teammate Invites, Lifecycle Modals & Live Notifications Backend (with Redis Pub/Sub)
- **Goal:** Allow squad leaders to send role-specific invitations and notify recipients via in-app alerts, Redis Pub/Sub real-time channels, interactive accept/decline modals on `TeamDetailPage`, and Navbar notification triage.
- **Components & Backend to Build / Update:**
  1. **Notification Database Model (`Notification`):**
     - Stored in PostgreSQL with `userId`, `type` (`TEAM_INVITE`, `APPLICATION_RECEIVED`, etc.), `title`, `message`, `link`, `data`, and `isRead`.
  2. **REST Endpoints & Invites API:**
     - `POST /api/teams/:id/invites`: Send role-specific invite with assigned `roleTitle` / `roleId`.
     - `GET /api/notifications`: Retrieve unread and recent notifications for active user.
     - `PATCH /api/notifications/:id/read`: Mark single alert as read.
     - `POST /api/notifications/read-all`: Bulk mark all as read.
     - `POST /api/invites/:id/accept` and `POST /api/invites/:id/decline`: Accept (joining roster under assigned role) or decline invitation.
  3. **Redis Pub/Sub Real-Time Integration:**
     - Publish notification events to Redis channel `notifications:user:<userId>`.
     - Backend SSE (Server-Sent Events) subscriber for instant push to connected browser clients without polling.
  4. **Frontend `TeamInviteModal.tsx` & `TeamDetailPage.tsx`:**
     - Triggers automatically when a candidate visits `/team/:teamId` with a pending invite (or via URL parameter `?inviteId=...`).
     - Shows designated role badge (e.g. 🎨 **Frontend Developer**), required technology stack (*NextJS, Tailwind CSS*), inviter lead name, and event context.
     - Actions: **"Accept Invitation"** (joins squad roster under that role) and **"Decline"**.
  5. **Navbar Notification Bell & Popover (`Navbar.tsx`):**
     - Replaces mock notification list with live backend data from `GET /api/notifications`.
     - Real-time unread badge counter.
     - Listens to Redis Pub/Sub SSE stream for instant toast pops and notification count increments.
     - Clicking an invite notification routes directly to the squad dossier with `TeamInviteModal` open.

---

### 🔹 Task 3: "Create Team" UI & Page Integrations
- **Goal:** Enable students to create new squads directly from Events and the Teams Directory with structured roles.
- **Components to Build / Update:**
  1. `CreateTeamModal.tsx`:
     - If opened from `EventDetailPage`: Pre-populates and locks the event banner.
     - If opened from `TeamsPage`: Renders a searchable event dropdown (modeled after the accessible search select on TeamsPage filters).
     - Team Name & Description inputs.
     - Structured Role Builder: Allows adding multiple positions (e.g., Frontend Developer, Backend Engineer, AI Specialist) and tagging required technologies under each role.
     - Squad presets / templates (e.g. Full-Stack Web, AI/ML Product, Mobile App).
     - Initial Teammate Invites (email + assigned role).
  2. `EventDetailPage.tsx`:
     - Eligibility check: `isGlobal === true || user.university === event.location || user.orgId === event.orgId`.
     - Renders "Create Team" / "Start a Squad" button in Quick Actions card and header when eligible.
  3. `TeamsPage.tsx`:
     - Places a prominent "Create Team" button directly above the "Refresh" button in the header (`flex flex-col items-end gap-2`).

---

### 🔹 Task 4: Candidate Role-Specific Applications
- **Goal:** Allow candidates applying to a team to select which specific open role they are applying for, displaying their targeted compatibility score for that position to the team leader.

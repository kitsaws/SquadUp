# First-Time User Onboarding Specification

This document defines the complete technical and interaction design specification for the **First-Time User Onboarding** feature in `apps/web` and `apps/api`.

---

## 1. Overview & Goals

When a new user signs up on SquadUp, they face a cold-start state:
1. **No Institutional Context:** Without an affiliated university/organization, the user cannot apply to university-scoped teams (`isGlobal === false`) and receives HTTP 403 Forbidden errors.
2. **No Technical Profile:** Without parsed skills, projects, or work history, the recommendation engine cannot compute capability match scores against open teams ($0.0$ taxonomy score).

**The Solution:** A frictionless, guided two-step onboarding sequence:
```
User Signs Up (Clerk)
       │
       ▼
[Onboarding Guard] ──(Profile incomplete)──► /onboarding
       │
       ├─► Step 1: Select University (Searchable dropdown with safety reminder/warning modal)
       │
       └─► Step 2: Choose Profile Creation Method
             │
             ├──► [PRIMARY / HIGHLIGHTED] Upload Resume (Preview file -> Explicit "Generate Profile" -> Celebration Modal)
             │
             └──► [SECONDARY / FALLBACK]  Build Manually (Compact modal -> "Save & Complete Profile" -> Celebration Modal)
       │
       ▼
Onboarding Completed Modal ──► "Browse Events" (/events) or "Explore Squads" (/teams)
```

---

## 2. Detailed User Flow

### Step 0: Authentication & Route Gate (`OnboardingGuard`)
- **Trigger:** Any authenticated user visiting the application.
- **Race Condition Prevention:** The guard waits until `hasInitialProfileLoaded === true` before making redirect decisions to avoid prematurely booting logging-in users to `/onboarding`.
- **Incomplete Condition:** `profile.university === null` AND user has zero skills, experience, projects, or uploaded resumes.
- **Non-Forced Exit:** The route guard does not forcibly unmount or redirect `/onboarding` when `profile` updates mid-flow, allowing the celebration modal to display smoothly.

---

### Step 1: University / Organization Selection
- **Objective:** Establish the user's home educational institution or independent status.
- **UI Design (`UniversitySearchSelect.tsx`):**
  - Searchable dropdown with fuzzy filtering across university names, domains, and locations.
  - Institutional cards showing emblem, location, and verified email domain pills (`@thapar.edu`, `@bits-pilani.ac.in`).
  - Option to continue as **Independent / Unaffiliated**.
  - Full keyboard accessibility (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- **Confirmation & Warning Dialogs (`UniversityReminderModal.tsx`):**
  - **University Selected:** Reminds the student that campus selection impacts eligible events and squad formations.
  - **Independent Selected:** Warns the student that without university affiliation, they are restricted to Global hackathons and open teams.
- **Deferred Backend Commit:** The selection is held in React state during Step 1 and atomically committed to PostgreSQL only when Step 2 completes.

---

### Step 2: Profile Creation Method Selection (`ProfileChoiceCards.tsx`)
- **Institution Summary Bar:** Displays current university selection with a `"Change"` link to navigate back to Step 1 at any point.

#### Option A: Build via Resume (Highlighted / Recommended CTA)
- **Visual Emphasis:**
  - Border accent, subtle gradient background tint, and a `"Recommended — Takes 10s"` pill badge.
- **Interaction (`ResumeDropzone.tsx`):**
  - Accepts PDF documents up to 10MB via drag-and-drop or file browser.
  - **File Preview:** Displays selected file card with name, file size, "Ready to parse" badge, and remove (`X`) button. Does **not** auto-dispatch on file drop.
  - **Explicit CTA:** Prominent **"Generate Profile"** button with loading spinner state (`"Analyzing Resume & Building Profile..."`).
  - Dispatches `POST /api/resume/upload` to BullMQ.
  - Commits university selection via `POST /api/organizers/universities/select`.
  - Refreshes `UserContext` and immediately opens `OnboardingCompletedModal`.

#### Option B: Build Manually (Secondary / Fallback Path)
- **Visual Emphasis:** Clean, neutral card with `"Enter Details Manually"` button.
- **Interaction (`ManualProfileModal.tsx`):**
  - Compact `max-w-lg` modal dialog with 2-row bio, quick skill chips (`React`, `TypeScript`, `Python`, `Docker`, `PostgreSQL`), degree/grad year, and GitHub/LinkedIn links.
  - Submits via `PATCH /api/profile` (triggering deterministic taxonomy indexing) and `POST /api/organizers/universities/select`.
  - On clicking **"Save & Complete Profile"**, refreshes `UserContext` and immediately opens `OnboardingCompletedModal`.

---

### Step 3: Celebration & Navigation (`OnboardingCompletedModal.tsx`)
- Celebration dialog with emerald checkmark badge and confirmed institutional affiliation.
- **Action Buttons:**
  - **"Browse Events"** (primary) $\to$ navigates directly to `/events`.
  - **"Explore Squads & Teams"** $\to$ navigates to `/teams`.
- Dismiss button (`X`) allows viewing the underlying `ResumeProcessingNotice.tsx` status page.

---

## 3. Frontend Component Architecture

```
apps/web/src/
├── components/
│   ├── Navbar.tsx                   # Dynamic 2-step Onboarding Progression Bar
│   └── onboarding/
│       ├── OnboardingGuard.tsx          # Route guard redirecting incomplete profiles
│       ├── UniversitySearchSelect.tsx   # Searchable dropdown for organizations
│       ├── UniversityReminderModal.tsx  # Campus confirmation & independent warning modal
│       ├── ProfileChoiceCards.tsx       # Dual-path selector (Resume vs Manual)
│       ├── ResumeDropzone.tsx           # Drag-and-drop PDF upload with explicit Generate CTA
│       ├── ManualProfileModal.tsx       # Compact manual profile builder form modal
│       ├── ResumeProcessingNotice.tsx   # Optimistic background progress callout
│       └── OnboardingCompletedModal.tsx # Celebration dialog with Browse Events navigation
└── pages/
    └── Onboarding.tsx                   # Master step container (Step 1 -> Step 2 -> Step 3)
```

---

## 4. API Endpoints Referenced

| Endpoint | Method | Purpose in Onboarding |
| :--- | :--- | :--- |
| `/api/organizers/universities` | `GET` | Fetches available organizations for searchable dropdown. |
| `/api/organizers/universities/select` | `POST` | Atomically links `OrganizationMembership` and `Profile.university`. |
| `/api/profile` | `GET` | Evaluates current user onboarding state (`university`, resume, skills). |
| `/api/resume/upload` | `POST` | Dispatches PDF for BullMQ async parsing (Highlighted Path). |
| `/api/profile` | `PATCH` | Saves manual profile fields & triggers taxonomy sync (Manual Path). |
| `/api/webhooks` | `POST` | Clerk webhook syncs `organizationMembership` and sets `Profile.university`. |

---

## 5. Visual & Interaction Guidelines

1. **75% Professional, 25% Expressive:** Keep the onboarding surface clean, typography-led, and distraction-free. Use expressive accenting only on the **"Build via Resume"** card to guide user attention.
2. **Accessible Keyboard Navigation:** The searchable university dropdown must support `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` keys.
3. **No Trapped Spinners:** The resume upload must never trap the student on a full-screen loading spinner. File upload acknowledgment must provide an instant escape hatch to explore the platform.

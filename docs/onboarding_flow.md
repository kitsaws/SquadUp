# First-Time User Onboarding Specification

This document defines the complete technical and interaction design specification for the **First-Time User Onboarding** feature in `apps/web`.

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
       ├─► Step 1: Select University (Searchable dropdown bound to clerkOrgId)
       │
       └─► Step 2: Choose Profile Creation Method
             │
             ├──► [PRIMARY / HIGHLIGHTED] Upload Resume (Fast, AI-parsed, non-blocking)
             │
             └──► [SECONDARY / FALLBACK]  Build Manually (Structured form)
       │
       ▼
Discover Teams & Events (Personalized recommendations active)
```

---

## 2. Detailed User Flow

### Step 0: Authentication & Route Gate (`OnboardingGuard`)
- **Trigger:** Any authenticated user visiting the application.
- **Evaluation:**
  - Client checks user profile (`GET /api/profile`) or Clerk organization memberships.
  - **Incomplete Condition:** `profile.university === null` OR user has zero active organization memberships.
  - If incomplete and current path is not `/onboarding`, redirect to `/onboarding`.
  - If complete and user attempts to navigate to `/onboarding`, redirect to `/teams`.

---

### Step 1: University / Organization Selection
- **Objective:** Establish the user's home educational institution.
- **UI Design:**
  - Clean, centered card layout with heading: *"Where do you study?"* and subtitle: *"SquadUp connects you with teams and hackathons at your university."*
  - **Searchable Dropdown Component:**
    - Live search input filtering university list by name, domain, or location.
    - Result items display: University Logo/Emblem, Name, and Location badge.
    - Empty state: *"Don't see your university? Contact support or join as independent."*
  - **Data Source:** `GET /api/organizers/universities`.
  - **Data Binding:**
    - Each university item contains `{ id, clerkOrgId, name, domain, location, logoUrl }`.
    - Selected value is bound strictly to `clerkOrgId` (Clerk Organization ID).
  - **Action & State Transition:**
    - User clicks **"Continue"**.
    - The client uses Clerk's organization client to assign/join the organization (`clerk.setActive({ organization: clerkOrgId })` or backend join route).
    - Clerk emits an `organizationMembership.created` webhook to `/api/webhooks`.
    - Express webhook handler records `OrganizationMembership` in PostgreSQL and updates `Profile.university = Organization.name`.
    - UI animates smoothly to Step 2.

---

### Step 2: Profile Creation Method Selection
- **Objective:** Populate the user's technical profile to activate deterministic taxonomy scoring.
- **UI Design:**
  - Heading: *"Let's build your developer profile"*
  - Subtitle: *"SquadUp matches you with teammates based on verified skills and project experience."*
  - Side-by-side or stacked selection cards:

#### Option A: Build via Resume (Highlighted / Recommended CTA)
- **Visual Emphasis:**
  - Prominent border accent, subtle gradient background tint, and a `"Recommended — Takes 10s"` pill badge.
  - Icon: File text / AI sparkle.
  - Value proposition copy: *"Upload your PDF resume. Our AI parser automatically extracts your technologies, projects, and work experience into your profile."*
- **Interaction:**
  - Drag-and-drop file zone with a *"Browse Files"* button.
  - Restricts to `.pdf` files, max 5MB.
  - On file selection, triggers `POST /api/resume/upload` with `multipart/form-data`.
- **Non-Blocking Processing UX:**
  - The client displays an immediate optimistic confirmation: *"Resume uploaded! Your profile is being generated in the background."*
  - Prominent CTA: *"Start Exploring SquadUp"* allowing the student to browse teams and events immediately while BullMQ and the Python AI service process the document.
  - Background polling or toast notification alerts user once parsing and taxonomy indexing are complete.

#### Option B: Build Manually (Secondary / Fallback Path)
- **Visual Emphasis:**
  - Clean, neutral card with subtle hover outline.
  - Copy: *"Don't have a resume handy? Enter your details, degree, and skills manually."*
- **Interaction:**
  - Clicking opens a streamlined profile form (or modal) with fields:
    - **Headline / Role** (e.g. *"Full Stack Developer"*).
    - **Degree & Graduation Year** (e.g. *"B.S. Computer Science, 2027"*).
    - **Bio** (short markdown-supported about text).
    - **Links** (GitHub URL, LinkedIn URL, Portfolio).
    - **Skills Multi-Select / Tag Input** (searchable against canonical taxonomy aliases).
  - Submits via `PATCH /api/profile`.
  - On save, backend triggers `AIService.resolveUserTaxonomy` deterministically and completes onboarding.

---

### Step 3: Onboarding Completion
- Client marks onboarding state complete in local state/cache.
- User is navigated to `/teams` with their university filter pre-selected and personalized match scores calculating in real time.

---

## 3. Frontend Component Architecture

```
apps/web/src/
├── components/
│   └── onboarding/
│       ├── OnboardingGuard.tsx          # Route guard redirecting incomplete profiles
│       ├── UniversitySearchSelect.tsx   # Searchable dropdown for organizations
│       ├── ProfileChoiceCards.tsx       # Dual-path selector (Resume vs Manual)
│       ├── ResumeDropzone.tsx           # Drag-and-drop PDF upload component
│       ├── ResumeProcessingNotice.tsx   # Optimistic background progress callout
│       └── ManualProfileModal.tsx       # Concise manual form fallback
└── pages/
    └── Onboarding.tsx                   # Master step container (Step 1 -> Step 2)
```

---

## 4. API Endpoints Referenced

| Endpoint | Method | Purpose in Onboarding |
| :--- | :--- | :--- |
| `/api/organizers/universities` | `GET` | Fetches available organizations for searchable dropdown. |
| `/api/profile` | `GET` | Evaluates current user onboarding state (`university`, resume status). |
| `/api/resume/upload` | `POST` | Dispatches PDF for BullMQ async parsing (Highlighted Path). |
| `/api/profile` | `PATCH` | Saves manual profile fields & triggers taxonomy sync (Manual Path). |
| `/api/webhooks` | `POST` | Clerk webhook syncs `organizationMembership` and sets `Profile.university`. |

---

## 5. Visual & Interaction Guidelines

1. **75% Professional, 25% Expressive:** Keep the onboarding surface clean, typography-led, and distraction-free. Use expressive accenting only on the **"Build via Resume"** card to guide user attention.
2. **Accessible Keyboard Navigation:** The searchable university dropdown must support `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` keys.
3. **No Trapped Spinners:** The resume upload must never trap the student on a full-screen loading spinner. File upload acknowledgment must provide an instant escape hatch to explore the platform.

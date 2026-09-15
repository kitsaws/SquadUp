# SquadUp API Endpoints Specification

This document serves as the primary integration contract for the frontend application (`apps/web`). All endpoints, request bodies, query parameters, authorization headers, and response formats are detailed below.

---

## 1. Global Conventions

- **Base URL:** `http://localhost:3000/api` (default development port).
- **Authentication:** All protected routes require a Clerk session JWT passed in the HTTP Authorization header:
  ```http
  Authorization: Bearer <clerk_jwt_token>
  ```
  *(In the frontend, extract this using Clerk's `await getToken()` or through the Clerk fetch wrapper).*
- **Content-Type:** `application/json` (except `/api/resume/upload` which is `multipart/form-data`).
- **Standard Pagination Contract:**
  All paginated endpoints return:
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    }
  }
  ```
  > [!TIP]
  > **Frontend Rule for Pagination:** Whenever a filter, search query, or sort option changes, the frontend must always reset `page=1`.

---

## 2. User & Profile Endpoints (`/api/profile`)

### 2.1 Get Current User Profile
Retrieves the logged-in user's profile, active teams, resume status, and AI-resolved taxonomy skills.

- **Method:** `GET`
- **Path:** `/api/profile`
- **Auth:** Required
- **Success Response (`200 OK`):**
  ```json
  {
    "id": "cmu25...",
    "userId": "cmu25...",
    "clerkId": "user_2...",
    "name": "Jane Doe",
    "email": "jane@stanford.edu",
    "university": "Stanford University",
    "title": "Full Stack Engineer",
    "summary": "Passionate about building scalable distributed systems.",
    "skills": ["React", "FastAPI", "PostgreSQL", "Docker"],
    "education": [
      {
        "degree": "B.S. Computer Science",
        "college": "Stanford University"
      }
    ],
    "experience": [
      {
        "role": "Software Engineering Intern",
        "company": "Tech Corp",
        "duration": "Summer 2025",
        "bullet_points": ["Built real-time messaging pipeline."],
        "technologies": ["FastAPI", "Redis"]
      }
    ],
    "projects": [
      {
        "name": "SquadUp Platform",
        "description": "Team forming hackathon hub.",
        "bullet_points": ["Implemented pure taxonomy scoring engine."],
        "technologies": ["React", "Node.js", "Docker"]
      }
    ],
    "githubUrl": "https://github.com/janedoe",
    "linkedinUrl": "https://linkedin.com/in/janedoe",
    "resumePdfUrl": "/api/resume/view",
    "lastResumeUploadedAt": "2026-09-15T09:00:00.000Z",
    "taxonomyNodeIds": ["react", "fastapi", "postgresql", "docker"],
    "evidence": [
      {
        "nodeId": "fastapi",
        "source": "experience",
        "snippet": "Software Engineering Intern at Tech Corp",
        "strength": 1.0
      }
    ],
    "teams": [
      {
        "teamId": "cmu25...",
        "teamName": "AI Agents Guild",
        "eventId": "cmu25...",
        "role": "Leader",
        "joinedAt": "2026-09-15T09:15:00.000Z"
      }
    ],
    "createdAt": "2026-09-15T08:00:00.000Z",
    "updatedAt": "2026-09-15T09:30:00.000Z"
  }
  ```

### 2.2 Update Profile
Updates user profile fields and **automatically re-indexes `UserTaxonomy` in real-time** if `skills`, `projects`, or `experience` are modified.

- **Method:** `PATCH`
- **Path:** `/api/profile`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "university": "Stanford University",
    "title": "Senior AI Systems Developer",
    "summary": "Updated summary statement...",
    "skills": ["React", "TypeScript", "FastAPI", "PyTorch"],
    "githubUrl": "https://github.com/janedoe",
    "linkedinUrl": "https://linkedin.com/in/janedoe"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "message": "Profile updated successfully.",
    "profile": { ... }
  }
  ```

### 2.3 Get Public Candidate Profile
Fetches a candidate's profile for teammates or leaders evaluating applicants.

- **Method:** `GET`
- **Path:** `/api/profile/:targetUserId`
- **Auth:** Required
- **Path Parameters:**
  - `targetUserId`: User's internal Postgres `cuid` or Clerk `userId`.
- **Success Response (`200 OK`):**
  ```json
  {
    "id": "cmu25...",
    "userId": "cmu25...",
    "name": "Alex Smith",
    "university": "UC Berkeley",
    "title": "Frontend Specialist",
    "summary": "Building accessible UI experiences.",
    "skills": ["React", "Tailwind CSS", "Next.js"],
    "education": [...],
    "experience": [...],
    "projects": [...],
    "githubUrl": "https://github.com/alexsmith",
    "linkedinUrl": null,
    "hasResume": true,
    "resumeViewUrl": "/api/resume/view/cmu25...",
    "taxonomyNodeIds": ["react", "frontend_development"]
  }
  ```

---

## 3. Resume Endpoints (`/api/resume`)

### 3.1 Upload Resume
Uploads a PDF resume, enforces the 24-hour rate limit, persists the PDF to disk, and enqueues BullMQ AI parsing.

- **Method:** `POST`
- **Path:** `/api/resume/upload`
- **Auth:** Required
- **Content-Type:** `multipart/form-data`
- **Form Field:** `file` (PDF file, max 10MB)
- **Success Response (`202 Accepted`):**
  ```json
  {
    "message": "Resume uploaded successfully and added to processing queue.",
    "jobId": "14"
  }
  ```
- **Rate Limit Response (`429 Too Many Requests`):**
  *(Returned when a user uploads more than once in 24 hours. Bypassed for `nagpalswastik@gmail.com`, `razediff0@gmail.com`, or in dev mode).*
  ```json
  {
    "error": "Rate limit exceeded. You can only upload a resume once every 24 hours.",
    "nextAvailableAt": "2026-09-16T09:00:00.000Z"
  }
  ```

### 3.2 Poll Resume Parsing Status
Polls the BullMQ background worker state for a resume parsing job.

- **Method:** `GET`
- **Path:** `/api/resume/status/:jobId`
- **Auth:** Optional / Open
- **Success Response (`200 OK`):**
  - While processing: `{"jobId": "14", "state": "active"}`
  - When finished:
    ```json
    {
      "jobId": "14",
      "state": "completed",
      "result": {
        "title": "Full Stack Engineer",
        "summary": "...",
        "skills": ["React", "FastAPI", "PostgreSQL"],
        "education": [...],
        "experience": [...],
        "projects": [...]
      }
    }
    ```
  - When failed: `{"jobId": "14", "state": "failed", "error": "..."}`

### 3.3 Stream User Resume PDF (Inline Browser View)
Streams the current user's uploaded resume directly as `application/pdf` with `Content-Disposition: inline`.

- **Method:** `GET`
- **Path:** `/api/resume/view`
- **Auth:** Required
- **Frontend Usage:**
  ```html
  <iframe src="http://localhost:3000/api/resume/view" width="100%" height="600px" />
  ```

### 3.4 Stream Candidate Resume PDF
Streams another candidate's resume PDF for team evaluation.

- **Method:** `GET`
- **Path:** `/api/resume/view/:targetUserId`
- **Auth:** Required

---

## 4. Events Endpoints (`/api/events`)

### 4.1 List Events (Paginated + Cached)
Returns events with server-side pagination, search, scope, and sorting. Cached in Redis for 5 minutes.

- **Method:** `GET`
- **Path:** `/api/events`
- **Auth:** Optional (if authenticated, user's university `orgId` is automatically detected)
- **Query Parameters:**
  - `page`: Page number (default: `1`).
  - `limit`: Items per page (default: `10`, max: `50`).
  - `search`: Keyword matching `title`, `description`, or `location`.
  - `scope`:
    - `"all"` (default): Returns global events + user's university events.
    - `"global"`: Returns only global events.
    - `"org"`: Returns only university-scoped events.
  - `sort`: `"date_asc"` (default) | `"date_desc"` | `"created_at"`.
- **Success Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": "cmu25...",
        "title": "TreeHacks 2026",
        "description": "Stanford's premier collegiate hackathon.",
        "date": "2026-10-15T09:00:00.000Z",
        "location": "Stanford, CA",
        "organizerId": "cmu25...",
        "organizerProfileId": "cmu25...",
        "orgId": "org_stanford",
        "isGlobal": true,
        "organizer": {
          "id": "cmu25...",
          "name": "Jane Doe",
          "email": "jane@stanford.edu"
        },
        "organizerProfile": {
          "id": "cmu25...",
          "name": "ACM Stanford",
          "slug": "acm-stanford",
          "logoUrl": "https://..."
        },
        "teamsCount": 12,
        "createdAt": "2026-09-15T09:00:00.000Z",
        "updatedAt": "2026-09-15T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 4.2 Get Event Details
Fetches detailed event metadata, organizer info, team count, and team previews. Cached in Redis with a dynamic TTL proportional to the event date.

- **Method:** `GET`
- **Path:** `/api/events/:id`
- **Auth:** Optional

### 4.3 Create Event
Creates a new event. Invalidates event list caches.

- **Method:** `POST`
- **Path:** `/api/events` (or `/api/events/create`)
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "title": "TreeHacks 2026",
    "description": "Premier hackathon at Stanford.",
    "date": "2026-10-15T09:00:00.000Z",
    "location": "Stanford, CA",
    "isGlobal": true,
    "organizerProfileId": "cmu25..."
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "id": "cmu25...",
    "title": "TreeHacks 2026",
    "description": "Premier hackathon at Stanford.",
    "date": "2026-10-15T09:00:00.000Z",
    "location": "Stanford, CA",
    "organizerId": "cmu25...",
    "isGlobal": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```

### 4.4 Update Event
Updates an event. Caller must be the event creator (`organizerId`) or an admin of the linked `organizerProfile`.

- **Method:** `PATCH` or `PUT`
- **Path:** `/api/events/:id`
- **Auth:** Required
- **Request Body:** Partial `CreateEventRequest` fields (`title`, `description`, `date`, `location`, `isGlobal`, `organizerProfileId`).

### 4.5 Delete Event
Deletes an event and cascades to teams/members. Caller must be the event creator.

- **Method:** `DELETE`
- **Path:** `/api/events/:id`
- **Auth:** Required

### 4.6 List Teams for an Event
- **Method:** `GET`
- **Path:** `/api/events/:id/teams`
- **Auth:** Optional

---

## 5. Teams Endpoints (`/api/teams`)

### 5.1 List Teams (Paginated + Filtered)
- **Method:** `GET`
- **Path:** `/api/teams`
- **Auth:** Optional (if authenticated, caller's `myTeams` filter can be used)
- **Query Parameters:**
  - `page`: Page number (default: `1`).
  - `limit`: Items per page (default: `10`, max: `50`).
  - `eventId`: Filter by event ID.
  - `myTeams`: `"true"` | `"false"` (filters teams where caller is a member).
  - `search`: Keyword matching team name or requirements tags.
  - `sort`: `"created_at"` (default) | `"name"`.
- **Success Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": "cmu25...",
        "name": "AI Agents Guild",
        "eventId": "cmu25...",
        "event": {
          "id": "cmu25...",
          "title": "TreeHacks 2026",
          "date": "2026-10-15T09:00:00.000Z",
          "isGlobal": true,
          "location": "Stanford, CA"
        },
        "requirements": ["React", "FastAPI", "PostgreSQL"],
        "requirementNodeIds": ["react", "fastapi", "postgresql"],
        "university": "Stanford University",
        "members": [
          {
            "id": "cmu25...",
            "userId": "cmu25...",
            "role": "Leader",
            "joinedAt": "2026-09-15T09:00:00.000Z",
            "name": "Jane Doe",
            "email": "jane@stanford.edu",
            "university": "Stanford University",
            "skills": ["React", "FastAPI"],
            "title": "Full Stack Dev"
          }
        ],
        "isLeader": true,
        "isMember": true,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 5.2 Get Team Details
- **Method:** `GET`
- **Path:** `/api/teams/:id`
- **Auth:** Optional / Recommended (members/leaders receive pending `invites` and `applications` in the response payload).

### 5.3 Create Team
Creates a team, resolves requirements to taxonomy nodes, assigns caller as `Leader`, and sends optional initial email invites.

- **Method:** `POST`
- **Path:** `/api/teams`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "eventId": "cmu25...",
    "name": "AI Agents Guild",
    "requirements": ["React", "FastAPI", "PostgreSQL"],
    "invites": ["teammate@stanford.edu"]
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "message": "Team created successfully",
    "teamId": "cmu25...",
    "requirementNodeIds": ["react", "fastapi", "postgresql"]
  }
  ```

### 5.4 Update Team
Updates team metadata. **If `requirements` are changed, automatically triggers AI taxonomy re-indexing for the team.** Caller must be team `Leader`.

- **Method:** `PATCH` or `PUT`
- **Path:** `/api/teams/:id`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "name": "Updated Team Name",
    "requirements": ["Next.js", "PyTorch", "Tailwind CSS"],
    "university": "Stanford University"
  }
  ```

### 5.5 Delete Team
Deletes a team and cascades to members/applications. Caller must be team `Leader` or parent `Event` organizer.

- **Method:** `DELETE`
- **Path:** `/api/teams/:id`
- **Auth:** Required

---

## 6. Team Applications & Opt-Out (`/api/teams`)

### 6.1 Apply to Join a Team
Submits a join application.

- **Method:** `POST`
- **Path:** `/api/teams/:id/apply`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "message": "Hey, I'd love to join as a full-stack dev!"
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "message": "Application submitted successfully.",
    "applicationId": "cmu25...",
    "status": "PENDING"
  }
  ```
- **Hard Eligibility Error (`403 Forbidden`):**
  *(Triggered when `team.event.isGlobal === false` and the applicant belongs to a different university).*
  ```json
  {
    "error": "Cannot apply: This team belongs to an institution-restricted event."
  }
  ```
  > [!IMPORTANT]
  > **Frontend UI Check:** Check `team.event.isGlobal`. If `false` and the logged-in user's university does not match the team or event location, disable the "Apply" button with an informative tooltip.

### 6.2 Withdraw Application
Candidate withdraws their own pending application. Can be done by Team ID or Application ID.

- **Method:** `DELETE`
- **Path:** `/api/teams/:id/apply` or `/api/teams/applications/:applicationId` or `/api/applications/:applicationId`
- **Auth:** Required

### 6.3 Get My Submitted Applications (Candidate View)
Retrieves all applications submitted by the logged-in candidate across all teams and events.

- **Method:** `GET`
- **Path:** `/api/teams/applications/my-applications` or `/api/applications/my-applications`
- **Auth:** Required
- **Success Response (`200 OK`):**
  ```json
  {
    "total": 2,
    "applications": [
      {
        "id": "cmu25...",
        "teamId": "cmu25...",
        "teamName": "NeuroVision Health",
        "eventId": "cmu25...",
        "eventTitle": "TreeHacks 2026",
        "university": "Stanford University",
        "requirements": ["PostgreSQL", "FastAPI"],
        "message": "I spent last summer optimizing time-series ingestion pipelines...",
        "status": "PENDING",
        "createdAt": "2026-09-15T12:00:00.000Z",
        "updatedAt": "2026-09-15T12:00:00.000Z"
      }
    ]
  }
  ```

### 6.4 Get Incoming Applications (Squad Leader Dashboard)
Retrieves incoming candidate applications across all teams led by the current user (powers `ApplicationsPage.tsx`).

- **Method:** `GET`
- **Path:** `/api/teams/applications/incoming` or `/api/applications/incoming`
- **Auth:** Required (returns applications for all teams where caller is `Leader`)
- **Query Parameters:**
  - `teamId`: *(Optional)* Filter incoming candidates for a specific team.
  - `status`: *(Optional)* Filter by `"PENDING"`, `"ACCEPTED"`, or `"REJECTED"`.
- **Success Response (`200 OK`):**
  ```json
  {
    "total": 3,
    "applications": [
      {
        "id": "cmu25...",
        "candidateId": "cmu25...",
        "name": "Alex Rivera",
        "avatarUrl": null,
        "university": "Stanford University",
        "year": "CS Junior",
        "appliedRole": "PostgreSQL & Distributed Lead",
        "matchScore": 0.94,
        "isCampusMatch": true,
        "appliedTimeAgo": "2h ago",
        "coverNote": "Hey! I saw NeuroVision on the board. Would love to own telemetry storage.",
        "skills": [
          { "name": "PostgreSQL", "provenance": "Resume: Datadog Internship", "score": 0.96 },
          { "name": "Distributed Systems", "provenance": "Resume: Distributed Systems Course", "score": 0.92 }
        ],
        "status": "PENDING",
        "teamId": "cmu25...",
        "teamName": "NeuroVision Health",
        "createdAt": "2026-09-15T10:00:00.000Z"
      }
    ]
  }
  ```

### 6.5 Get Single Application Details
- **Method:** `GET`
- **Path:** `/api/teams/applications/:applicationId` or `/api/applications/:applicationId`
- **Auth:** Required (Applicant or Squad Leader only)

### 6.6 List Applications for a Specific Team
Retrieves pending applications with candidate profile, skills, and taxonomy nodes. Caller must be team `Leader`.

- **Method:** `GET`
- **Path:** `/api/teams/:id/applications`
- **Auth:** Required (Leader only)

### 6.7 Accept Application
Leader accepts applicant $\to$ adds user as `TeamMember` (`role: "Member"`).

- **Method:** `POST`
- **Path:** `/api/teams/applications/:applicationId/accept` or `/api/applications/:applicationId/accept`
- **Auth:** Required (Leader only)

### 6.8 Reject Application
Leader rejects applicant $\to$ sets status to `"REJECTED"`.

- **Method:** `POST`
- **Path:** `/api/teams/applications/:applicationId/reject` or `/api/applications/:applicationId/reject`
- **Auth:** Required (Leader only)

### 6.9 Leave Team (Opt-Out)
Caller leaves the team.
- If a regular `Member`: removes membership row.
- If the `Leader`: automatically promotes the next earliest joined member to `Leader`. If the leader was the sole member, the team is deleted.

- **Method:** `DELETE`
- **Path:** `/api/teams/:id/leave`
- **Auth:** Required

### 6.10 Remove Member
Leader removes a member from the team.

- **Method:** `DELETE`
- **Path:** `/api/teams/:id/members/:userId`
- **Auth:** Required (Leader only)

---

## 7. Team Invites (`/api/teams`)

### 7.1 Send Team Invites
Leader invites email addresses.

- **Method:** `POST`
- **Path:** `/api/teams/:id/invites`
- **Auth:** Required (Leader only)
- **Request Body:**
  ```json
  {
    "invites": ["sarah@college.edu", "david@college.edu"]
  }
  ```

### 7.2 Get My Pending Invites
Fetches all invites addressed to the logged-in user's email address.

- **Method:** `GET`
- **Path:** `/api/teams/invites/my-invites`
- **Auth:** Required
- **Success Response (`200 OK`):**
  ```json
  {
    "totalInvites": 1,
    "invites": [
      {
        "id": "cmu25...",
        "teamId": "cmu25...",
        "teamName": "AI Agents Guild",
        "eventId": "cmu25...",
        "eventTitle": "TreeHacks 2026",
        "isGlobal": true,
        "senderName": "Jane Doe",
        "membersCount": 3,
        "requirements": ["React", "FastAPI"],
        "createdAt": "2026-09-15T09:00:00.000Z"
      }
    ]
  }
  ```

### 7.3 Accept Team Invite
- **Method:** `POST`
- **Path:** `/api/teams/invites/:inviteId/accept`
- **Auth:** Required (must match invite email)

### 7.4 Decline Team Invite
- **Method:** `POST`
- **Path:** `/api/teams/invites/:inviteId/decline`
- **Auth:** Required (must match invite email)

### 7.5 Cancel Pending Invite
- **Method:** `DELETE`
- **Path:** `/api/teams/:id/invites/:inviteId`
- **Auth:** Required (Leader only)

---

## 8. AI Recommendations (`/api/teams/recommendations`)

### 8.1 Get Pure Taxonomy Recommendations
Runs user capability nodes against eligible candidate teams using the V2 Pure Taxonomy In-Memory Engine ($O(K \times N)$ pre-scoring vector).

- **Method:** `POST`
- **Path:** `/api/teams/recommendations`
- **Auth:** Required (User must have an AI resume profile)
- **Request Body:**
  ```json
  {
    "eventId": "cmu25...",
    "sameUniversityOnly": false,
    "topK": 20
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "recommendations": [
      {
        "rank": 1,
        "teamId": "cmu25...",
        "teamName": "AI Agents Guild",
        "university": "Stanford University",
        "description": "Building autonomous agents.",
        "requirements": ["React", "FastAPI"],
        "taxonomyScore": 0.92,
        "sameUniversity": true,
        "isGlobal": true,
        "isEligible": true,
        "recommendationCategory": "BEST",
        "fulfilledRequirementsCount": 2,
        "totalRequirementsCount": 2,
        "requirementBreakdown": [
          {
            "requirementNodeId": "react",
            "requirementName": "React",
            "bestUserSkillName": "React",
            "score": 1.0,
            "explanationText": "Direct canonical match for React (distance 0)",
            "isStrong": true
          },
          {
            "requirementNodeId": "fastapi",
            "requirementName": "FastAPI",
            "bestUserSkillName": "FastAPI",
            "score": 0.85,
            "explanationText": "Demonstrated usage in projects for FastAPI",
            "isStrong": true
          }
        ]
      }
    ],
    "totalEligibleCandidates": 14,
    "userUniversity": "Stanford University",
    "userTaxonomyNodesCount": 8
  }
  ```

> [!NOTE]
> **Frontend Presentation Tiers (`recommendationCategory`):**
> - `"BEST"`: High technical compatibility ($> 0.60$) and same university.
> - `"GOOD_DIFFERENT_UNIVERSITY"`: Strong technical matches from other institutions (for global events).
> - `"SAME_UNIVERSITY_LOWER_SCORE"`: Local university teams with emerging capability overlap.

---

## 9. Universities & Sub-Organizers (`/api/organizers`)

### 9.1 List Universities (`Organization`)
- **Method:** `GET`
- **Path:** `/api/organizers/universities`
- **Auth:** Optional
- **Description:** Returns all registered educational institutions. Used by the **First-Time User Onboarding** searchable dropdown to let students pick their university.
- **Response Format:**
  ```json
  [
    {
      "id": "cuid_org_1",
      "clerkOrgId": "org_2N38dK...",
      "name": "Stanford University",
      "slug": "stanford",
      "domain": "stanford.edu",
      "logoUrl": "https://img.clerk.com/...",
      "location": "Stanford, CA",
      "subOrganizersCount": 4,
      "eventsCount": 12,
      "createdAt": "2026-09-01T12:00:00.000Z",
      "updatedAt": "2026-09-15T18:30:00.000Z"
    }
  ]
  ```
- **Onboarding Integration:**
  - The client displays `name`, `location`, and `logoUrl` in the searchable select list.
  - The underlying value bound to each option is `clerkOrgId`.
  - When the user selects an institution, the web app associates the user with that `clerkOrgId` via Clerk, triggering the `organizationMembership.created` webhook which automatically sets `Profile.university`.

### 9.2 Create University Record
- **Method:** `POST`
- **Path:** `/api/organizers/universities`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "clerkOrgId": "org_stanford",
    "name": "Stanford University",
    "slug": "stanford",
    "domain": "stanford.edu",
    "location": "Stanford, CA"
  }
  ```

### 9.3 Get University Details by Clerk Org ID
- **Method:** `GET`
- **Path:** `/api/organizers/universities/:clerkOrgId`
- **Auth:** Optional

### 9.4 List Sub-Organizers (Clubs / Societies)
- **Method:** `GET`
- **Path:** `/api/organizers`
- **Query Parameters:**
  - `orgId`: Filter clubs by university Clerk Organization ID.
  - `search`: Keyword search.

### 9.5 Create Sub-Organizer (Club / Society)
- **Method:** `POST`
- **Path:** `/api/organizers`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "name": "ACM Student Chapter",
    "slug": "acm-stanford",
    "description": "Association for Computing Machinery student body.",
    "website": "https://acm.stanford.edu",
    "email": "acm@stanford.edu",
    "orgId": "org_stanford"
  }
  ```

### 9.6 Get Sub-Organizer Details & Hosted Events
- **Method:** `GET`
- **Path:** `/api/organizers/:id`
- **Auth:** Optional

### 9.7 Update Sub-Organizer
- **Method:** `PATCH` or `PUT`
- **Path:** `/api/organizers/:id`
- **Auth:** Required (Club Admin only)

### 9.8 Add Club Officer / Admin
- **Method:** `POST`
- **Path:** `/api/organizers/:id/members`
- **Auth:** Required (Club Admin only)
- **Request Body:**
  ```json
  {
    "email": "officer@stanford.edu",
    "role": "ADMIN"
  }
  ```

### 9.9 Remove Club Officer / Admin
- **Method:** `DELETE`
- **Path:** `/api/organizers/:id/members/:userId`
- **Auth:** Required (Club Admin only)

---

## 10. Clerk Webhook Endpoints (`/api/webhooks`)

### 10.1 Webhook Configuration & Health Check
- **Method:** `GET`
- **Path:** `/api/webhooks` or `/api/webhooks/config`
- **Auth:** Public
- **Description:** Returns the active external receiving URL configured for Clerk/Svix and reports whether signature verification (`CLERK_WEBHOOK_SECRET`) is loaded.
- **Response Format:**
  ```json
  {
    "status": "active",
    "service": "squadup-clerk-webhook",
    "endpoint": "https://your-ngrok-subdomain.ngrok-free.app/api/webhooks",
    "isCustomUrlConfigured": true,
    "secretConfigured": true
  }
  ```

### 10.2 Clerk Event Receiver
- **Method:** `POST`
- **Path:** `/api/webhooks` or `/api/webhooks/clerk`
- **Configured Receiving URL:** Controlled via environment variable `CLERK_WEBHOOK_URL`.
  - Local Development: e.g. `https://<ngrok-subdomain>.ngrok-free.app/api/webhooks`
  - Production: e.g. `https://api.squadup.dev/api/webhooks`
- **Auth:** Svix Cryptographic Signature Verification (`CLERK_WEBHOOK_SECRET`)
- **Headers Required:**
  - `svix-id`: Unique Svix message ID
  - `svix-timestamp`: Unix timestamp
  - `svix-signature`: Computed HMAC signature
- **Content-Type:** `application/json` (parsed as raw body before signature verification)

#### Supported Events & Sync Behavior

| Category | Event Name | System Action |
| :--- | :--- | :--- |
| **User** | `user.created` | Upserts internal `User` record by `clerkId`, creates initial blank `Profile`. |
| | `user.updated` | Updates user primary `email` and full `name`. |
| | `user.deleted` | Deletes user from DB (cascades profile, memberships), invalidates `teams:*` and `events:*` Redis caches. |
| **Organization** | `organization.created` | Upserts `Organization` (University) record using `clerkOrgId`, name, slug, logo URL, and metadata. Invalidates caches. |
| | `organization.updated` | Updates organization name, slug, and logo in DB. Invalidates caches. |
| | `organization.deleted` | Deletes organization record (unlinks hosted events and teams gracefully). Invalidates caches. |
| **Membership** | `organizationMembership.created` | Upserts `OrganizationMembership` (`org:admin` vs `org:member`). **Auto-synchronizes `Profile.university`** with organization name. Invalidates team caches. |
| | `organizationMembership.updated` | Updates membership role. Auto-synchronizes `Profile.university`. Invalidates team caches. |
| | `organizationMembership.deleted` | Removes `OrganizationMembership` record. Resets `Profile.university = null` if user leaves that university. Invalidates team caches. |


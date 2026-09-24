# SquadUp API Endpoints Specification

This document serves as the primary integration contract for the frontend application (`apps/web`). All endpoints, request bodies, query parameters, authorization headers, and response formats are detailed below.

---

## 1. Global Conventions

- **Base URL:** `http://localhost:3000/api` (default development port).
- **Authentication:** All protected routes require a Clerk session JWT passed in the HTTP Authorization header:
  ```http
  Authorization: Bearer <clerk_jwt_token>
  ```
  *(In the frontend, extract this using Clerk's `await getToken()` or through the authenticated API client).*
- **Content-Type:** `application/json` (except `/api/resume/upload` which is `multipart/form-data` and webhook endpoints which use raw bodies).
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
    "achievements": [
      {
        "title": "Winner - JPMorgan Chase Code for Good",
        "organization": "JPMorgan Chase",
        "award_tier": "Winner",
        "year": "2025",
        "description": "Developed a scalable technology prototype with JPMorgan engineers.",
        "technologies": ["React", "Node.js"]
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
    "bannerConfig": {
      "type": "gradient",
      "gradient": { "color1": "#0f172a", "color2": "#1e3a8a", "angle": 135 },
      "syncTheme": true
    },
    "createdAt": "2026-09-15T08:00:00.000Z",
    "updatedAt": "2026-09-15T09:30:00.000Z"
  }
  ```

### 2.2 Update Profile
Updates user profile fields and **automatically re-indexes `UserTaxonomy` in real-time** if `skills`, `projects`, `experience`, or `achievements` are modified.

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
    "education": [
      { "degree": "B.S. Computer Science", "college": "Stanford University" }
    ],
    "projects": [...],
    "experience": [...],
    "achievements": [
      {
        "title": "Winner - JPMorgan Chase Code for Good",
        "organization": "JPMorgan Chase",
        "award_tier": "Winner",
        "year": "2025",
        "description": "Developed a scalable technology prototype."
      }
    ],
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

### 2.3 Sync Clerk Data
Synchronizes Clerk user data (name, email, avatar image URL) into the internal `User` record.

- **Method:** `POST`
- **Path:** `/api/profile/sync-clerk`
- **Auth:** Required
- **Success Response (`200 OK`):**
  ```json
  {
    "message": "Profile synced successfully",
    "user": { "id": "...", "name": "...", "email": "..." }
  }
  ```

### 2.4 Get Public Candidate Profile
Fetches a candidate's public profile for teammates or recruiters evaluating candidates. Publicly accessible without requiring authentication.

- **Method:** `GET`
- **Path:** `/api/profile/:targetUserId`
- **Auth:** Public / Optional
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
    "achievements": [...],
    "githubUrl": "https://github.com/alexsmith",
    "linkedinUrl": null,
    "hasResume": true,
    "resumeViewUrl": "/api/resume/view/cmu25...",
    "taxonomyNodeIds": ["react", "frontend_development"],
    "bannerConfig": {
      "type": "gradient",
      "gradient": { "color1": "#0f172a", "color2": "#1e3a8a", "angle": 135 },
      "syncTheme": true
    }
  }
  ```

---

## 3. User Preferences Endpoints (`/api/preferences`)

### 3.1 Get Current User Preferences
Retrieves the logged-in user's preferences, including theme settings, notification configurations, and default squad matching options. Auto-initializes default preferences if none exist.

- **Method:** `GET`
- **Path:** `/api/preferences`
- **Auth:** Required
- **Success Response (`200 OK`):**
  ```json
  {
    "id": "cmpref...",
    "userId": "cmu25...",
    "themeMode": "system",
    "palettePreset": "default",
    "primaryColor": "#2563eb",
    "bannerConfig": {
      "type": "gradient",
      "gradient": {
        "color1": "#0f172a",
        "color2": "#1e3a8a",
        "angle": 135
      },
      "syncTheme": true
    },
    "emailNotifications": true,
    "teamInvitesNotification": true,
    "applicationUpdates": true,
    "eventNotifications": true,
    "marketingEmails": false,
    "defaultCampusOnly": false,
    "openToCollaboration": true,
    "preferredRoles": ["Frontend", "AI / ML"],
    "createdAt": "2026-09-15T08:00:00.000Z",
    "updatedAt": "2026-09-15T09:30:00.000Z"
  }
  ```

### 3.2 Update User Preferences
Partially updates user preferences with field whitelisting. Unspecified fields remain untouched.

- **Method:** `PATCH`
- **Path:** `/api/preferences`
- **Auth:** Required
- **Request Body (`UpdateUserPreferencesRequest`):**
  ```json
  {
    "themeMode": "dark",
    "palettePreset": "Emerald Focus",
    "primaryColor": "#059669",
    "bannerConfig": {
      "type": "image",
      "imageUrl": "data:image/jpeg;base64,...",
      "syncTheme": true
    },
    "emailNotifications": true,
    "teamInvitesNotification": true,
    "applicationUpdates": true,
    "eventNotifications": true,
    "marketingEmails": false,
    "defaultCampusOnly": true,
    "openToCollaboration": true,
    "preferredRoles": ["Full Stack", "DevOps / Cloud"]
  }
  ```
- **Success Response (`200 OK`):** Returns the updated `UserPreferences` object.

---

## 4. Resume Endpoints (`/api/resume`)

### 4.1 Upload Resume
Uploads a PDF resume, enforces the 24-hour rate limit, persists the PDF directly to **Neon S3 Object Storage** (`s3://resumes/:userId.pdf`) with local filesystem fallback, updates `Profile.resumePdfPath`, and enqueues BullMQ AI parsing.

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
  *(Returned when a user uploads more than once in 24 hours. Bypassed in dev mode).*
  ```json
  {
    "error": "Rate limit exceeded. You can only upload a resume once every 24 hours.",
    "nextAvailableAt": "2026-09-16T09:00:00.000Z"
  }
  ```

### 4.2 Poll Resume Parsing Status
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
        "summary": "Full Stack Developer passionate about scalable cloud systems...",
        "skills": ["React", "FastAPI", "PostgreSQL"],
        "education": [...],
        "experience": [...],
        "projects": [...]
      }
    }
    ```
  - When failed: `{"jobId": "14", "state": "failed", "error": "..."}`

### 4.3 Stream User Resume PDF (Inline Browser View)
Streams the current user's uploaded resume directly from Neon S3 Object Storage as `application/pdf` with `Content-Disposition: inline`.

- **Method:** `GET`
- **Path:** `/api/resume/view`
- **Auth:** Required

### 4.4 Stream Candidate Resume PDF
Streams a prospective candidate's resume PDF from Neon S3 Object Storage for squad leader review. Accepts internal `User.id` or `clerkId`.

- **Method:** `GET`
- **Path:** `/api/resume/view/:targetUserId`
- **Auth:** Required

---

## 5. Events Endpoints (`/api/events`)

### 5.1 List Events (Paginated + Cached)
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

### 5.2 Get Event Details
Fetches detailed event metadata, organizer info, team count, and team previews. Cached in Redis with a dynamic TTL proportional to the event date.

- **Method:** `GET`
- **Path:** `/api/events/:id`
- **Auth:** Optional

### 5.3 Create Event
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
- **Success Response (`201 Created`):** Returns created `Event` record.

### 5.4 Update Event
Updates an event. Caller must be the event creator (`organizerId`) or an admin of the linked `organizerProfile`.

- **Method:** `PATCH` or `PUT`
- **Path:** `/api/events/:id`
- **Auth:** Required

### 5.5 Delete Event
Deletes an event and cascades to teams/members. Caller must be the event creator.

- **Method:** `DELETE`
- **Path:** `/api/events/:id`
- **Auth:** Required

### 5.6 List Teams for an Event
- **Method:** `GET`
- **Path:** `/api/events/:id/teams`
- **Auth:** Optional

---

## 6. Teams Endpoints (`/api/teams`)

### 6.1 List Teams (Paginated + Filtered + Capacity Computation)
- **Method:** `GET`
- **Path:** `/api/teams`
- **Auth:** Optional
- **Query Parameters:**
  - `page`: Page number (default: `1`).
  - `limit`: Items per page (default: `10`, max: `50`).
  - `eventId`: Filter by event ID.
  - `myTeams`: `"true"` | `"false"` (filters teams where caller is a member).
  - `openSpotsOnly`: `"true"` | `"false"` (filters teams with remaining capacity).
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
        "maxCapacity": 4,
        "roles": [
          {
            "id": "cmrole1",
            "title": "Frontend Lead",
            "skills": ["React", "TypeScript"],
            "spots": 0,
            "assignedToId": "cmu25..."
          },
          {
            "id": "cmrole2",
            "title": "AI / ML Engineer",
            "skills": ["PyTorch", "FastAPI"],
            "spots": 1,
            "assignedToId": null
          }
        ],
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

### 6.2 Get Team Details
- **Method:** `GET`
- **Path:** `/api/teams/:id`
- **Auth:** Optional / Recommended (members/leaders receive pending `invites` and `applications`).
- **Success Response (`200 OK`):**
  ```json
  {
    "id": "cmu25...",
    "name": "AI Agents Guild",
    "maxCapacity": 4,
    "roles": [...],
    "members": [...],
    "invites": [...],
    "applications": [...],
    "event": { ... }
  }
  ```

### 6.3 Create Team (with Structured Roles & Leader Assignment)
Creates a team, provisions `TeamRole` records, resolves taxonomy nodes in `TeamTaxonomy.roleTaxonomies`, assigns caller as `Leader`, decrements leader's chosen role spots, and dispatches optional initial invites via BullMQ SMTP.

- **Method:** `POST`
- **Path:** `/api/teams`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "eventId": "cmu25...",
    "name": "AI Agents Guild",
    "requirements": ["React", "FastAPI", "PostgreSQL"],
    "roles": [
      {
        "title": "Frontend Lead",
        "skills": ["React", "NextJS", "TypeScript"],
        "spots": 1
      },
      {
        "title": "AI / ML Specialist",
        "skills": ["PyTorch", "FastAPI"],
        "spots": 2
      }
    ],
    "leaderRoleId": "Frontend Lead",
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

### 6.4 Update Team
Updates team metadata and roles. **If `roles` or `requirements` are changed, automatically triggers AI taxonomy re-indexing for the squad.** Caller must be team `Leader`.

- **Method:** `PATCH` or `PUT`
- **Path:** `/api/teams/:id`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "name": "Updated Team Name",
    "requirements": ["Next.js", "PyTorch", "Tailwind CSS"],
    "roles": [
      { "title": "Full Stack Lead", "skills": ["Next.js", "Tailwind CSS"], "spots": 1 }
    ],
    "university": "Stanford University"
  }
  ```

### 6.5 Delete Team
Deletes a team and cascades to members/applications/invites. Caller must be team `Leader` or parent `Event` organizer.

- **Method:** `DELETE`
- **Path:** `/api/teams/:id`
- **Auth:** Required

### 6.6 Leave Team (Opt-Out)
Caller leaves the team.
- If a regular `Member`: removes membership row.
- If the `Leader`: automatically promotes the next earliest joined member to `Leader`. If the leader was the sole member, the team is deleted.

- **Method:** `DELETE`
- **Path:** `/api/teams/:id/leave`
- **Auth:** Required

### 6.7 Remove Member
Leader removes a member from the team.

- **Method:** `DELETE`
- **Path:** `/api/teams/:id/members/:userId`
- **Auth:** Required (Leader only)

### 6.8 AI Smart Team Recommendations
Runs candidate capability nodes against eligible candidate squads in-process (< 15ms) using the deterministic single-parent taxonomy graph. Evaluates candidate fit strictly against open designated roles (`spots > 0` and unassigned) to return `bestMatchingRole`, or falls back to squad requirement scoring (`bestMatchingRole: null`) if all roles are occupied.

- **Method:** `POST`
- **Path:** `/api/teams/recommendations`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "eventId": "cmu25...", // Optional: filter to squads in this event
    "sameUniversityOnly": false, // Optional: filter strictly to user's campus
    "topK": 50 // Optional: max recommendations (default 50)
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
        "description": "Autonomous dev tooling",
        "requirements": ["FastAPI", "React", "Docker"],
        "taxonomyScore": 0.95,
        "sameUniversity": true,
        "isGlobal": true,
        "isEligible": true,
        "recommendationCategory": "BEST",
        "fulfilledRequirementsCount": 3,
        "totalRequirementsCount": 3,
        "bestMatchingRole": {
          "roleId": "cmrole123",
          "roleTitle": "Frontend Architect",
          "score": 0.95,
          "fulfilledCount": 3,
          "totalCount": 3,
          "skills": ["React", "TypeScript", "Tailwind CSS"]
        },
        "requirementBreakdown": [
          {
            "requirementNodeId": "fastapi",
            "requirementName": "FastAPI",
            "bestUserSkillName": "FastAPI",
            "score": 1.0,
            "matchType": "exact",
            "explanationText": "Direct canonical exact match with 'FastAPI' (Score: 1.0)",
            "isStrong": true
          }
        ]
      }
    ],
    "totalEligibleCandidates": 14,
    "userUniversity": "Stanford University",
    "userTaxonomyNodesCount": 12
  }
  ```

---

## 7. Team Applications Endpoints (`/api/teams` & `/api/applications`)

### 7.1 Apply to Join a Team (with Target Role)
Submits a join application, optionally targeting a specific open `TeamRole`.

- **Method:** `POST`
- **Path:** `/api/teams/:id/apply`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "message": "Hey, I'd love to join as the Frontend Lead!",
    "roleId": "cmrole123",
    "roleTitle": "Frontend Architect"
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

### 7.2 Withdraw Application
Candidate withdraws their pending application.
- **Method:** `DELETE`
- **Path:** `/api/teams/:id/apply` or `/api/teams/applications/:applicationId` or `/api/applications/:applicationId`
- **Auth:** Required (Applicant only)

### 7.3 Get My Submitted Applications
Retrieves all applications submitted by the logged-in candidate.
- **Method:** `GET`
- **Path:** `/api/teams/applications/my-applications` or `/api/applications/my-applications`
- **Auth:** Required

### 7.4 Get Incoming Applications (Squad Leader Dashboard)
Retrieves incoming candidate applications across all teams led by the current user.
- **Method:** `GET`
- **Path:** `/api/teams/applications/incoming` or `/api/applications/incoming`
- **Auth:** Required (Leader only)
- **Query Parameters:**
  - `teamId`: Optional filter by team.
  - `status`: Optional filter (`"PENDING"`, `"ACCEPTED"`, `"REJECTED"`).

### 7.5 Get Single Application Details
- **Method:** `GET`
- **Path:** `/api/teams/applications/:applicationId` or `/api/applications/:applicationId`
- **Auth:** Required (Applicant or Squad Leader only)

### 7.6 Accept Application
Leader accepts applicant $\to$ adds user as `TeamMember` (`role: "Member"`) and claims role spot if designated.
- **Method:** `POST`
- **Path:** `/api/teams/applications/:applicationId/accept` or `/api/applications/:applicationId/accept`
- **Auth:** Required (Leader only)

### 7.7 Reject Application
Leader rejects applicant $\to$ sets status to `"REJECTED"`.
- **Method:** `POST`
- **Path:** `/api/teams/applications/:applicationId/reject` or `/api/applications/:applicationId/reject`
- **Auth:** Required (Leader only)

---

## 8. Team Invites Endpoints (`/api/teams`)

### 8.1 Send Role-Based Team Invites
Squad Leader invites email addresses with optional designated `TeamRole` assignment and required technologies. Sends in-app PostgreSQL notification, real-time Redis Pub/Sub SSE alert, and transactional email via Nodemailer SMTP.

- **Method:** `POST`
- **Path:** `/api/teams/:id/invites`
- **Auth:** Required (Leader only)
- **Request Body:**
  ```json
  {
    "roleId": "cmrole123",
    "roleTitle": "Full Stack Lead",
    "roleSkills": ["React", "Node.js", "PostgreSQL"],
    "invites": ["sarah@college.edu", "david@college.edu"]
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "message": "2 invitation(s) sent successfully.",
    "successful": ["sarah@college.edu", "david@college.edu"],
    "failed": []
  }
  ```

### 8.2 Get My Pending Invites
Fetches all pending invites addressed to the logged-in user's email address with enriched role metadata.
- **Method:** `GET`
- **Path:** `/api/teams/invites/my-invites`
- **Auth:** Required

### 8.3 Get Invite by ID (Direct Invite Links)
Fetches a single pending invite by its unique ID for deep links (`/team/:teamId?inviteId=:inviteId`).
- **Method:** `GET`
- **Path:** `/api/teams/invites/:inviteId`
- **Auth:** Optional / Open (fetches invite context, team, role, and requirements)
- **Success Response (`200 OK`):**
  ```json
  {
    "id": "cminv123",
    "teamId": "cmteam456",
    "teamName": "AI Agents Guild",
    "eventId": "cmevent789",
    "eventTitle": "TreeHacks 2026",
    "isGlobal": true,
    "senderId": "cmuser1",
    "senderName": "Jane Doe",
    "email": "invitee@stanford.edu",
    "roleId": "cmrole123",
    "roleTitle": "Frontend Architect",
    "roleSkills": ["React", "TypeScript"],
    "membersCount": 3,
    "requirements": ["React", "TypeScript", "FastAPI"],
    "status": "PENDING",
    "createdAt": "2026-09-24T00:00:00.000Z"
  }
  ```

### 8.4 Accept Team Invite
Accepts the invitation. Atomically assigns the role spot to the user, claims the spot, adds user to `TeamMember`, and sends a live `TEAM_JOINED` notification to the squad leader.
- **Method:** `POST`
- **Path:** `/api/teams/invites/:inviteId/accept`
- **Auth:** Required (must match invite email)

### 8.5 Decline Team Invite
- **Method:** `POST`
- **Path:** `/api/teams/invites/:inviteId/decline`
- **Auth:** Required (must match invite email)

### 8.6 Cancel Pending Invite
Squad leader cancels an outgoing pending invitation.
- **Method:** `DELETE`
- **Path:** `/api/teams/:id/invites/:inviteId`
- **Auth:** Required (Leader only)

---

## 9. AI Recommendations Endpoints (`/api/teams/recommendations`)

### 9.1 Get Pure Taxonomy & Role Recommendations
Runs user capability nodes against eligible candidate teams using the V2 Pure Taxonomy In-Memory Engine ($O(K \times N)$ pre-scoring vector) in sub-15ms.

- **Method:** `POST`
- **Path:** `/api/teams/recommendations`
- **Auth:** Required
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
        "bestMatchingRole": {
          "roleId": "cmrole1",
          "roleTitle": "Frontend Lead",
          "score": 0.96,
          "fulfilledCount": 2,
          "totalCount": 2,
          "skills": ["React", "TypeScript"]
        },
        "requirementBreakdown": [
          {
            "requirementNodeId": "react",
            "requirementName": "React",
            "bestUserSkillName": "React",
            "score": 1.0,
            "explanationText": "Direct canonical match for React (distance 0)",
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

---

## 10. Universities & Sub-Organizers (`/api/organizers`)

### 10.1 List Universities (`Organization`)
- **Method:** `GET`
- **Path:** `/api/organizers/universities`
- **Auth:** Optional

### 10.2 Select University (Onboarding & Membership Sync)
- **Method:** `POST`
- **Path:** `/api/organizers/universities/select`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "clerkOrgId": "org_3IHwqmkzEfISGzP4JQGimqIz8WM"
  }
  ```

### 10.3 Create University Record
- **Method:** `POST`
- **Path:** `/api/organizers/universities`
- **Auth:** Required

### 10.4 Get University Details by Clerk Org ID
- **Method:** `GET`
- **Path:** `/api/organizers/universities/:clerkOrgId`
- **Auth:** Optional

### 10.5 List Sub-Organizers (Clubs / Societies)
- **Method:** `GET`
- **Path:** `/api/organizers`
- **Query Parameters:**
  - `orgId`: Filter clubs by university Clerk Organization ID.
  - `search`: Keyword search.

### 10.6 Create Sub-Organizer (Club / Society)
- **Method:** `POST`
- **Path:** `/api/organizers`
- **Auth:** Required

### 10.7 Get Sub-Organizer Details
- **Method:** `GET`
- **Path:** `/api/organizers/:id`
- **Auth:** Optional

### 10.8 Update Sub-Organizer
- **Method:** `PATCH` or `PUT`
- **Path:** `/api/organizers/:id`
- **Auth:** Required (Club Admin only)

### 10.9 Add Club Officer / Admin
- **Method:** `POST`
- **Path:** `/api/organizers/:id/members`
- **Auth:** Required (Club Admin only)

### 10.10 Remove Club Officer / Admin
- **Method:** `DELETE`
- **Path:** `/api/organizers/:id/members/:userId`
- **Auth:** Required (Club Admin only)

---

## 11. Notifications & Real-Time SSE Stream (`/api/notifications`)

### 11.1 List User Notifications
Returns paginated in-app notifications and the current unread counter.
- **Method:** `GET`
- **Path:** `/api/notifications`
- **Auth:** Required
- **Query Parameters:**
  - `page`: Page number (default: `1`).
  - `limit`: Items per page (default: `30`).
  - `unreadOnly`: `"true"` | `"false"` (default: `false`).

### 11.2 Mark Single Notification as Read
- **Method:** `PATCH`
- **Path:** `/api/notifications/:id/read`
- **Auth:** Required

### 11.3 Mark All Notifications as Read
- **Method:** `POST`
- **Path:** `/api/notifications/read-all`
- **Auth:** Required

### 11.4 Real-Time Notification SSE Stream
Subscribes the client to a live HTTP Server-Sent Events stream. The server attaches the client to Redis Pub/Sub channels for user-specific alerts (`sq:user:<userId>`) and campus-wide event announcements (`sq:campus:<orgId>`). Keepalive heartbeats are sent every 25 seconds.
- **Method:** `GET`
- **Path:** `/api/notifications/stream`
- **Auth:** Required (`Authorization: Bearer <clerk_jwt>`)
- **Headers:** `Accept: text/event-stream`

---

## 12. Clerk Webhook Endpoints (`/api/webhooks`)

### 12.1 Webhook Health & Config Check
- **Method:** `GET`
- **Path:** `/api/webhooks` or `/api/webhooks/config`
- **Auth:** Public

### 12.2 Clerk Event Receiver
- **Method:** `POST`
- **Path:** `/api/webhooks` or `/api/webhooks/clerk`
- **Auth:** Svix Cryptographic Signature Verification (`CLERK_WEBHOOK_SECRET`)
- **Headers Required:** `svix-id`, `svix-timestamp`, `svix-signature`
- **Supported Events:** `user.created`, `user.updated`, `user.deleted`, `organization.created`, `organization.updated`, `organization.deleted`, `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`.

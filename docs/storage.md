# 🗄️ SquadUp Object Storage Architecture & Reference Guide

This document is the **authoritative reference** for file storage in SquadUp, focusing on **Neon S3-Compatible Object Storage** for candidate resumes, local disk fallback mechanisms, and secure PDF streaming.

---

## 📂 Core Files

| Scope | File | Description |
| :--- | :--- | :--- |
| **Storage Service** | `apps/api/src/services/storage.service.ts` | Centralized `@aws-sdk/client-s3` storage service managing resume uploads, streaming reads, deletions, and local filesystem fallback. |
| **Neon Config** | `neon.ts` | Neon project configuration declaring private and public storage buckets (`resumes`). |
| **Resume Controller** | `apps/api/src/controllers/resume.controller.ts` | HTTP controller handling `POST /api/resume/upload`, `GET /api/resume/view`, and `GET /api/resume/view/:targetUserId`. |
| **Database Schema** | `apps/api/prisma/schema.prisma` | `Profile.resumePdfPath` storing `s3://resumes/<userId>.pdf` or local filepath. |

---

## 1. 🏗️ Storage Topology & Architecture

SquadUp uses an **S3-compatible Object Storage** model powered by **Neon Object Storage** with transparent fallback to local disk storage (`uploads/resumes/`) for offline local development.

```
                    ┌───────────────────────────────┐
                    │    Resume Upload / Request    │
                    │   (User or Squad Recruiter)   │
                    └──────────────┬────────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────────┐
                    │       StorageService          │
                    │ (apps/api/src/services/       │
                    │     storage.service.ts)       │
                    └──────────────┬────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 │ S3 Credentials Configured?        │
                 ▼                                   ▼
        [YES: Production / Cloud]           [NO: Offline Local Dev]
 ┌───────────────────────────────┐   ┌───────────────────────────────┐
 │ Neon S3 Object Storage Bucket │   │ Local Filesystem Directory    │
 │ (Bucket: "resumes", Private)  │   │ (`uploads/resumes/:userId.pdf`)│
 ├───────────────────────────────┤   ├───────────────────────────────┤
 │ • Key: `${userId}.pdf`        │   │ • Path: Absolute local disk   │
 │ • URI: `s3://resumes/...`     │   │ • Created automatically       │
 │ • Streaming GetObjectCommand  │   │ • fs.createReadStream         │
 └───────────────────────────────┘   └───────────────────────────────┘
```

---

## 2. 🔐 Neon Bucket Policy & Configuration

Storage buckets are declared in the root `neon.ts` file and deployed to the active Neon project:

```typescript
// neon.ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    buckets: {
      resumes: { access: "private" },
    },
  },
});
```

- **Deployment Command:** `neon deploy`
- **Access Level:** `private` — Resumes are not publicly world-readable. Access is strictly controlled through authenticated API endpoints (`/api/resume/view` and `/api/resume/view/:targetUserId`).

---

## 3. ⚙️ Environment Variables

When linked via `neon link --project-id <id> --branch production -y`, Neon injects the required S3 credentials into `.env`:

```env
# Neon S3 Object Storage Credentials
AWS_ENDPOINT_URL_S3="https://ep-broad-feather-b32fcorf.c-4.ap-southeast-1.aws.neon.tech/s3"
AWS_REGION="auto"
AWS_ACCESS_KEY_ID="neondb_..."
AWS_SECRET_ACCESS_KEY="..."
NEON_RESUME_BUCKET="resumes"
```

---

## 4. 🚀 Storage Operations

### 4.1 Uploading a Resume (`uploadResumePdf`)
When a user uploads a resume:
1. `StorageService.uploadResumePdf(userId, buffer, originalFilename)` checks for S3 credentials.
2. If S3 is enabled, sends a `PutObjectCommand` to the `resumes` bucket with:
   - `Key`: `${userId}.pdf`
   - `ContentType`: `"application/pdf"`
   - `Metadata`: `{ originalFilename, userId }`
   - Returns URI string: `s3://resumes/${userId}.pdf`
3. If S3 is unavailable, writes the buffer to `uploads/resumes/${userId}.pdf` and returns the local path.
4. The URI / path is stored in `Profile.resumePdfPath`.

### 4.2 Streaming a Resume (`getResumePdfStream`)
When a user or squad leader views a candidate's resume:
1. `StorageService.getResumePdfStream(filePathOrUri)` detects the URI format.
2. If `s3://`:
   - Parses bucket and object key.
   - Dispatches `GetObjectCommand`.
   - Returns `{ stream: res.Body as Readable, contentLength: res.ContentLength }`.
3. If local filepath:
   - Checks `fs.existsSync(filePathOrUri)`.
   - Returns `{ stream: fs.createReadStream(...), contentLength: stat.size }`.
4. The controller pipes the readable stream to the HTTP response with headers:
   - `Content-Type: application/pdf`
   - `Content-Disposition: inline; filename="<original_name>.pdf"`
   - `Content-Length: <bytes>`

### 4.3 Deleting a Resume (`deleteResumePdf`)
When a user account is deleted or replaced:
1. `StorageService.deleteResumePdf(filePathOrUri)` sends `DeleteObjectCommand` to S3 or removes the local file via `fs.promises.unlink()`.

---

## 5. ⚠️ Security & Architectural Guidelines

1. **Never Expose S3 Object URLs Publicly:** Resume PDFs contain sensitive candidate contact info, educational records, and addresses. All access must flow through authenticated Express route handlers that verify authorization.
2. **Deterministic Object Keys:** Objects in S3 use `${userId}.pdf` keys. This guarantees atomic overwrites when a user updates their resume without leaving orphaned objects in the storage bucket.
3. **Graceful Fallback:** Never allow storage failures to crash the API server. If S3 connectivity is interrupted, log a warning and fall back seamlessly to local disk.

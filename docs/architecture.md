# System Architecture

## Architecture Overview

SquadUp utilizes a **Hybrid Microservice Architecture** managed within a Turborepo monorepo.

The system is designed to provide ultra-fast standard web API responses while seamlessly offloading computationally heavy AI tasks. It achieves this by separating the core Node.js backend from a specialized Python AI service, connected via a Redis-backed job queue.

## Component Architecture

- **Frontend (`apps/web`):** React application built with Vite. Communicates with the Backend API over HTTP.
- **Backend API (`apps/api`):** Node.js Express application written in TypeScript. It is the primary gateway for all frontend requests, directly manages the PostgreSQL database via Prisma, and acts as the producer for the job queue.
- **AI Service (`apps/ai-service`):** Python FastAPI application. Exists solely to run computationally heavy Python libraries (like `pdfplumber`) and interface with AI/LLM endpoints. It does *not* talk to the database directly.
- **Job Queue:** BullMQ backed by Redis. Orchestrates the communication between the Backend API and the AI Service.
- **Database:** PostgreSQL extended with `pgvector`.
- **Authentication:** Clerk SDK, providing JWTs and managing organizations.

## Request/Data Flows

### Document Parsing Flow (Resume to Profile)

1. **User** uploads a PDF via the Frontend.
2. **Backend API (`resume.controller.ts`)** receives the `multipart/form-data` upload.
3. Backend converts the file to a base64 string and pushes a `parse-resume` job to the **Redis Queue**. It immediately returns a HTTP 202 Accepted to the frontend with a `jobId`.
4. **Node Worker (`ai.queue.ts`)** picks up the job.
5. Worker sends a blocking HTTP POST request containing the base64 string to the **Python AI Service**.
6. **AI Service (`resume_parser.py`)** decodes the PDF, extracts raw text using `pdfplumber`, and prompts the **Groq API** to format the text into a predefined JSON schema.
7. AI Service returns the pristine JSON to the Node Worker.
8. Node Worker receives the JSON and **upserts** it into the PostgreSQL `Profile` table.

## Database Interaction

- **Exclusive Access:** The Node.js Express Backend (`apps/api`) has exclusive access to the PostgreSQL database. The Python AI service never queries the database directly.
- **ORM:** All queries and mutations are performed using Prisma Client.

## Authentication Flow

Authentication heavily leverages Clerk, but utilizes a decoupled architecture to protect the database from vendor lock-in.

1. Clerk manages the frontend session and provides a JWT.
2. When a user creates an account, Clerk sends a webhook to `webhook.controller.ts`.
3. The Backend creates an internal Postgres `User` with a native `cuid()` as its primary key (`id`), and stores the Clerk ID in a unique `clerkId` column.
4. When an authenticated request hits the API, `getAuth(req)` extracts the Clerk ID.
5. The API calls `getOrCreateUserByClerkId(clerkId)`. This fetches the internal `cuid()` for database operations. If the user is missing (e.g., webhook failed locally), it acts as a resilient fallback, fetching the profile from Clerk's API and creating the row just-in-time.

## AI/RAG Architecture

### Currently Implemented
- **Document Ingestion:** PDF upload via API.
- **Parsing:** Text extraction via `pdfplumber` (Python).
- **LLM Generation:** Instructing an LLM (via Groq API) to structure chaotic resume text into a strict JSON schema containing `skills`, `education`, `experience`, and `projects`.

### Planned (Not yet implemented)
- **Embedding Generation:** Vectorizing user skills and team requirements.
- **Vector Storage:** Storing vectors in the `Unsupported("vector(384)")` fields in Prisma.
- **Similarity Search:** Performing cosine similarity queries using `pgvector` to match students to teams.

## Architectural Constraints

- **Do not block the Node event loop:** Any task involving file processing, external LLM calls, or heavy computation MUST be dispatched to the `ai.queue.ts` BullMQ queue.
- **Keep Python isolated:** The Python service must remain stateless and pure. It should take raw data, process it, and return a result. It should never connect to the database.
- **Clerk Decoupling:** Never use the Clerk string ID (e.g., `user_2...`) as a foreign key in Postgres. Always map it to the internal `cuid()` via the auth utility.

# SquadUp

**SquadUp** is a professional team-forming and event-hosting platform built specifically for universities, hackathons, and tech events. It empowers students to easily scout for teammates based on specific skills, and allows event organizers to host and manage events seamlessly.

By leveraging AI, SquadUp removes the friction of manual data entry by automatically parsing uploaded resumes into structured profiles, and eventually using vector embeddings to semantically match students to the perfect team.

---

## 🚀 Features

### Currently Implemented
- **Hybrid Microservice Architecture:** 
  - A core **Node.js (Express)** backend handling standard CRUD and API requests.
  - A **Python (FastAPI)** AI microservice dedicated to heavy data processing.
- **Asynchronous Job Queuing:** Powered by **Redis** and **BullMQ**, ensuring the AI microservice never gets overwhelmed by simultaneous requests.
- **AI Resume Parsing:** Users upload a PDF resume, which is parsed locally via `pdfplumber` and structured into a pristine JSON profile using the Groq LLM API.
- **Advanced Database:** **PostgreSQL** configured with the `pgvector` extension via **Prisma ORM**, preparing the system for semantic search capabilities.

### Future Roadmap (In Progress)
- **React Frontend (Phase 2):** A clean, professional, and accessible web interface for uploading resumes, viewing profiles, and joining teams.
- **Semantic Team Matchmaking (Phase 3):** Generating vector embeddings for user profiles and team requirements to power intelligent "Find Teammates" and "Scout Teams" search functionality.
- **Real-time Notifications:** WebSockets or SSE for instant updates when joining a team or event.

---

## 🏗️ Architecture & Folder Structure

This project is structured as a **pnpm Turborepo**:

```text
.
├── apps
│   ├── api          # Node.js (Express) Core API + BullMQ Queues + Prisma
│   ├── ai-service   # Python (FastAPI) Microservice for AI processing
│   └── web          # React (Vite) Frontend UI
├── packages
│   └── shared       # Shared TypeScript types across the monorepo
├── docker-compose.yml # PostgreSQL (pgvector) and Redis infrastructure
└── ...
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) (For Postgres and Redis)
- [Node.js](https://nodejs.org/) & [pnpm](https://pnpm.io/)
- Python 3.10+ (For the AI microservice)

### 2. Infrastructure Setup
Start the local PostgreSQL (`pgvector`) and Redis containers:
```bash
docker-compose up -d
```

### 3. Environment Variables
Copy `.env.example` to `.env` in the root directory and fill in your keys:
```bash
cp .env.example .env
```
*(Make sure to add your `GROQ_API_KEY` for the AI parsing to work!)*

### 4. Install Dependencies & Sync Database
Install node dependencies and push the Prisma schema to your database:
```bash
pnpm install
cd apps/api
pnpm run db:push
pnpm run db:generate
cd ../../
```

### 5. Setup Python Virtual Environment
Navigate to the AI service and install the Python dependencies:
```bash
cd apps/ai-service
python -m venv venv
.\venv\Scripts\activate    # On Windows
# source venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
cd ../../
```

---

## 💻 Running the App

Start the entire stack (React frontend, Node API, and Python microservice) simultaneously from the root directory:

```bash
pnpm run dev
```

- **Frontend:** http://localhost:5173
- **Node API:** http://localhost:3000
- **Python AI API:** http://localhost:8000

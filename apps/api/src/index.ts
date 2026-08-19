import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import { aiQueue, aiWorker } from "./queues/ai.queue";
import type { Event, Team, User } from "@squadup/shared";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const upload = multer(); // Memory storage for files

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "squadup-api"
  });
});

// Upload resume and add to BullMQ queue
app.post("/api/resume/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Assuming user auth is implemented and we get userId from req.user
  const userId = "temp-user-id"; 
  const fileBuffer = req.file.buffer.toString("base64");
  const filename = req.file.originalname;

  try {
    const job = await aiQueue.add("parse-resume", {
      userId,
      fileBuffer,
      filename
    });
    
    return res.status(202).json({ 
      message: "Resume uploaded successfully and added to processing queue.",
      jobId: job.id 
    });
  } catch (error) {
    console.error("Queue error:", error);
    return res.status(500).json({ error: "Failed to queue resume for processing" });
  }
});

// Polling endpoint to check status of the AI Job
app.get("/api/resume/status/:jobId", async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await aiQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return res.json({
      jobId,
      state, // 'waiting', 'active', 'completed', 'failed', etc.
      result: state === 'completed' ? result : null,
      error: state === 'failed' ? failedReason : null
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch job status" });
  }
});

app.get("/example", (_request, response) => {
  const user: User = {
    id: "user_1",
    name: "SquadUp User",
    email: "user@squadup.local",
    createdAt: new Date().toISOString()
  };

  const team: Team = {
    id: "team_1",
    name: "Launch Squad",
    memberIds: [user.id],
    createdAt: new Date().toISOString()
  };

  const event: Event = {
    id: "event_1",
    teamId: team.id,
    title: "First SquadUp Event",
    startsAt: new Date().toISOString()
  };

  response.json({ user, team, event });
});

app.listen(port, () => {
  console.log(`SquadUp API running on http://localhost:${port}`);
});

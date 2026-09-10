import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { aiQueue } from "../queues/ai.queue.js";
import { UploadResumeResponse, ResumeStatusResponse } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";

export const uploadResume = async (req: Request, res: Response<UploadResumeResponse | {error: string}>) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const fileBuffer = req.file.buffer.toString("base64");
  const filename = req.file.originalname;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const job = await aiQueue.add("parse-resume", {
      userId: userId,
      fileBuffer,
      filename
    });
    
    return res.status(202).json({ 
      message: "Resume uploaded successfully and added to processing queue.",
      jobId: job.id as string
    });
  } catch (error) {
    console.error("Queue error:", error);
    return res.status(500).json({ error: "Failed to queue resume for processing" });
  }
};

export const getResumeStatus = async (req: Request, res: Response<ResumeStatusResponse | {error: string}>) => {
  const { jobId } = req.params;
  
  try {
    const job = await aiQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    if (state === 'completed') {
      return res.json({ jobId, state: "completed", result: result as any });
    } else if (state === 'failed') {
      return res.json({ jobId, state: "failed", error: failedReason || "Unknown error" });
    } else {
      return res.json({ jobId, state: state as any });
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch job status" });
  }
};

import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { aiQueue } from "../queues/ai.queue";

export const uploadResume = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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
};

export const getResumeStatus = async (req: Request, res: Response) => {
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
};

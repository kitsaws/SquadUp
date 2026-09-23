import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { prisma } from "../lib/prisma.js";
import fs from "fs";
import path from "path";
import { aiQueue } from "../queues/ai.queue.js";
import { UploadResumeResponse, ResumeStatusResponse } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { StorageService } from "../services/storage.service.js";

const RESUME_STORAGE_DIR = path.resolve(process.cwd(), "uploads", "resumes");

// Ensure storage directory exists
if (!fs.existsSync(RESUME_STORAGE_DIR)) {
  fs.mkdirSync(RESUME_STORAGE_DIR, { recursive: true });
}

// User-configured emails that bypass the 24-hour rate limit during testing/dev
export const getRateLimitBypassEmails = (): string[] => {
  const envEmails = process.env.RATE_LIMIT_BYPASS_EMAILS || process.env.ADMIN_EMAILS || "";
  return envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
};

export function isResumeRateLimitBypassed(email: string): boolean {
  if (process.env.BYPASS_RESUME_RATE_LIMIT === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  const bypassList = getRateLimitBypassEmails();
  return bypassList.includes(email.toLowerCase());
}

export const uploadResume = async (req: Request, res: Response<UploadResumeResponse | { error: string; nextAvailableAt?: string }>) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  // 1. Check 24-Hour Rate Limiting
  const existingProfile = await prisma.profile.findUnique({
    where: { userId: userInDb.id },
  });

  const bypassed = isResumeRateLimitBypassed(userInDb.email);
  if (!bypassed && existingProfile?.lastResumeUploadedAt) {
    const elapsedMs = Date.now() - existingProfile.lastResumeUploadedAt.getTime();
    const cooldownMs = 24 * 60 * 60 * 1000;

    if (elapsedMs < cooldownMs) {
      const nextAvailableAt = new Date(existingProfile.lastResumeUploadedAt.getTime() + cooldownMs);
      return res.status(429).json({
        error: "Rate limit exceeded. You can only upload a resume once every 24 hours.",
        nextAvailableAt: nextAvailableAt.toISOString(),
      });
    }
  }

  // 2. Persist PDF to Neon Object Storage (or local storage fallback)
  const filename = req.file.originalname;

  try {
    const savedPathOrUri = await StorageService.uploadResumePdf(
      userInDb.id,
      req.file.buffer,
      filename
    );

    // Update Profile with file metadata and upload timestamp
    await prisma.profile.upsert({
      where: { userId: userInDb.id },
      update: {
        resumePdfPath: savedPathOrUri,
        resumeOriginalName: filename,
        lastResumeUploadedAt: new Date(),
      },
      create: {
        userId: userInDb.id,
        resumePdfPath: savedPathOrUri,
        resumeOriginalName: filename,
        lastResumeUploadedAt: new Date(),
        skills: [],
      },
    });
  } catch (fileErr) {
    console.error("[Resume Controller] Error saving resume file:", fileErr);
    return res.status(500).json({ error: "Failed to save resume file." });
  }

  // 3. Queue AI Parsing Job
  const fileBufferBase64 = req.file.buffer.toString("base64");
  try {
    const job = await aiQueue.add("parse-resume", {
      userId: userId,
      fileBuffer: fileBufferBase64,
      filename,
    });

    return res.status(202).json({
      message: "Resume uploaded successfully and added to processing queue.",
      jobId: job.id as string,
    });
  } catch (error) {
    console.error("[Resume Controller] Queue error:", error);
    return res.status(500).json({ error: "Failed to queue resume for processing." });
  }
};

export const viewResume = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: userInDb.id },
    });

    if (!profile || !profile.resumePdfPath) {
      return res.status(404).json({ error: "Resume PDF not found." });
    }

    const fileData = await StorageService.getResumePdfStream(profile.resumePdfPath);
    if (!fileData) {
      return res.status(404).json({ error: "Resume PDF file could not be retrieved." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${profile.resumeOriginalName || "resume.pdf"}"`
    );
    if (fileData.contentLength) {
      res.setHeader("Content-Length", fileData.contentLength);
    }
    return fileData.stream.pipe(res);
  } catch (error) {
    console.error("[Resume Controller] Error serving resume:", error);
    return res.status(500).json({ error: "Failed to load resume PDF." });
  }
};

export const viewCandidateResume = async (req: Request, res: Response) => {
  const { userId: authUserId } = getAuth(req);
  if (!authUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { targetUserId } = req.params;
  if (!targetUserId) {
    return res.status(400).json({ error: "targetUserId parameter is required." });
  }

  try {
    // targetUserId can be Postgres cuid or Clerk ID
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: targetUserId }, { clerkId: targetUserId }],
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: targetUser.id },
    });

    if (!profile || !profile.resumePdfPath) {
      return res.status(404).json({ error: "Resume PDF not found for this candidate." });
    }

    const fileData = await StorageService.getResumePdfStream(profile.resumePdfPath);
    if (!fileData) {
      return res.status(404).json({ error: "Resume PDF not found for this candidate." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${profile.resumeOriginalName || "resume.pdf"}"`
    );
    if (fileData.contentLength) {
      res.setHeader("Content-Length", fileData.contentLength);
    }
    return fileData.stream.pipe(res);
  } catch (error) {
    console.error("[Resume Controller] Error serving candidate resume:", error);
    return res.status(500).json({ error: "Failed to load candidate resume PDF." });
  }
};

export const getResumeStatus = async (req: Request, res: Response<ResumeStatusResponse | { error: string }>) => {
  const { jobId } = req.params;

  try {
    const job = await aiQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    if (state === "completed") {
      return res.json({ jobId, state: "completed", result: result as any });
    } else if (state === "failed") {
      return res.json({ jobId, state: "failed", error: failedReason || "Unknown error" });
    } else {
      return res.json({ jobId, state: state as any });
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch job status" });
  }
};

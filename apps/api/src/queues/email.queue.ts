import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { EmailService, TeamInvitationEmailPayload } from "../services/email.service.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

export const EMAIL_QUEUE_NAME = "email-tasks";

// 1. Create the BullMQ Queue
export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export type EmailJobData =
  | {
      type: "SEND_TEAM_INVITATION";
      payload: TeamInvitationEmailPayload;
    };

// 2. Create the Worker that processes email jobs
export const emailWorker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    console.log(`[EmailWorker] [Job ${job.id}] Processing email job of type: ${job.data.type}`);

    if (job.data.type === "SEND_TEAM_INVITATION") {
      const result = await EmailService.sendTeamInvitationEmail(job.data.payload);
      console.log(`[EmailWorker] [Job ${job.id}] Successfully processed invitation email to: ${job.data.payload.toEmail}`);
      return result;
    }

    throw new Error(`[EmailWorker] Unknown email job type: ${(job.data as any).type}`);
  },
  {
    connection,
    concurrency: 5,
  }
);

// Worker Event Listeners
emailWorker.on("completed", (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed successfully.`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed: ${err.message}`);
});

// Helper function to enqueue team invitation emails
export async function queueTeamInvitationEmail(payload: TeamInvitationEmailPayload) {
  try {
    const job = await emailQueue.add("send-team-invite-email", {
      type: "SEND_TEAM_INVITATION",
      payload,
    });
    console.log(`[EmailQueue] Enqueued invitation email job ${job.id} for ${payload.toEmail}`);
    return job;
  } catch (err) {
    console.error(`[EmailQueue] Failed to enqueue email job for ${payload.toEmail}:`, err);
    // Fallback: try direct non-blocking dispatch if Redis queue enqueue fails
    EmailService.sendTeamInvitationEmail(payload).catch((e) =>
      console.error("[EmailQueue Fallback] Direct dispatch failed:", e)
    );
  }
}

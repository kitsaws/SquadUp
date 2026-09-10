import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { AIService } from '../services/ai.service.js';
import { PrismaClient } from '@prisma/client';
import { getOrCreateUserByClerkId } from '../utils/auth.utils.js';

const prisma = new PrismaClient();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

export const QUEUE_NAME = 'ai-tasks';

// 1. Create the Queue
export const aiQueue = new Queue(QUEUE_NAME, { connection });

import { ParseResumeJobData } from '@squadup/shared';

// 2. Create the Worker that processes jobs
export const aiWorker = new Worker(
  QUEUE_NAME,
  async (job: Job<ParseResumeJobData>) => {
    const { userId, fileBuffer, filename } = job.data;
    
    console.log(`[Job ${job.id}] Starting resume processing for user: ${userId}`);

    // Convert the base64 string back to a Buffer
    const buffer = Buffer.from(fileBuffer, 'base64');
    
    try {
      // Send it to the Python service
      const profileData = await AIService.parseResume(buffer, filename);
      console.log(`[Job ${job.id}] Successfully parsed resume for user: ${userId}`);
      
      // Ensure the user exists in our DB to prevent Foreign Key constraints (e.g. if webhook failed)
      let userInDb = await getOrCreateUserByClerkId(userId);

      // Save the result to the database
      const profile = await prisma.profile.upsert({
        where: { userId: userInDb.id },
        update: {
          title: profileData.title,
          summary: profileData.summary,
          skills: profileData.skills || [],
          education: profileData.education || [],
          experience: profileData.experience || [],
          projects: profileData.projects || [],
          githubUrl: profileData.links?.github,
          linkedinUrl: profileData.links?.linkedin,
        },
        create: {
          userId: userInDb.id,
          title: profileData.title,
          summary: profileData.summary,
          skills: profileData.skills || [],
          education: profileData.education || [],
          experience: profileData.experience || [],
          projects: profileData.projects || [],
          githubUrl: profileData.links?.github,
          linkedinUrl: profileData.links?.linkedin,
        }
      });
      
      console.log(`[Job ${job.id}] Profile saved to DB with ID: ${profile.id}`);
      return profile;

    } catch (error) {
      console.error(`[Job ${job.id}] Failed to process resume:`, error);
      throw error;
    }
  },
  { connection }
);

// Event listeners for debugging
aiWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

aiWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});

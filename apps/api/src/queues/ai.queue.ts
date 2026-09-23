import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { AIService } from '../services/ai.service.js';
import { CacheService } from '../services/cache.service.js';
import { NotificationService } from '../services/notification.service.js';
import { prisma } from '../lib/prisma.js';
import { getOrCreateUserByClerkId } from '../utils/auth.utils.js';
import { ParseResumeJobData } from '@squadup/shared';
import { sanitizeSummary } from '../services/resume.parser.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

export const QUEUE_NAME = 'ai-tasks';

// 1. Create the Queue
export const aiQueue = new Queue(QUEUE_NAME, { connection });

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

      // Update User name if candidate's name was extracted and current user name is empty or default
      if (profileData.name && typeof profileData.name === 'string') {
        const trimmedName = profileData.name.trim();
        if (trimmedName && (!userInDb.name || userInDb.name === 'User' || userInDb.name === userInDb.email.split('@')[0])) {
          try {
            await prisma.user.update({
              where: { id: userInDb.id },
              data: { name: trimmedName },
            });
            userInDb.name = trimmedName;
          } catch (nameErr) {
            console.warn(`[Job ${job.id}] Failed to update user name:`, nameErr);
          }
        }
      }

      const githubUrl = profileData.links?.github ? String(profileData.links.github).trim() : null;
      const linkedinUrl = profileData.links?.linkedin ? String(profileData.links.linkedin).trim() : null;
      const title = profileData.title ? String(profileData.title).trim() : null;
      const rawSummary = profileData.summary ? String(profileData.summary).trim() : null;
      const summary = rawSummary ? (sanitizeSummary(rawSummary, userInDb.name || profileData.name) || rawSummary) : null;

      // Save the result to the database (university is NOT touched as it links user to an organization)
      const profile = await prisma.profile.upsert({
        where: { userId: userInDb.id },
        update: {
          ...(title ? { title } : {}),
          ...(summary ? { summary } : {}),
          skills: profileData.skills || [],
          education: (profileData.education as any) || [],
          experience: (profileData.experience as any) || [],
          achievements: (profileData.achievements as any) || [],
          projects: (profileData.projects as any) || [],
          ...(githubUrl ? { githubUrl } : {}),
          ...(linkedinUrl ? { linkedinUrl } : {}),
          ...(filename ? { resumeOriginalName: filename } : {}),
          lastResumeUploadedAt: new Date(),
        },
        create: {
          userId: userInDb.id,
          title: title || "",
          summary: summary || "",
          skills: profileData.skills || [],
          education: (profileData.education as any) || [],
          experience: (profileData.experience as any) || [],
          achievements: (profileData.achievements as any) || [],
          projects: (profileData.projects as any) || [],
          githubUrl: githubUrl || "",
          linkedinUrl: linkedinUrl || "",
          resumeOriginalName: filename || null,
          lastResumeUploadedAt: new Date(),
        }
      });
      
      console.log(`[Job ${job.id}] Profile saved to DB with ID: ${profile.id}`);

      // 2. Resolve User Taxonomy with V2 Multi-source Evidence
      try {
        const taxonomyData = await AIService.resolveUserTaxonomy(userInDb.id, profileData);
        console.log(`[Job ${job.id}] Resolved ${taxonomyData.taxonomy_node_ids.length} taxonomy nodes with ${taxonomyData.evidence.length} evidence items`);

        await prisma.userTaxonomy.upsert({
          where: { userId: userInDb.id },
          update: {
            taxonomyNodeIds: taxonomyData.taxonomy_node_ids,
            rawSkills: taxonomyData.raw_skills,
            evidence: taxonomyData.evidence as any,
          },
          create: {
            userId: userInDb.id,
            taxonomyNodeIds: taxonomyData.taxonomy_node_ids,
            rawSkills: taxonomyData.raw_skills,
            evidence: taxonomyData.evidence as any,
          },
        });
        console.log(`[Job ${job.id}] Successfully saved UserTaxonomy for user: ${userInDb.id}`);
      } catch (taxError) {
        console.error(`[Job ${job.id}] Failed to resolve user taxonomy:`, taxError);
      }
      
      // Invalidate profile cache across DB ID and Clerk ID
      try {
        await CacheService.invalidateProfile(userInDb.id);
        if (userInDb.clerkId) {
          await CacheService.invalidateProfile(userInDb.clerkId);
        }
      } catch (cacheErr) {
        console.warn(`[Job ${job.id}] Failed to invalidate profile cache:`, cacheErr);
      }

      // Dispatch real-time in-app notification
      try {
        await NotificationService.createNotification({
          userId: userInDb.id,
          type: "PROFILE_UPDATED",
          title: "🎉 AI Profile Creation Complete",
          message: "Your resume has been analyzed and your squad profile is ready!",
          link: `/profile/${userInDb.id}`,
          data: { userId: userInDb.id, resumeFileName: filename },
        });
      } catch (notifErr) {
        console.warn(`[Job ${job.id}] Failed to dispatch notification:`, notifErr);
      }
      
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

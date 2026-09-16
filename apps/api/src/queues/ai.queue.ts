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

      // Detect university from education if available
      let detectedUniversity: string | null = null;
      if (Array.isArray(profileData.education) && profileData.education.length > 0) {
        const topEdu = profileData.education[0];
        if (topEdu && (topEdu.college || topEdu.university)) {
          const rawUni = String(topEdu.college || topEdu.university).trim();
          const cleanUni = rawUni.split(/\s*[\(,]\s*/)[0].trim();
          detectedUniversity = cleanUni.length > 2 ? cleanUni : rawUni;
        }
      }

      const githubUrl = profileData.links?.github ? String(profileData.links.github).trim() : null;
      const linkedinUrl = profileData.links?.linkedin ? String(profileData.links.linkedin).trim() : null;
      const title = profileData.title ? String(profileData.title).trim() : null;
      const summary = profileData.summary ? String(profileData.summary).trim() : null;

      // Save the result to the database
      const profile = await prisma.profile.upsert({
        where: { userId: userInDb.id },
        update: {
          ...(title ? { title } : {}),
          ...(summary ? { summary } : {}),
          skills: profileData.skills || [],
          education: profileData.education || [],
          experience: profileData.experience || [],
          projects: profileData.projects || [],
          ...(githubUrl ? { githubUrl } : {}),
          ...(linkedinUrl ? { linkedinUrl } : {}),
          ...(detectedUniversity ? { university: detectedUniversity } : {}),
          ...(filename ? { resumeOriginalName: filename } : {}),
          lastResumeUploadedAt: new Date(),
        },
        create: {
          userId: userInDb.id,
          title: title || "",
          summary: summary || "",
          skills: profileData.skills || [],
          education: profileData.education || [],
          experience: profileData.experience || [],
          projects: profileData.projects || [],
          githubUrl: githubUrl || "",
          linkedinUrl: linkedinUrl || "",
          university: detectedUniversity || null,
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

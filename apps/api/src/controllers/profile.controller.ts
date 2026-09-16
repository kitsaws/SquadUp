import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient } from "@prisma/client";
import { UpdateProfileRequest } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { AIService } from "../services/ai.service.js";

const prisma = new PrismaClient();

export const getProfile = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const { userId } = auth;

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
    const userWithProfile = await prisma.user.findUnique({
      where: { id: userInDb.id },
      include: {
        profile: true,
        taxonomy: true,
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                eventId: true,
                university: true,
              },
            },
          },
        },
      },
    });

    if (!userWithProfile) {
      return res.status(404).json({ error: "User not found." });
    }

    const profile = userWithProfile.profile;

    return res.json({
      id: profile?.id || null,
      userId: userWithProfile.id,
      clerkId: userWithProfile.clerkId,
      name: userWithProfile.name,
      email: userWithProfile.email,
      university: profile?.university || null,
      title: profile?.title || null,
      summary: profile?.summary || null,
      skills: profile?.skills || [],
      education: profile?.education || [],
      experience: profile?.experience || [],
      projects: profile?.projects || [],
      githubUrl: profile?.githubUrl || null,
      linkedinUrl: profile?.linkedinUrl || null,
      resumePdfUrl: profile?.resumePdfPath ? `/api/resume/view` : null,
      lastResumeUploadedAt: profile?.lastResumeUploadedAt?.toISOString() || null,
      taxonomyNodeIds: userWithProfile.taxonomy?.taxonomyNodeIds || [],
      evidence: userWithProfile.taxonomy?.evidence || [],
      teams: userWithProfile.teams.map((tm) => ({
        teamId: tm.team.id,
        teamName: tm.team.name,
        eventId: tm.team.eventId,
        role: tm.role,
        joinedAt: tm.joinedAt.toISOString(),
      })),
      createdAt: userWithProfile.createdAt.toISOString(),
      updatedAt: userWithProfile.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[Profile API] Error fetching profile:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const updateProfile = async (
  req: Request<{}, {}, UpdateProfileRequest>,
  res: Response
) => {
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

  const {
    name,
    university,
    title,
    summary,
    skills,
    education,
    experience,
    projects,
    githubUrl,
    linkedinUrl,
  } = req.body;

  try {
    // 1. Update user name if changed
    if (name && name.trim() !== userInDb.name) {
      await prisma.user.update({
        where: { id: userInDb.id },
        data: { name: name.trim() },
      });
    }

    // 2. Upsert profile
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: userInDb.id },
      update: {
        ...(university !== undefined && { university }),
        ...(title !== undefined && { title }),
        ...(summary !== undefined && { summary }),
        ...(skills !== undefined && { skills }),
        ...(education !== undefined && { education: education as any }),
        ...(experience !== undefined && { experience: experience as any }),
        ...(projects !== undefined && { projects: projects as any }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
      },
      create: {
        userId: userInDb.id,
        university: university || null,
        title: title || null,
        summary: summary || null,
        skills: skills || [],
        education: (education as any) || [],
        experience: (experience as any) || [],
        projects: (projects as any) || [],
        githubUrl: githubUrl || null,
        linkedinUrl: linkedinUrl || null,
      },
    });

    // 3. Real-time Taxonomy Sync if capability fields were touched
    let updatedTaxonomyNodeIds: string[] = [];
    if (skills !== undefined || projects !== undefined || experience !== undefined) {
      try {
        const taxResult = await AIService.resolveUserTaxonomy(userInDb.id, {
          skills: updatedProfile.skills,
          projects: updatedProfile.projects as any,
          experience: updatedProfile.experience as any,
        });

        const taxRecord = await prisma.userTaxonomy.upsert({
          where: { userId: userInDb.id },
          update: {
            taxonomyNodeIds: taxResult.taxonomy_node_ids,
            rawSkills: taxResult.raw_skills,
            evidence: taxResult.evidence as any,
          },
          create: {
            userId: userInDb.id,
            taxonomyNodeIds: taxResult.taxonomy_node_ids,
            rawSkills: taxResult.raw_skills,
            evidence: taxResult.evidence as any,
          },
        });
        updatedTaxonomyNodeIds = taxRecord.taxonomyNodeIds;
        console.log(`[Profile API] Synced UserTaxonomy with ${updatedTaxonomyNodeIds.length} nodes for user ${userInDb.id}`);
      } catch (taxErr) {
        console.warn("[Profile API] Warning: Failed to re-resolve user taxonomy:", taxErr);
      }
    } else {
      const existingTax = await prisma.userTaxonomy.findUnique({
        where: { userId: userInDb.id },
      });
      updatedTaxonomyNodeIds = existingTax?.taxonomyNodeIds || [];
    }

    return res.json({
      message: "Profile updated successfully.",
      profile: {
        id: updatedProfile.id,
        userId: userInDb.id,
        name: name || userInDb.name,
        email: userInDb.email,
        university: updatedProfile.university,
        title: updatedProfile.title,
        summary: updatedProfile.summary,
        skills: updatedProfile.skills,
        education: updatedProfile.education,
        experience: updatedProfile.experience,
        projects: updatedProfile.projects,
        githubUrl: updatedProfile.githubUrl,
        linkedinUrl: updatedProfile.linkedinUrl,
        resumePdfUrl: updatedProfile.resumePdfPath ? `/api/resume/view` : null,
        lastResumeUploadedAt: updatedProfile.lastResumeUploadedAt?.toISOString() || null,
        taxonomyNodeIds: updatedTaxonomyNodeIds,
        updatedAt: updatedProfile.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Profile API] Error updating profile:", error);
    return res.status(500).json({ error: "Failed to update profile." });
  }
};

export const getProfileById = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { targetUserId } = req.params;
  if (!targetUserId) {
    return res.status(400).json({ error: "targetUserId is required." });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: targetUserId }, { clerkId: targetUserId }],
      },
      include: {
        profile: true,
        taxonomy: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const profile = user.profile;

    return res.json({
      id: profile?.id || null,
      userId: user.id,
      name: user.name,
      email: user.email,
      university: profile?.university || null,
      title: profile?.title || null,
      summary: profile?.summary || null,
      skills: profile?.skills || [],
      education: profile?.education || [],
      experience: profile?.experience || [],
      projects: profile?.projects || [],
      githubUrl: profile?.githubUrl || null,
      linkedinUrl: profile?.linkedinUrl || null,
      hasResume: Boolean(profile?.resumePdfPath),
      resumeViewUrl: profile?.resumePdfPath ? `/api/resume/view/${user.id}` : null,
      taxonomyNodeIds: user.taxonomy?.taxonomyNodeIds || [],
    });
  } catch (error) {
    console.error("[Profile API] Error fetching public profile:", error);
    return res.status(500).json({ error: "Failed to fetch candidate profile." });
  }
};

export const syncClerkData = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const { userId } = auth;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const userInDb = await getOrCreateUserByClerkId(userId);
    const { syncUserOrganizationsFromClerk } = await import("../utils/auth.utils.js");
    await syncUserOrganizationsFromClerk(userInDb.id, userId);

    return res.json({ success: true, message: "Clerk data synced successfully." });
  } catch (error) {
    console.error("[Profile API] Error syncing Clerk data:", error);
    return res.status(500).json({ error: "Failed to sync Clerk data." });
  }
};


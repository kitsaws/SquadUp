import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { prisma } from "../lib/prisma.js";
import { UpdateProfileRequest } from "@squadup/shared";
import { getOrCreateUserByClerkId, linkUserToOrganization } from "../utils/auth.utils.js";
import { AIService } from "../services/ai.service.js";
import { CacheService, CACHE_TTL } from "../services/cache.service.js";
import { NotificationService } from "../services/notification.service.js";
import { sanitizeSummary } from "../services/resume.parser.js";

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

  const bypassCache = req.query.bypassCache === "true";
  const cacheKey = `profile:${userInDb.id}`;

  if (!bypassCache) {
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  }

  try {
    const userWithProfile = await prisma.user.findUnique({
      where: { id: userInDb.id },
      include: {
        profile: true,
        taxonomy: true,
        preferences: true,
        organizationMemberships: {
          include: {
            organization: true,
          },
        },
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
    const primaryMembership = userWithProfile.organizationMemberships?.[0];
    const primaryOrg = primaryMembership?.organization;
    const userEmail = (userWithProfile.email || "").toLowerCase().trim();
    const orgDomain = (primaryOrg?.domain || "").toLowerCase().trim();
    const orgName = primaryOrg?.name || profile?.university || null;

    let isVerifiedStudent = false;
    let verificationReason = "No university organization affiliation found.";

    if (primaryOrg) {
      if (!orgDomain) {
        isVerifiedStudent = false;
        verificationReason = `Affiliated with ${primaryOrg.name}, but no official university domain is registered for email verification.`;
      } else {
        const cleanEmailDomain = userEmail.includes("@") ? userEmail.split("@")[1] : "";
        const matches = cleanEmailDomain === orgDomain || cleanEmailDomain.endsWith(`.${orgDomain}`);
        if (matches) {
          isVerifiedStudent = true;
          verificationReason = `Verified student at ${primaryOrg.name}. Email (${userWithProfile.email}) matches official university domain (@${orgDomain}).`;
        } else {
          isVerifiedStudent = false;
          verificationReason = `Unverified institutional email. Account email (${userWithProfile.email}) does not match the official domain (@${orgDomain}) for ${primaryOrg.name}.`;
        }
      }
    }

    let userImageUrl = userWithProfile.imageUrl || null;
    if (!userImageUrl && userWithProfile.clerkId) {
      try {
        const { clerkClient } = await import("@clerk/express");
        const clerkUser = await clerkClient.users.getUser(userWithProfile.clerkId);
        if (clerkUser?.imageUrl) {
          userImageUrl = clerkUser.imageUrl;
          prisma.user.update({
            where: { id: userWithProfile.id },
            data: { imageUrl: clerkUser.imageUrl },
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    const responsePayload = {
      id: profile?.id || null,
      userId: userWithProfile.id,
      clerkId: userWithProfile.clerkId,
      name: userWithProfile.name,
      email: userWithProfile.email,
      imageUrl: userImageUrl,
      profilePicture: userImageUrl,
      avatarUrl: userImageUrl,
      university: profile?.university || null,
      title: profile?.title || null,
      summary: profile?.summary || null,
      skills: profile?.skills || [],
      education: profile?.education || [],
      experience: profile?.experience || [],
      achievements: profile?.achievements || [],
      projects: profile?.projects || [],
      githubUrl: profile?.githubUrl || null,
      linkedinUrl: profile?.linkedinUrl || null,
      resumePdfUrl: profile?.resumePdfPath ? `/api/resume/view` : null,
      lastResumeUploadedAt: profile?.lastResumeUploadedAt?.toISOString() || null,
      taxonomyNodeIds: userWithProfile.taxonomy?.taxonomyNodeIds || [],
      evidence: userWithProfile.taxonomy?.evidence || [],
      isVerifiedStudent,
      verificationReason,
      organizationDomain: orgDomain || null,
      organizationName: orgName,
      teams: userWithProfile.teams.map((tm) => ({
        teamId: tm.team.id,
        teamName: tm.team.name,
        eventId: tm.team.eventId,
        role: tm.role,
        joinedAt: tm.joinedAt.toISOString(),
      })),
      bannerConfig: userWithProfile.preferences?.bannerConfig || null,
      createdAt: userWithProfile.createdAt.toISOString(),
      updatedAt: userWithProfile.updatedAt.toISOString(),
    };

    await CacheService.set(cacheKey, responsePayload, CACHE_TTL.PROFILE);

    return res.json(responsePayload);
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
    achievements,
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

    // Clean and sanitize summary if provided
    const rawSummary = summary !== undefined ? (typeof summary === "string" ? summary.trim() : null) : undefined;
    const cleanSummary = rawSummary !== undefined
      ? (rawSummary ? (sanitizeSummary(rawSummary, name || userInDb.name) || rawSummary) : null)
      : undefined;

    // 2. Upsert profile
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: userInDb.id },
      update: {
        ...(university !== undefined && { university: university || null }),
        ...(title !== undefined && { title: title || null }),
        ...(cleanSummary !== undefined && { summary: cleanSummary }),
        ...(skills !== undefined && { skills }),
        ...(education !== undefined && { education: education as any }),
        ...(experience !== undefined && { experience: experience as any }),
        ...(achievements !== undefined && { achievements: achievements as any }),
        ...(projects !== undefined && { projects: projects as any }),
        ...(githubUrl !== undefined && { githubUrl: githubUrl || null }),
        ...(linkedinUrl !== undefined && { linkedinUrl: linkedinUrl || null }),
      },
      create: {
        userId: userInDb.id,
        university: university || null,
        title: title || null,
        summary: cleanSummary || null,
        skills: skills || [],
        education: (education as any) || [],
        experience: (experience as any) || [],
        achievements: (achievements as any) || [],
        projects: (projects as any) || [],
        githubUrl: githubUrl || null,
        linkedinUrl: linkedinUrl || null,
      },
    });

    // 2b. If university name provided, link OrganizationMembership if found
    if (university && university.trim()) {
      try {
        const matchingOrg = await prisma.organization.findFirst({
          where: { name: { equals: university.trim(), mode: "insensitive" } },
        });
        if (matchingOrg) {
          await linkUserToOrganization(userInDb.id, userInDb.clerkId, matchingOrg);
        }
      } catch (orgLinkErr) {
        console.warn("[Profile API] Warning: Failed to link organization membership:", orgLinkErr);
      }
    }

    // 3. Real-time Taxonomy Sync if capability fields were touched
    let updatedTaxonomyNodeIds: string[] = [];
    if (skills !== undefined || projects !== undefined || experience !== undefined || achievements !== undefined) {
      try {
        const taxResult = await AIService.resolveUserTaxonomy(userInDb.id, {
          skills: updatedProfile.skills,
          projects: updatedProfile.projects as any,
          experience: updatedProfile.experience as any,
          achievements: updatedProfile.achievements as any,
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

    // Fetch user with preferences to preserve bannerConfig in response
    const userWithPrefs = await prisma.user.findUnique({
      where: { id: userInDb.id },
      include: { preferences: true },
    });

    // Invalidate profile cache on update
    await CacheService.invalidateProfile(userInDb.id);
    if (userInDb.clerkId) {
      await CacheService.invalidateProfile(userInDb.clerkId);
    }

    // Send in-app notification to user
    NotificationService.createNotification({
      userId: userInDb.id,
      type: "PROFILE_UPDATED",
      title: "✨ Profile Updated",
      message: "Your SquadUp profile and skill taxonomy have been updated successfully.",
      link: `/profile/${userInDb.id}`,
      data: { userId: userInDb.id, updatedAt: new Date().toISOString() },
    }).catch((notifErr) => {
      console.warn("[Profile API] Failed to dispatch profile update notification:", notifErr);
    });

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
        achievements: updatedProfile.achievements,
        projects: updatedProfile.projects,
        githubUrl: updatedProfile.githubUrl,
        linkedinUrl: updatedProfile.linkedinUrl,
        resumePdfUrl: updatedProfile.resumePdfPath ? `/api/resume/view` : null,
        lastResumeUploadedAt: updatedProfile.lastResumeUploadedAt?.toISOString() || null,
        taxonomyNodeIds: updatedTaxonomyNodeIds,
        bannerConfig: userWithPrefs?.preferences?.bannerConfig || null,
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
  const { targetUserId } = req.params;
  if (!targetUserId) {
    return res.status(400).json({ error: "targetUserId is required." });
  }

  let currentUserInDb = null;
  if (auth.userId) {
    try {
      currentUserInDb = await getOrCreateUserByClerkId(auth.userId);
    } catch (error) {
      console.warn("[Profile API] Could not verify viewer user profile:", error);
    }
  }

  // Check if current user id == id from url
  const isCurrentViewer = Boolean(
    currentUserInDb &&
    (currentUserInDb.id === targetUserId ||
      currentUserInDb.clerkId === targetUserId ||
      auth.userId === targetUserId)
  );

  const cacheKey = currentUserInDb ? `profile:${currentUserInDb.id}` : null;

  if (isCurrentViewer && cacheKey) {
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: targetUserId }, { clerkId: targetUserId }],
      },
      include: {
        profile: true,
        taxonomy: true,
        preferences: true,
        organizationMemberships: {
          include: {
            organization: true,
          },
        },
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

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const profile = user.profile;
    const primaryMembership = user.organizationMemberships?.[0];
    const primaryOrg = primaryMembership?.organization;
    const userEmail = (user.email || "").toLowerCase().trim();
    const orgDomain = (primaryOrg?.domain || "").toLowerCase().trim();
    const orgName = primaryOrg?.name || profile?.university || null;

    let isVerifiedStudent = false;
    let verificationReason = "No university organization affiliation found.";

    if (primaryOrg) {
      if (!orgDomain) {
        isVerifiedStudent = false;
        verificationReason = `Affiliated with ${primaryOrg.name}, but no official university domain is registered for email verification.`;
      } else {
        const cleanEmailDomain = userEmail.includes("@") ? userEmail.split("@")[1] : "";
        const matches = cleanEmailDomain === orgDomain || cleanEmailDomain.endsWith(`.${orgDomain}`);
        if (matches) {
          isVerifiedStudent = true;
          verificationReason = `Verified student at ${primaryOrg.name}. Email (${user.email}) matches official university domain (@${orgDomain}).`;
        } else {
          isVerifiedStudent = false;
          verificationReason = `Unverified institutional email. Account email (${user.email}) does not match the official domain (@${orgDomain}) for ${primaryOrg.name}.`;
        }
      }
    }

    let userImageUrl = user.imageUrl || null;
    if (!userImageUrl && user.clerkId) {
      try {
        const { clerkClient } = await import("@clerk/express");
        const clerkUser = await clerkClient.users.getUser(user.clerkId);
        if (clerkUser?.imageUrl) {
          userImageUrl = clerkUser.imageUrl;
          prisma.user.update({
            where: { id: user.id },
            data: { imageUrl: clerkUser.imageUrl },
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    const responsePayload = {
      id: profile?.id || null,
      userId: user.id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      imageUrl: userImageUrl,
      profilePicture: userImageUrl,
      avatarUrl: userImageUrl,
      university: profile?.university || null,
      title: profile?.title || null,
      summary: profile?.summary || null,
      skills: profile?.skills || [],
      education: profile?.education || [],
      experience: profile?.experience || [],
      achievements: profile?.achievements || [],
      projects: profile?.projects || [],
      githubUrl: profile?.githubUrl || null,
      linkedinUrl: profile?.linkedinUrl || null,
      hasResume: Boolean(profile?.resumePdfPath),
      resumePdfUrl: profile?.resumePdfPath ? `/api/resume/view/${user.id}` : null,
      resumeViewUrl: profile?.resumePdfPath ? `/api/resume/view/${user.id}` : null,
      taxonomyNodeIds: user.taxonomy?.taxonomyNodeIds || [],
      evidence: user.taxonomy?.evidence || [],
      isVerifiedStudent,
      verificationReason,
      organizationDomain: orgDomain || null,
      organizationName: orgName,
      teams: (user.teams || []).map((tm) => ({
        teamId: tm.team.id,
        teamName: tm.team.name,
        eventId: tm.team.eventId,
        role: tm.role,
        joinedAt: tm.joinedAt.toISOString(),
      })),
      bannerConfig: user.preferences?.bannerConfig || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    if (isCurrentViewer && cacheKey) {
      await CacheService.set(cacheKey, responsePayload, CACHE_TTL.PROFILE_PUBLIC);
    }

    return res.json(responsePayload);
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


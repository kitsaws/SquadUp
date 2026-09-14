import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient } from "@prisma/client";
import { CreateTeamRequest, RecommendationFilterPayload } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { AIService } from "../services/ai.service.js";

const prisma = new PrismaClient();

export const createTeam = async (req: Request<{}, {}, CreateTeamRequest>, res: Response) => {
  const { userId, orgId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { eventId, name, requirements, invites } = req.body;

  if (!eventId || !name) {
    return res.status(400).json({ error: "eventId and name are required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  // Pre-resolve requirement tags into canonical taxonomy node IDs
  let requirementNodeIds: string[] = [];
  try {
    if (requirements && requirements.length > 0) {
      const taxRes = await AIService.resolveTeamRequirements("new_team", requirements);
      requirementNodeIds = taxRes.requirement_node_ids;
    }
  } catch (taxErr) {
    console.warn("[Team API] Could not resolve requirement taxonomy (continuing team creation):", taxErr);
  }

  try {
    // We use a transaction to ensure all team data is created atomically
    const team = await prisma.$transaction(async (tx) => {
      // 1. Create the team
      const newTeam = await tx.team.create({
        data: {
          name,
          eventId,
          requirements: requirements || [],
          orgId: orgId || null,
        },
      });

      // 2. Create decoupled TeamTaxonomy record
      await tx.teamTaxonomy.create({
        data: {
          teamId: newTeam.id,
          requirementNodeIds,
          rawRequirements: requirements || [],
        },
      });

      // 3. Add the creator as the Leader
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: userInDb.id,
          role: "Leader",
        },
      });

      // 4. Create invites if provided
      if (invites && invites.length > 0) {
        const uniqueEmails = [...new Set(invites)]; // Deduplicate emails
        
        await tx.teamInvite.createMany({
          data: uniqueEmails.map(email => ({
            teamId: newTeam.id,
            senderId: userInDb.id,
            email,
            status: "PENDING"
          }))
        });
      }

      return newTeam;
    });

    return res.status(201).json({ 
      message: "Team created successfully", 
      teamId: team.id,
      requirementNodeIds,
    });
  } catch (error: any) {
    console.error("[Team API] Error creating team:", error);
    return res.status(500).json({ error: "Failed to create team." });
  }
};

export const acceptInvite = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const { userId } = auth;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { inviteId } = req.params;

  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({ error: `Invite is already ${invite.status}` });
    }

    let userInDb;
    try {
      userInDb = await getOrCreateUserByClerkId(userId);
    } catch (error) {
      return res.status(500).json({ error: "Failed to verify user profile." });
    }

    if (userInDb.email.toLowerCase() !== invite.email.toLowerCase()) {
      return res.status(403).json({ 
        error: "Forbidden. This invite was sent to a different email address." 
      });
    }

    await prisma.$transaction([
      // Update invite
      prisma.teamInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" }
      }),
      // Create team member
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: userInDb.id,
          role: "Member"
        }
      })
    ]);

    return res.status(200).json({ message: "Invite accepted successfully" });
  } catch (error) {
    console.error("[Team API] Error accepting invite:", error);
    return res.status(500).json({ error: "Failed to accept invite." });
  }
};

export const getRecommendations = async (
  req: Request<{}, {}, RecommendationFilterPayload>,
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

  try {
    // 1. Fetch user profile and decoupled UserTaxonomy
    const userWithTax = await prisma.user.findUnique({
      where: { id: userInDb.id },
      include: {
        taxonomy: true,
        profile: true,
      },
    });

    if (!userWithTax || !userWithTax.taxonomy || userWithTax.taxonomy.taxonomyNodeIds.length === 0) {
      return res.status(400).json({
        error: "No taxonomy skills found for user. Please upload a resume first to build your AI profile.",
        recommendations: [],
      });
    }

    const userTaxNodeIds = userWithTax.taxonomy.taxonomyNodeIds;
    const userUniversity = userWithTax.profile?.university || null;

    // 2. Read filter payload (push-down filtering)
    const { eventId, sameUniversityOnly, topK } = req.body;

    const whereClause: any = {};
    if (eventId) {
      whereClause.eventId = eventId;
    }

    // 3. Query candidate teams with Event and TeamTaxonomy
    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        event: true,
        taxonomy: true,
      },
    });

    // 4. Hard event eligibility filtering
    // - Global events: eligible for all users
    // - Non-global events: user must match the event/team university
    const eligibleCandidateTeams = teams.filter((team) => {
      const isGlobal = team.event?.isGlobal ?? false;
      if (isGlobal) {
        if (sameUniversityOnly && userUniversity) {
          return team.university?.toLowerCase() === userUniversity.toLowerCase();
        }
        return true;
      }

      if (userUniversity) {
        const teamUni = team.university || team.event?.location || "";
        return teamUni.toLowerCase() === userUniversity.toLowerCase();
      }

      return false;
    });

    if (eligibleCandidateTeams.length === 0) {
      return res.json({
        recommendations: [],
        totalEligibleCandidates: 0,
        userUniversity,
        userTaxonomyNodesCount: userTaxNodeIds.length,
      });
    }

    // 5. Build candidate payload for AI microservice
    const candidatePayloads = eligibleCandidateTeams.map((team) => ({
      team_id: team.id,
      team_name: team.name,
      university: team.university || team.event?.location || null,
      description: team.event?.description || null,
      requirements: team.requirements || [],
      requirement_node_ids: team.taxonomy?.requirementNodeIds || [],
      is_global: team.event?.isGlobal ?? false,
      is_eligible: true,
    }));

    // 6. Call Python V2 Pure Taxonomy Engine
    const recommendations = await AIService.getRecommendations({
      userId: userInDb.id,
      userTaxonomyNodeIds: userTaxNodeIds,
      userUniversity,
      candidateTeams: candidatePayloads,
      topK: topK || 50,
    });

    return res.json({
      recommendations,
      totalEligibleCandidates: eligibleCandidateTeams.length,
      userUniversity,
      userTaxonomyNodesCount: userTaxNodeIds.length,
    });
  } catch (error: any) {
    console.error("[Recommendations API] Error generating recommendations:", error);
    return res.status(500).json({ error: "Failed to generate recommendations." });
  }
};

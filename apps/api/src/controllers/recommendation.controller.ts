import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { RecommendationFilterPayload } from "@squadup/shared";
import { prisma } from "../lib/prisma.js";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { AIService } from "../services/ai.service.js";

// ==========================================
// Recommendation Controller
// ==========================================

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

    const { eventId, sameUniversityOnly, topK } = req.body;

    const whereClause: any = {};
    if (eventId) {
      whereClause.eventId = eventId;
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        event: true,
        taxonomy: true,
        roles: true,
      },
    });

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

    const candidatePayloads = eligibleCandidateTeams.map((team) => ({
      team_id: team.id,
      team_name: team.name,
      university: team.university || team.event?.location || null,
      description: team.event?.description || null,
      requirements: team.requirements || [],
      requirement_node_ids: team.taxonomy?.requirementNodeIds || [],
      roles: team.roles
        ? team.roles.map((r) => ({
            id: r.id,
            title: r.title,
            skills: r.skills,
            spots: r.spots,
            assignedToId: r.assignedToId,
          }))
        : undefined,
      is_global: team.event?.isGlobal ?? false,
      is_eligible: true,
    }));

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

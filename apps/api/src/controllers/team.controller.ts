import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateTeamRequest,
  UpdateTeamRequest,
} from "@squadup/shared";
import { prisma } from "../lib/prisma.js";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import {
  TeamService,
  CallerContext,
  calculateTeamMaxCapacity,
} from "../services/team.service.js";

// Re-export capacity helper and domain controllers for backwards compatibility
export { calculateTeamMaxCapacity };
export * from "./invite.controller.js";
export * from "./application.controller.js";
export * from "./recommendation.controller.js";

/**
 * Helper to build caller context from Clerk auth session.
 */
async function buildCallerContext(auth: ReturnType<typeof getAuth>): Promise<CallerContext> {
  let callerDbId: string | null = null;
  let userTaxNodeIds: string[] = [];
  let userUniversity: string | null = null;
  let callerUserOrgIds: string[] = [];

  if (auth.orgId) {
    callerUserOrgIds.push(auth.orgId);
  }

  if (auth.userId) {
    try {
      const user = await getOrCreateUserByClerkId(auth.userId);
      callerDbId = user.id;

      const userWithTax = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          taxonomy: true,
          profile: true,
          organizationMemberships: {
            include: { organization: true },
          },
        },
      });

      if (userWithTax?.taxonomy?.taxonomyNodeIds) {
        userTaxNodeIds = userWithTax.taxonomy.taxonomyNodeIds;
      }
      userUniversity = userWithTax?.profile?.university || null;

      if (userWithTax?.organizationMemberships) {
        for (const m of userWithTax.organizationMemberships) {
          if (m.organization?.clerkOrgId) {
            callerUserOrgIds.push(m.organization.clerkOrgId);
          }
        }
      }
      callerUserOrgIds = [...new Set(callerUserOrgIds)];
    } catch {
      // Unauthenticated / fallback
    }
  }

  return {
    callerDbId,
    userTaxNodeIds,
    userUniversity,
    callerUserOrgIds,
  };
}

// ==========================================
// 1. Team CRUD & Roster Management
// ==========================================

export const listTeams = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
  const eventId = (req.query.eventId as string)?.trim() || undefined;
  const search = (req.query.search as string)?.trim() || undefined;
  const myTeams = req.query.myTeams === "true";
  const campus = (req.query.campus as string)?.trim() || undefined;
  const openSpotsOnly = req.query.openSpotsOnly === "true";
  const tier = (req.query.tier as string)?.trim() || undefined;
  const sort = (req.query.sort as string) || "created_at";

  const caller = await buildCallerContext(auth);

  try {
    const result = await TeamService.listTeams(
      {
        page,
        limit,
        eventId,
        search,
        myTeams,
        campus,
        openSpotsOnly,
        tier,
        sort,
      },
      caller
    );

    return res.json(result);
  } catch (error) {
    console.error("[Team Controller] Error listing teams:", error);
    return res.status(500).json({ error: "Failed to list teams." });
  }
};

export const getTeamById = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const auth = getAuth(req);
  const caller = await buildCallerContext(auth);

  try {
    const team = await TeamService.getTeamById(id, caller);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }
    return res.json(team);
  } catch (error) {
    console.error("[Team Controller] Error fetching team details:", error);
    return res.status(500).json({ error: "Failed to fetch team details." });
  }
};

export const createTeam = async (
  req: Request<{}, {}, CreateTeamRequest>,
  res: Response
) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { eventId, name } = req.body;
  if (!eventId || !name) {
    return res.status(400).json({ error: "eventId and team name are required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(auth.userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await TeamService.createTeam(req.body, userInDb, auth.orgId);
    return res.status(201).json(result);
  } catch (error: any) {
    if (error.message === "Event not found.") {
      return res.status(404).json({ error: error.message });
    }
    console.error("[Team Controller] Error creating team:", error);
    return res.status(500).json({ error: "Failed to create team." });
  }
};

export const updateTeam = async (
  req: Request<{ id: string }, {}, UpdateTeamRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const updated = await TeamService.updateTeam(teamId, req.body, userInDb.id);
    return res.json({ message: "Team updated successfully.", team: updated });
  } catch (error: any) {
    if (error.message === "Team not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("[Team Controller] Error updating team:", error);
    return res.status(500).json({ error: "Failed to update team." });
  }
};

export const deleteTeam = async (req: Request<{ id: string }>, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    await TeamService.deleteTeam(teamId, userInDb.id);
    return res.json({ message: "Team deleted successfully." });
  } catch (error: any) {
    if (error.message === "Team not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("[Team Controller] Error deleting team:", error);
    return res.status(500).json({ error: "Failed to delete team." });
  }
};

export const leaveTeam = async (req: Request<{ id: string }>, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await TeamService.leaveTeam(teamId, userInDb.id);
    return res.json(result);
  } catch (error: any) {
    if (error.message === "Team not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("not a member")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Team Controller] Error leaving team:", error);
    return res.status(500).json({ error: "Failed to leave team." });
  }
};

export const removeTeamMember = async (
  req: Request<{ id: string; userId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId, userId: targetUserId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await TeamService.removeTeamMember(teamId, targetUserId, userInDb.id);
    return res.json(result);
  } catch (error: any) {
    if (error.message === "Team not found." || error.message.includes("not a member")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("Cannot remove yourself")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Team Controller] Error removing team member:", error);
    return res.status(500).json({ error: "Failed to remove member." });
  }
};

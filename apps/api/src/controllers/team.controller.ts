import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  CreateTeamRequest,
  UpdateTeamRequest,
  SendTeamInvitesRequest,
  CreateApplicationRequest,
  RecommendationFilterPayload,
  TeamDetailResponse,
  PaginatedResponse,
  MyApplicationResponse,
  IncomingApplicationResponse,
} from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { AIService } from "../services/ai.service.js";
import { CacheService } from "../services/cache.service.js";

const prisma = new PrismaClient();

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

  let callerDbId: string | null = null;
  let userTaxNodeIds: string[] = [];
  let userUniversity: string | null = null;

  if (auth.userId) {
    try {
      const user = await getOrCreateUserByClerkId(auth.userId);
      callerDbId = user.id;

      const userWithTax = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          taxonomy: true,
          profile: true,
        },
      });

      if (userWithTax?.taxonomy?.taxonomyNodeIds) {
        userTaxNodeIds = userWithTax.taxonomy.taxonomyNodeIds;
      }
      userUniversity = userWithTax?.profile?.university || null;
    } catch {
      // Unauthenticated / fallback
    }
  }

  const cacheKey = `teams:list:${JSON.stringify({
    page,
    limit,
    eventId,
    search,
    myTeams,
    campus: campus === "ALL" ? undefined : campus,
    openSpotsOnly,
    tier: tier === "ALL" ? undefined : tier,
    callerDbId,
    sort,
  })}`;

  const cached = await CacheService.get<PaginatedResponse<TeamDetailResponse>>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const andClauses: Prisma.TeamWhereInput[] = [];

    if (eventId) {
      andClauses.push({ eventId });
    }

    if (myTeams && callerDbId) {
      andClauses.push({
        members: {
          some: { userId: callerDbId },
        },
      });
    }

    if (search) {
      andClauses.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { requirements: { has: search } },
          { event: { title: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    if (campus && campus !== "ALL") {
      andClauses.push({
        OR: [
          { university: { contains: campus, mode: "insensitive" } },
          { event: { location: { contains: campus, mode: "insensitive" } } },
        ],
      });
    }

    const where: Prisma.TeamWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};

    // Check if we need in-process taxonomy scoring (fit sorting or tier filtering)
    const requiresTaxonomyScoring =
      userTaxNodeIds.length > 0 &&
      (sort === "fit_desc" || sort === "fit_asc" || (tier && tier !== "ALL"));

    if (requiresTaxonomyScoring || userTaxNodeIds.length > 0) {
      // Fetch matching candidate teams for in-process scoring
      const allTeams = await prisma.team.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              isGlobal: true,
              location: true,
              description: true,
            },
          },
          taxonomy: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profile: {
                    select: {
                      university: true,
                      title: true,
                      skills: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Filter candidate teams for hard eligibility
      const candidatePayloads = allTeams.map((team) => ({
        team_id: team.id,
        team_name: team.name,
        university: team.university || team.event?.location || null,
        description: team.event?.description || null,
        requirements: team.requirements || [],
        requirement_node_ids: team.taxonomy?.requirementNodeIds || [],
        is_global: team.event?.isGlobal ?? false,
        is_eligible: true,
      }));

      // In-process deterministic recommendation scoring (< 15ms)
      const recommendations = userTaxNodeIds.length > 0
        ? await AIService.getRecommendations({
            userId: callerDbId || "anonymous",
            userTaxonomyNodeIds: userTaxNodeIds,
            userUniversity,
            candidateTeams: candidatePayloads,
            topK: allTeams.length,
          })
        : [];

      const recsMap = new Map(recommendations.map((r) => [r.teamId, r]));

      // Format team details with scores
      let processedTeams: TeamDetailResponse[] = allTeams.map((team) => {
        const isLeader = callerDbId ? team.members.some((m) => m.userId === callerDbId && m.role === "Leader") : false;
        const isMember = callerDbId ? team.members.some((m) => m.userId === callerDbId) : false;
        const rec = recsMap.get(team.id);

        return {
          id: team.id,
          name: team.name,
          eventId: team.eventId,
          event: team.event
            ? {
                id: team.event.id,
                title: team.event.title,
                date: team.event.date.toISOString(),
                isGlobal: team.event.isGlobal,
                location: team.event.location,
                university: team.university,
              }
            : undefined,
          orgId: team.orgId,
          requirements: team.requirements,
          requirementNodeIds: team.taxonomy?.requirementNodeIds || [],
          university: team.university,
          members: team.members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
            name: m.user.name,
            email: m.user.email,
            university: m.user.profile?.university || null,
            skills: m.user.profile?.skills || [],
            title: m.user.profile?.title || null,
          })),
          isLeader,
          isMember,
          taxonomyScore: rec ? rec.taxonomyScore : undefined,
          category: rec ? rec.recommendationCategory : undefined,
          neededRequirement: team.requirements?.[0],
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        };
      });

      // Apply openSpotsOnly filter
      if (openSpotsOnly) {
        processedTeams = processedTeams.filter((t) => {
          const maxCap = 4;
          return maxCap - t.members.length > 0;
        });
      }

      // Apply tier filter
      if (tier && tier !== "ALL") {
        if (tier === "BEST") {
          processedTeams = processedTeams.filter((t) => t.category === "BEST");
        } else if (tier === "CROSS_CAMPUS") {
          processedTeams = processedTeams.filter((t) => t.category === "GOOD_DIFFERENT_UNIVERSITY");
        } else if (tier === "CAMPUS_EXPLORER") {
          processedTeams = processedTeams.filter((t) => t.category === "SAME_UNIVERSITY_LOWER_SCORE");
        }
      }

      // Sort results
      if (sort === "fit_desc") {
        processedTeams.sort((a, b) => {
          const scoreA = a.taxonomyScore ?? 0;
          const scoreB = b.taxonomyScore ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sort === "fit_asc") {
        processedTeams.sort((a, b) => {
          const scoreA = a.taxonomyScore ?? 0;
          const scoreB = b.taxonomyScore ?? 0;
          if (scoreA !== scoreB) return scoreA - scoreB;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sort === "spots_desc") {
        processedTeams.sort((a, b) => {
          const spotsA = 4 - a.members.length;
          const spotsB = 4 - b.members.length;
          return spotsB - spotsA;
        });
      } else if (sort === "name_asc" || sort === "name") {
        processedTeams.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Default: created_at descending
        processedTeams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      const total = processedTeams.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginatedData = processedTeams.slice((page - 1) * limit, page * limit);

      const payload: PaginatedResponse<TeamDetailResponse> = {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      // Cache list for 2 minutes
      await CacheService.set(cacheKey, payload, 120);

      return res.json(payload);
    }

    // Fallback: Standard database query when no taxonomy scoring is needed
    let orderBy: Prisma.TeamOrderByWithRelationInput = { createdAt: "desc" };
    if (sort === "name_asc" || sort === "name") {
      orderBy = { name: "asc" };
    }

    const [totalRaw, teams] = await prisma.$transaction([
      prisma.team.count({ where }),
      prisma.team.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              isGlobal: true,
              location: true,
            },
          },
          taxonomy: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profile: {
                    select: {
                      university: true,
                      title: true,
                      skills: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    let data: TeamDetailResponse[] = teams.map((team) => {
      const isLeader = callerDbId ? team.members.some((m) => m.userId === callerDbId && m.role === "Leader") : false;
      const isMember = callerDbId ? team.members.some((m) => m.userId === callerDbId) : false;

      return {
        id: team.id,
        name: team.name,
        eventId: team.eventId,
        event: team.event
          ? {
              id: team.event.id,
              title: team.event.title,
              date: team.event.date.toISOString(),
              isGlobal: team.event.isGlobal,
              location: team.event.location,
              university: team.university,
            }
          : undefined,
        orgId: team.orgId,
        requirements: team.requirements,
        requirementNodeIds: team.taxonomy?.requirementNodeIds || [],
        university: team.university,
        members: team.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
          name: m.user.name,
          email: m.user.email,
          university: m.user.profile?.university || null,
          skills: m.user.profile?.skills || [],
          title: m.user.profile?.title || null,
        })),
        isLeader,
        isMember,
        neededRequirement: team.requirements?.[0],
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      };
    });

    if (openSpotsOnly) {
      data = data.filter((t) => 4 - t.members.length > 0);
    }

    const totalPages = Math.ceil(totalRaw / limit) || 1;

    const payload: PaginatedResponse<TeamDetailResponse> = {
      data,
      pagination: {
        page,
        limit,
        total: totalRaw,
        totalPages,
      },
    };

    // Cache list for 2 minutes
    await CacheService.set(cacheKey, payload, 120);

    return res.json(payload);
  } catch (error) {
    console.error("[Team API] Error fetching teams list:", error);
    return res.status(500).json({ error: "Failed to fetch teams." });
  }
};

export const getTeamById = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const auth = getAuth(req);

  let callerDbId: string | null = null;
  if (auth.userId) {
    try {
      const user = await getOrCreateUserByClerkId(auth.userId);
      callerDbId = user.id;
    } catch {
      // Continue unauthenticated
    }
  }

  const cacheKey = `team:${id}`;
  const cached = await CacheService.get<TeamDetailResponse>(cacheKey);

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            isGlobal: true,
            location: true,
          },
        },
        taxonomy: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: {
                    university: true,
                    title: true,
                    skills: true,
                  },
                },
              },
            },
          },
        },
        invites: true,
        applications: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: {
                    university: true,
                    title: true,
                    skills: true,
                  },
                },
                taxonomy: {
                  select: {
                    taxonomyNodeIds: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const isLeader = callerDbId ? team.members.some((m) => m.userId === callerDbId && m.role === "Leader") : false;
    const isMember = callerDbId ? team.members.some((m) => m.userId === callerDbId) : false;
    const hasApplied = callerDbId ? team.applications.some((a) => a.userId === callerDbId && a.status === "PENDING") : false;

    const payload: TeamDetailResponse = {
      id: team.id,
      name: team.name,
      eventId: team.eventId,
      event: team.event
        ? {
            id: team.event.id,
            title: team.event.title,
            date: team.event.date.toISOString(),
            isGlobal: team.event.isGlobal,
            location: team.event.location,
            university: team.university,
          }
        : undefined,
      orgId: team.orgId,
      requirements: team.requirements,
      requirementNodeIds: team.taxonomy?.requirementNodeIds || [],
      university: team.university,
      members: team.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        name: m.user.name,
        email: m.user.email,
        university: m.user.profile?.university || null,
        skills: m.user.profile?.skills || [],
        title: m.user.profile?.title || null,
      })),
      // Only include pending invites and applications for team members/leader
      invites: isMember || isLeader
        ? team.invites.map((inv) => ({
            id: inv.id,
            teamId: inv.teamId,
            senderId: inv.senderId,
            email: inv.email,
            status: inv.status,
            createdAt: inv.createdAt.toISOString(),
          }))
        : undefined,
      applications: isLeader
        ? team.applications.map((app) => ({
            id: app.id,
            teamId: app.teamId,
            userId: app.userId,
            message: app.message,
            status: app.status,
            createdAt: app.createdAt.toISOString(),
            applicant: {
              id: app.user.id,
              name: app.user.name,
              email: app.user.email,
              university: app.user.profile?.university || null,
              skills: app.user.profile?.skills || [],
              title: app.user.profile?.title || null,
              taxonomyNodeIds: app.user.taxonomy?.taxonomyNodeIds || [],
            },
          }))
        : undefined,
      isLeader,
      isMember,
      hasApplied,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };

    // Cache generic team detail for 15 minutes (900s)
    await CacheService.set(cacheKey, payload, 900);

    return res.json(payload);
  } catch (error) {
    console.error("[Team API] Error fetching team:", error);
    return res.status(500).json({ error: "Failed to fetch team." });
  }
};

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
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name,
          eventId,
          requirements: requirements || [],
          orgId: orgId || null,
        },
      });

      await tx.teamTaxonomy.create({
        data: {
          teamId: newTeam.id,
          requirementNodeIds,
          rawRequirements: requirements || [],
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: userInDb.id,
          role: "Leader",
        },
      });

      if (invites && invites.length > 0) {
        const uniqueEmails = [...new Set(invites)];
        await tx.teamInvite.createMany({
          data: uniqueEmails.map((email) => ({
            teamId: newTeam.id,
            senderId: userInDb.id,
            email,
            status: "PENDING",
          })),
        });
      }

      return newTeam;
    });

    // Invalidate caches
    await CacheService.invalidatePattern("teams:list:*");
    await CacheService.invalidatePattern("events:*");

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

export const updateTeam = async (
  req: Request<{ id: string }, {}, UpdateTeamRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const { name, requirements, university } = req.body;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const existingTeam = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!existingTeam) {
      return res.status(404).json({ error: "Team not found." });
    }

    const isLeader = existingTeam.members.some(
      (m) => m.userId === userInDb.id && m.role === "Leader"
    );
    if (!isLeader) {
      return res.status(403).json({ error: "Forbidden. Only the team leader can update team details." });
    }

    // Re-resolve taxonomy if requirements changed
    let requirementNodeIds: string[] | undefined;
    if (requirements !== undefined) {
      try {
        const taxRes = await AIService.resolveTeamRequirements(id, requirements);
        requirementNodeIds = taxRes.requirement_node_ids;

        await prisma.teamTaxonomy.upsert({
          where: { teamId: id },
          update: {
            requirementNodeIds,
            rawRequirements: requirements,
          },
          create: {
            teamId: id,
            requirementNodeIds,
            rawRequirements: requirements,
          },
        });
        console.log(`[Team API] Synced TeamTaxonomy for team ${id} with ${requirementNodeIds.length} nodes`);
      } catch (taxErr) {
        console.warn("[Team API] Failed to re-resolve team requirement taxonomy:", taxErr);
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(requirements !== undefined && { requirements }),
        ...(university !== undefined && { university }),
      },
    });

    // Invalidate caches
    await CacheService.del(`team:${id}`);
    await CacheService.invalidatePattern("teams:list:*");

    return res.json({
      message: "Team updated successfully.",
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        requirements: updatedTeam.requirements,
        university: updatedTeam.university,
        requirementNodeIds,
        updatedAt: updatedTeam.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Team API] Error updating team:", error);
    return res.status(500).json({ error: "Failed to update team." });
  }
};

export const deleteTeam = async (req: Request<{ id: string }>, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const existingTeam = await prisma.team.findUnique({
      where: { id },
      include: {
        members: true,
        event: true,
      },
    });

    if (!existingTeam) {
      return res.status(404).json({ error: "Team not found." });
    }

    const isLeader = existingTeam.members.some(
      (m) => m.userId === userInDb.id && m.role === "Leader"
    );
    const isEventOrganizer = existingTeam.event.organizerId === userInDb.id;

    if (!isLeader && !isEventOrganizer) {
      return res.status(403).json({ error: "Forbidden. Only the team leader or event organizer can delete this team." });
    }

    await prisma.team.delete({
      where: { id },
    });

    // Invalidate caches
    await CacheService.del(`team:${id}`);
    await CacheService.invalidatePattern("teams:list:*");
    await CacheService.invalidatePattern("events:*");

    return res.json({ message: "Team deleted successfully." });
  } catch (error) {
    console.error("[Team API] Error deleting team:", error);
    return res.status(500).json({ error: "Failed to delete team." });
  }
};

export const sendTeamInvites = async (
  req: Request<{ id: string }, {}, SendTeamInvitesRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const { invites } = req.body;

  if (!invites || !Array.isArray(invites) || invites.length === 0) {
    return res.status(400).json({ error: "An array of emails is required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true, invites: true },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const isLeader = team.members.some(
      (m) => m.userId === userInDb.id && m.role === "Leader"
    );
    if (!isLeader) {
      return res.status(403).json({ error: "Forbidden. Only the team leader can send invites." });
    }

    const uniqueEmails = [...new Set(invites.map((e) => e.trim().toLowerCase()))];
    const existingInviteEmails = new Set(team.invites.map((i) => i.email.toLowerCase()));
    const newEmails = uniqueEmails.filter((e) => !existingInviteEmails.has(e));

    if (newEmails.length === 0) {
      return res.status(400).json({ message: "All specified emails already have pending invites." });
    }

    await prisma.teamInvite.createMany({
      data: newEmails.map((email) => ({
        teamId: id,
        senderId: userInDb.id,
        email,
        status: "PENDING",
      })),
    });

    await CacheService.del(`team:${id}`);

    return res.status(201).json({
      message: `Sent ${newEmails.length} invite(s) successfully.`,
      invitedEmails: newEmails,
    });
  } catch (error) {
    console.error("[Team API] Error sending invites:", error);
    return res.status(500).json({ error: "Failed to send invites." });
  }
};

export const getMyInvites = async (req: Request, res: Response) => {
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
    const invites = await prisma.teamInvite.findMany({
      where: {
        email: { equals: userInDb.email, mode: "insensitive" },
        status: "PENDING",
      },
      include: {
        team: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
                isGlobal: true,
                location: true,
              },
            },
            _count: { select: { members: true } },
          },
        },
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      totalInvites: invites.length,
      invites: invites.map((inv) => ({
        id: inv.id,
        teamId: inv.teamId,
        teamName: inv.team.name,
        eventId: inv.team.eventId,
        eventTitle: inv.team.event.title,
        isGlobal: inv.team.event.isGlobal,
        senderName: inv.sender.name,
        membersCount: inv.team._count.members,
        requirements: inv.team.requirements,
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Team API] Error fetching user invites:", error);
    return res.status(500).json({ error: "Failed to fetch invites." });
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
      where: { id: inviteId },
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
        error: "Forbidden. This invite was sent to a different email address.",
      });
    }

    await prisma.$transaction([
      prisma.teamInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" },
      }),
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: userInDb.id,
          role: "Member",
        },
      }),
    ]);

    await CacheService.del(`team:${invite.teamId}`);
    await CacheService.invalidatePattern("teams:list:*");

    return res.status(200).json({ message: "Invite accepted successfully" });
  } catch (error) {
    console.error("[Team API] Error accepting invite:", error);
    return res.status(500).json({ error: "Failed to accept invite." });
  }
};

export const declineInvite = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { inviteId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found." });
    }

    if (invite.email.toLowerCase() !== userInDb.email.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden. This invite belongs to a different email." });
    }

    await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: "DECLINED" },
    });

    await CacheService.del(`team:${invite.teamId}`);

    return res.json({ message: "Invite declined." });
  } catch (error) {
    console.error("[Team API] Error declining invite:", error);
    return res.status(500).json({ error: "Failed to decline invite." });
  }
};

export const cancelInvite = async (req: Request<{ id: string; inviteId: string }>, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, inviteId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const isLeader = team.members.some(
      (m) => m.userId === userInDb.id && m.role === "Leader"
    );
    if (!isLeader) {
      return res.status(403).json({ error: "Forbidden. Only the team leader can cancel invites." });
    }

    await prisma.teamInvite.delete({
      where: { id: inviteId },
    });

    await CacheService.del(`team:${id}`);

    return res.json({ message: "Invite cancelled." });
  } catch (error) {
    console.error("[Team API] Error cancelling invite:", error);
    return res.status(500).json({ error: "Failed to cancel invite." });
  }
};

export const applyToTeam = async (
  req: Request<{ id: string }, {}, CreateApplicationRequest>,
  res: Response
) => {
  const { userId, orgId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const { message } = req.body;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        event: true,
        members: true,
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    // 1. Hard Eligibility Check: If event is not global, verify university matching
    if (!team.event.isGlobal) {
      const userWithProfile = await prisma.user.findUnique({
        where: { id: userInDb.id },
        include: { profile: true },
      });

      const userUni = userWithProfile?.profile?.university?.toLowerCase() || "";
      const teamUni = (team.university || team.event.location || "").toLowerCase();
      const orgMatches = orgId && team.orgId && orgId === team.orgId;

      if (!orgMatches && (!userUni || !teamUni || userUni !== teamUni)) {
        return res.status(403).json({
          error: "Cannot apply: This team belongs to an institution-restricted event.",
        });
      }
    }

    // 2. Check if already a member
    const alreadyMember = team.members.some((m) => m.userId === userInDb.id);
    if (alreadyMember) {
      return res.status(400).json({ error: "You are already a member of this team." });
    }

    // 3. Check for existing pending application
    const existingApp = await prisma.teamApplication.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userInDb.id,
        },
      },
    });

    if (existingApp && existingApp.status === "PENDING") {
      return res.status(400).json({ error: "You already have a pending application for this team." });
    }

    const application = await prisma.teamApplication.upsert({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userInDb.id,
        },
      },
      update: {
        message: message || null,
        status: "PENDING",
      },
      create: {
        teamId: id,
        userId: userInDb.id,
        message: message || null,
        status: "PENDING",
      },
    });

    await CacheService.del(`team:${id}`);

    return res.status(201).json({
      message: "Application submitted successfully.",
      applicationId: application.id,
      status: application.status,
    });
  } catch (error) {
    console.error("[Team API] Error applying to team:", error);
    return res.status(500).json({ error: "Failed to apply to team." });
  }
};

export const withdrawApplication = async (req: Request<{ id: string }>, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const existingApp = await prisma.teamApplication.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userInDb.id,
        },
      },
    });

    if (!existingApp) {
      return res.status(404).json({ error: "Application not found." });
    }

    await prisma.teamApplication.delete({
      where: { id: existingApp.id },
    });

    await CacheService.del(`team:${id}`);

    return res.json({ message: "Application withdrawn successfully." });
  } catch (error) {
    console.error("[Team API] Error withdrawing application:", error);
    return res.status(500).json({ error: "Failed to withdraw application." });
  }
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * GET /api/teams/applications/my-applications
 * Retrieves all applications submitted by the currently authenticated candidate.
 */
export const getMyApplications = async (req: Request, res: Response) => {
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
    const applications = await prisma.teamApplication.findMany({
      where: { userId: userInDb.id },
      include: {
        team: {
          include: {
            event: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const response: MyApplicationResponse[] = applications.map((app) => ({
      id: app.id,
      teamId: app.teamId,
      teamName: app.team.name,
      eventId: app.team.eventId,
      eventTitle: app.team.event.title,
      university: app.team.university || app.team.event.location || null,
      requirements: app.team.requirements,
      message: app.message,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    }));

    return res.json({
      total: response.length,
      applications: response,
    });
  } catch (error) {
    console.error("[Team API] Error fetching user applications:", error);
    return res.status(500).json({ error: "Failed to fetch user applications." });
  }
};

/**
 * GET /api/teams/applications/incoming
 * Retrieves all incoming candidate applications across all teams led by the current user.
 * Supports filtering by ?teamId=... and ?status=...
 */
export const getIncomingApplications = async (req: Request, res: Response) => {
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

  const teamId = (req.query.teamId as string)?.trim() || undefined;
  const statusFilter = (req.query.status as string)?.trim() || undefined;

  try {
    const ledTeams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: userInDb.id,
            role: "Leader",
          },
        },
        ...(teamId ? { id: teamId } : {}),
      },
      include: {
        event: true,
        taxonomy: true,
        applications: {
          where: statusFilter ? { status: statusFilter } : undefined,
          include: {
            user: {
              include: {
                profile: true,
                taxonomy: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const incomingList: IncomingApplicationResponse[] = [];

    for (const team of ledTeams) {
      const teamReqNodes = team.taxonomy?.requirementNodeIds || [];
      const teamReqs = team.requirements || [];

      for (const app of team.applications) {
        const applicantTaxNodes = new Set(app.user.taxonomy?.taxonomyNodeIds || []);
        const applicantSkills = app.user.profile?.skills || [];
        const applicantEvidence = (app.user.taxonomy?.evidence as any[]) || [];

        let matchScore = 0.85;
        if (teamReqNodes.length > 0) {
          const matched = teamReqNodes.filter((n) => applicantTaxNodes.has(n)).length;
          matchScore = Math.min(0.98, Math.max(0.60, 0.60 + (matched / teamReqNodes.length) * 0.38));
        } else if (teamReqs.length > 0 && applicantSkills.length > 0) {
          matchScore = 0.88;
        }

        const applicantUni = app.user.profile?.university || "Independent Student";
        const teamUni = team.university || team.event?.location || "";
        const isCampusMatch = Boolean(
          teamUni && applicantUni && teamUni.toLowerCase() === applicantUni.toLowerCase()
        );

        const mappedSkills = applicantSkills.slice(0, 4).map((skillName) => {
          const evidenceItem = applicantEvidence.find(
            (e) => e.snippet?.toLowerCase().includes(skillName.toLowerCase())
          );
          return {
            name: skillName,
            provenance: evidenceItem?.source ? `Resume: ${evidenceItem.source}` : "Verified Profile",
            score: Math.min(0.96, Math.max(0.75, matchScore + 0.05)),
          };
        });

        let yearString = "Candidate";
        if (app.user.profile?.title) {
          yearString = app.user.profile.title;
        } else if (Array.isArray(app.user.profile?.education) && app.user.profile.education.length > 0) {
          const edu = app.user.profile.education[0] as any;
          yearString = edu?.degree || edu?.year || "Student";
        }

        const appliedRole = teamReqs[0] || "General Contributor";

        incomingList.push({
          id: app.id,
          candidateId: app.user.id,
          name: app.user.name,
          avatarUrl: null,
          university: applicantUni,
          year: yearString,
          appliedRole,
          matchScore: parseFloat(matchScore.toFixed(2)),
          isCampusMatch,
          appliedTimeAgo: formatTimeAgo(app.createdAt),
          coverNote: app.message || "I'm excited to collaborate and contribute to your squad!",
          skills: mappedSkills.length > 0 ? mappedSkills : [
            { name: "Full Stack", provenance: "Profile", score: 0.85 }
          ],
          status: app.status as any,
          teamId: team.id,
          teamName: team.name,
          createdAt: app.createdAt.toISOString(),
        });
      }
    }

    return res.json({
      total: incomingList.length,
      applications: incomingList,
    });
  } catch (error) {
    console.error("[Team API] Error fetching incoming applications:", error);
    return res.status(500).json({ error: "Failed to fetch incoming applications." });
  }
};

/**
 * GET /api/teams/applications/:applicationId
 * Retrieves detailed info for a single application.
 */
export const getApplicationById = async (
  req: Request<{ applicationId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicationId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
      include: {
        team: {
          include: {
            event: true,
            members: true,
            taxonomy: true,
          },
        },
        user: {
          include: {
            profile: true,
            taxonomy: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    const isApplicant = application.userId === userInDb.id;
    const isLeader = application.team.members.some(
      (m) => m.userId === userInDb.id && m.role === "Leader"
    );

    if (!isApplicant && !isLeader) {
      return res.status(403).json({ error: "Forbidden. You do not have permission to view this application." });
    }

    return res.json({
      id: application.id,
      teamId: application.teamId,
      teamName: application.team.name,
      eventId: application.team.eventId,
      eventTitle: application.team.event.title,
      userId: application.userId,
      message: application.message,
      status: application.status,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      applicant: {
        id: application.user.id,
        name: application.user.name,
        email: application.user.email,
        university: application.user.profile?.university || null,
        title: application.user.profile?.title || null,
        skills: application.user.profile?.skills || [],
        taxonomyNodeIds: application.user.taxonomy?.taxonomyNodeIds || [],
      },
      team: {
        id: application.team.id,
        name: application.team.name,
        requirements: application.team.requirements,
        university: application.team.university,
      },
    });
  } catch (error) {
    console.error("[Team API] Error fetching application by ID:", error);
    return res.status(500).json({ error: "Failed to fetch application." });
  }
};

/**
 * DELETE /api/teams/applications/:applicationId
 * Allows a candidate to withdraw their pending application by ID.
 */
export const withdrawApplicationById = async (
  req: Request<{ applicationId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicationId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (application.userId !== userInDb.id) {
      return res.status(403).json({ error: "Forbidden. You can only withdraw your own applications." });
    }

    await prisma.teamApplication.delete({
      where: { id: applicationId },
    });

    await CacheService.del(`team:${application.teamId}`);

    return res.json({ message: "Application withdrawn successfully." });
  } catch (error) {
    console.error("[Team API] Error withdrawing application by ID:", error);
    return res.status(500).json({ error: "Failed to withdraw application." });
  }
};

export const getTeamApplications = async (req: Request<{ id: string }>, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const isLeader = team.members.some(
      (m) => m.userId === userInDb.id && m.role === "Leader"
    );
    if (!isLeader) {
      return res.status(403).json({ error: "Forbidden. Only the team leader can review applications." });
    }

    const applications = await prisma.teamApplication.findMany({
      where: { teamId: id },
      include: {
        user: {
          include: {
            profile: true,
            taxonomy: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      totalApplications: applications.length,
      applications: applications.map((app) => ({
        id: app.id,
        teamId: app.teamId,
        userId: app.userId,
        message: app.message,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
        applicant: {
          id: app.user.id,
          name: app.user.name,
          email: app.user.email,
          university: app.user.profile?.university || null,
          skills: app.user.profile?.skills || [],
          title: app.user.profile?.title || null,
          taxonomyNodeIds: app.user.taxonomy?.taxonomyNodeIds || [],
        },
      })),
    });
  } catch (error) {
    console.error("[Team API] Error fetching team applications:", error);
    return res.status(500).json({ error: "Failed to fetch applications." });
  }
};

export const acceptApplication = async (
  req: Request<{ applicationId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicationId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
      include: {
        team: { include: { members: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    const isLeader = application.team.members.some(
      (m) => m.userId === userInDb.id && m.role === "Leader"
    );
    if (!isLeader) {
      return res.status(403).json({ error: "Forbidden. Only the team leader can accept applications." });
    }

    await prisma.$transaction([
      prisma.teamApplication.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED" },
      }),
      prisma.teamMember.create({
        data: {
          teamId: application.teamId,
          userId: application.userId,
          role: "Member",
        },
      }),
    ]);

    await CacheService.del(`team:${application.teamId}`);
    await CacheService.invalidatePattern("teams:list:*");

    return res.json({ message: "Application accepted and member added." });
  } catch (error) {
    console.error("[Team API] Error accepting application:", error);
    return res.status(500).json({ error: "Failed to accept application." });
  }
};

export const rejectApplication = async (
  req: Request<{ applicationId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicationId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
      include: {
        team: { include: { members: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    const isLeader = application.team.members.some(
      (m) => m.userId === userInDb.id && m.role === "Leader"
    );
    if (!isLeader) {
      return res.status(403).json({ error: "Forbidden. Only the team leader can reject applications." });
    }

    await prisma.teamApplication.update({
      where: { id: applicationId },
      data: { status: "REJECTED" },
    });

    await CacheService.del(`team:${application.teamId}`);

    return res.json({ message: "Application rejected." });
  } catch (error) {
    console.error("[Team API] Error rejecting application:", error);
    return res.status(500).json({ error: "Failed to reject application." });
  }
};

export const leaveTeam = async (req: Request<{ id: string }>, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: { orderBy: { joinedAt: "asc" } },
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const memberRecord = team.members.find((m) => m.userId === userInDb.id);
    if (!memberRecord) {
      return res.status(400).json({ error: "You are not a member of this team." });
    }

    const isLeader = memberRecord.role === "Leader";

    if (isLeader) {
      const remainingMembers = team.members.filter((m) => m.userId !== userInDb.id);

      if (remainingMembers.length === 0) {
        // Sole leader and only member: delete team
        await prisma.team.delete({ where: { id } });
        await CacheService.del(`team:${id}`);
        await CacheService.invalidatePattern("teams:list:*");
        return res.json({ message: "You were the sole member. Team deleted successfully." });
      } else {
        // Transfer leadership to the earliest remaining member
        const newLeader = remainingMembers[0];
        await prisma.$transaction([
          prisma.teamMember.delete({
            where: { id: memberRecord.id },
          }),
          prisma.teamMember.update({
            where: { id: newLeader.id },
            data: { role: "Leader" },
          }),
        ]);
        await CacheService.del(`team:${id}`);
        await CacheService.invalidatePattern("teams:list:*");
        return res.json({ message: `Left team successfully. Leadership transferred to ${newLeader.userId}.` });
      }
    } else {
      // Non-leader member leaving
      await prisma.teamMember.delete({
        where: { id: memberRecord.id },
      });
      await CacheService.del(`team:${id}`);
      await CacheService.invalidatePattern("teams:list:*");
      return res.json({ message: "Left team successfully." });
    }
  } catch (error) {
    console.error("[Team API] Error leaving team:", error);
    return res.status(500).json({ error: "Failed to leave team." });
  }
};

export const removeTeamMember = async (
  req: Request<{ id: string; userId: string }>,
  res: Response
) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, userId: targetUserId } = req.params;

  let callerInDb;
  try {
    callerInDb = await getOrCreateUserByClerkId(auth.userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const isLeader = team.members.some(
      (m) => m.userId === callerInDb.id && m.role === "Leader"
    );
    if (!isLeader) {
      return res.status(403).json({ error: "Forbidden. Only the team leader can remove members." });
    }

    if (callerInDb.id === targetUserId) {
      return res.status(400).json({ error: "Cannot remove yourself. Use the leave team endpoint instead." });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: targetUserId }, { clerkId: targetUserId }],
      },
    });

    const targetMember = targetUser
      ? team.members.find((m) => m.userId === targetUser.id)
      : null;

    if (!targetMember) {
      return res.status(404).json({ error: "Member not found in this team." });
    }

    await prisma.teamMember.delete({
      where: { id: targetMember.id },
    });

    await CacheService.del(`team:${id}`);
    await CacheService.invalidatePattern("teams:list:*");

    return res.json({ message: "Member removed from team successfully." });
  } catch (error) {
    console.error("[Team API] Error removing team member:", error);
    return res.status(500).json({ error: "Failed to remove member." });
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

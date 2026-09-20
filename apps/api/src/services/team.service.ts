import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamDetailResponse,
  PaginatedResponse,
} from "@squadup/shared";
import { AIService } from "./ai.service.js";
import { CacheService } from "./cache.service.js";
import { NotificationService } from "./notification.service.js";
import { queueTeamInvitationEmail } from "../queues/email.queue.js";

export interface CallerContext {
  callerDbId: string | null;
  userTaxNodeIds: string[];
  userUniversity: string | null;
  callerUserOrgIds: string[];
}

export function calculateTeamMaxCapacity(team: {
  members: any[];
  roles?: Array<{ spots?: number | null }> | null;
  requirements?: string[] | null;
}): number {
  if (team.roles && team.roles.length > 0) {
    const openSpots = team.roles.reduce((sum, r) => sum + (r.spots ?? 0), 0);
    return team.members.length + openSpots;
  }
  if (team.requirements && team.requirements.length > 0) {
    return Math.max(team.members.length, team.requirements.length);
  }
  return Math.max(team.members.length, 4);
}

export class TeamService {
  /**
   * Helper method to calculate capacity.
   */
  static calculateCapacity = calculateTeamMaxCapacity;

  /**
   * Lists squads with search, campus, role fit sorting, and tier filtering.
   */
  static async listTeams(
    params: {
      page: number;
      limit: number;
      eventId?: string;
      search?: string;
      myTeams?: boolean;
      campus?: string;
      openSpotsOnly?: boolean;
      tier?: string;
      sort?: string;
    },
    caller: CallerContext
  ): Promise<PaginatedResponse<TeamDetailResponse>> {
    const { page, limit, eventId, search, myTeams, campus, openSpotsOnly, tier, sort = "created_at" } = params;
    const { callerDbId, userTaxNodeIds, userUniversity } = caller;

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
      return cached;
    }

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

    // Ranking & Sorting Logic
    let orderBy: Prisma.TeamOrderByWithRelationInput | Prisma.TeamOrderByWithRelationInput[] = {
      createdAt: "desc",
    };
    if (sort === "members_count") {
      orderBy = { members: { _count: "desc" } };
    } else if (sort === "created_asc") {
      orderBy = { createdAt: "asc" };
    }

    const isTaxonomySort = sort === "role_fit" || sort === "match_score";

    if (isTaxonomySort && userTaxNodeIds.length > 0) {
      const allMatchingTeams = await prisma.team.findMany({
        where,
        include: {
          event: true,
          roles: true,
          taxonomy: true,
          members: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          applications: callerDbId
            ? {
                where: { userId: callerDbId },
                select: { id: true, status: true },
              }
            : false,
        },
      });

      const candidatePayloads = allMatchingTeams.map((t) => ({
        team_id: t.id,
        team_name: t.name,
        university: t.university || t.event?.location || null,
        description: t.event?.description || null,
        requirements: t.requirements || [],
        requirement_node_ids: t.taxonomy?.requirementNodeIds || [],
        roles: t.roles
          ? t.roles.map((r) => ({
              id: r.id,
              title: r.title,
              skills: r.skills,
              spots: r.spots,
              assignedToId: r.assignedToId,
            }))
          : undefined,
        is_global: t.event?.isGlobal ?? false,
        is_eligible: true,
      }));

      let recMap = new Map<string, any>();
      if (candidatePayloads.length > 0) {
        try {
          const recs = await AIService.getRecommendations({
            userId: callerDbId || "anonymous",
            userTaxonomyNodeIds: userTaxNodeIds,
            userUniversity,
            candidateTeams: candidatePayloads,
            topK: candidatePayloads.length,
          });
          recs.forEach((r) => recMap.set(r.teamId, r));
        } catch {
          // Continue without recommendations
        }
      }

      let enriched = allMatchingTeams.map((team) => {
        const rec = recMap.get(team.id);
        const taxonomyScore = rec ? rec.taxonomyScore : 0.0;
        const category = rec ? rec.recommendationCategory : undefined;
        const breakdown = rec ? rec.requirementBreakdown : undefined;
        const bestMatchingRole = rec ? rec.bestMatchingRole : undefined;
        const maxCapacity = calculateTeamMaxCapacity(team);
        const isLeader = callerDbId ? team.members.some((m) => m.userId === callerDbId && m.role === "Leader") : false;
        const isMember = callerDbId ? team.members.some((m) => m.userId === callerDbId) : false;
        const hasApplied = callerDbId
          ? team.applications?.some((a) => a.userId === callerDbId && a.status === "PENDING") ?? false
          : false;

        const detail: TeamDetailResponse = {
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
                university: team.event.location,
                orgId: team.event.orgId,
              }
            : undefined,
          orgId: team.orgId,
          requirements: team.requirements,
          roles: team.roles
            ? team.roles.map((r) => ({
                id: r.id,
                teamId: r.teamId,
                title: r.title,
                skills: r.skills,
                spots: r.spots,
                assignedToId: r.assignedToId,
              }))
            : [],
          bestMatchingRole: bestMatchingRole
            ? {
                roleId: bestMatchingRole.roleId,
                roleTitle: bestMatchingRole.roleTitle,
                score: bestMatchingRole.score,
                fulfilledCount: bestMatchingRole.fulfilledCount,
                totalCount: bestMatchingRole.totalCount,
                skills: bestMatchingRole.skills,
              }
            : null,
          university: team.university || team.event?.location || null,
          members: team.members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
            name: m.user.name,
            email: m.user.email,
            avatarUrl: m.user.imageUrl || null,
            imageUrl: m.user.imageUrl || null,
            university: m.user.profile?.university || null,
            skills: m.user.profile?.skills || [],
            title: m.user.profile?.title || null,
          })),
          isLeader,
          isMember,
          hasApplied,
          maxCapacity,
          taxonomyScore,
          category,
          requirementBreakdown: breakdown,
          neededRequirement: team.requirements?.[0],
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        };

        return detail;
      });

      // Filter open spots only if specified
      if (openSpotsOnly) {
        enriched = enriched.filter((t) => (t.maxCapacity ?? 4) > t.members.length);
      }

      // Filter tier if specified
      if (tier && tier !== "ALL") {
        enriched = enriched.filter((t) => {
          if (tier === "HIGH") return (t.taxonomyScore ?? 0) >= 0.75;
          if (tier === "MODERATE") return (t.taxonomyScore ?? 0) >= 0.45 && (t.taxonomyScore ?? 0) < 0.75;
          if (tier === "EXPLORE") return (t.taxonomyScore ?? 0) < 0.45;
          return true;
        });
      }

      // Sort by score descending
      enriched.sort((a, b) => (b.taxonomyScore ?? 0) - (a.taxonomyScore ?? 0));

      const total = enriched.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginatedData = enriched.slice((page - 1) * limit, page * limit);

      const result: PaginatedResponse<TeamDetailResponse> = {
        data: paginatedData,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };

      await CacheService.set(cacheKey, result, 60);
      return result;
    }

    // Standard Database Pagination (Non-taxonomy or anonymous)
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          event: true,
          roles: true,
          taxonomy: true,
          members: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          applications: callerDbId
            ? {
                where: { userId: callerDbId },
                select: { id: true, status: true },
              }
            : false,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.team.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    let candidatePayloads: any[] = [];
    if (userTaxNodeIds.length > 0 && teams.length > 0) {
      candidatePayloads = teams.map((t) => ({
        team_id: t.id,
        team_name: t.name,
        university: t.university || t.event?.location || null,
        description: t.event?.description || null,
        requirements: t.requirements || [],
        requirement_node_ids: t.taxonomy?.requirementNodeIds || [],
        roles: t.roles
          ? t.roles.map((r) => ({
              id: r.id,
              title: r.title,
              skills: r.skills,
              spots: r.spots,
              assignedToId: r.assignedToId,
            }))
          : undefined,
        is_global: t.event?.isGlobal ?? false,
        is_eligible: true,
      }));
    }

    let recMap = new Map<string, any>();
    if (candidatePayloads.length > 0) {
      try {
        const recs = await AIService.getRecommendations({
          userId: callerDbId || "anonymous",
          userTaxonomyNodeIds: userTaxNodeIds,
          userUniversity,
          candidateTeams: candidatePayloads,
          topK: candidatePayloads.length,
        });
        recs.forEach((r) => recMap.set(r.teamId, r));
      } catch {
        // Fallback
      }
    }

    let enrichedData: TeamDetailResponse[] = teams.map((team) => {
      const rec = recMap.get(team.id);
      const taxonomyScore = rec ? rec.taxonomyScore : undefined;
      const category = rec ? rec.recommendationCategory : undefined;
      const breakdown = rec ? rec.requirementBreakdown : undefined;
      const bestMatchingRole = rec ? rec.bestMatchingRole : undefined;
      const maxCapacity = calculateTeamMaxCapacity(team);
      const isLeader = callerDbId ? team.members.some((m) => m.userId === callerDbId && m.role === "Leader") : false;
      const isMember = callerDbId ? team.members.some((m) => m.userId === callerDbId) : false;
      const hasApplied = callerDbId
        ? team.applications?.some((a) => a.userId === callerDbId && a.status === "PENDING") ?? false
        : false;

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
              university: team.event.location,
              orgId: team.event.orgId,
            }
          : undefined,
        orgId: team.orgId,
        requirements: team.requirements,
        roles: team.roles
          ? team.roles.map((r) => ({
              id: r.id,
              teamId: r.teamId,
              title: r.title,
              skills: r.skills,
              spots: r.spots,
              assignedToId: r.assignedToId,
            }))
          : [],
        bestMatchingRole: bestMatchingRole
          ? {
              roleId: bestMatchingRole.roleId,
              roleTitle: bestMatchingRole.roleTitle,
              score: bestMatchingRole.score,
              fulfilledCount: bestMatchingRole.fulfilledCount,
              totalCount: bestMatchingRole.totalCount,
              skills: bestMatchingRole.skills,
            }
          : null,
        university: team.university || team.event?.location || null,
        members: team.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.imageUrl || null,
          imageUrl: m.user.imageUrl || null,
          university: m.user.profile?.university || null,
          skills: m.user.profile?.skills || [],
          title: m.user.profile?.title || null,
        })),
        isLeader,
        isMember,
        hasApplied,
        maxCapacity,
        taxonomyScore,
        category,
        requirementBreakdown: breakdown,
        neededRequirement: team.requirements?.[0],
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      };
    });

    if (openSpotsOnly) {
      enrichedData = enrichedData.filter((t) => (t.maxCapacity ?? 4) > t.members.length);
    }

    if (tier && tier !== "ALL") {
      enrichedData = enrichedData.filter((t) => {
        if (tier === "HIGH") return (t.taxonomyScore ?? 0) >= 0.75;
        if (tier === "MODERATE") return (t.taxonomyScore ?? 0) >= 0.45 && (t.taxonomyScore ?? 0) < 0.75;
        if (tier === "EXPLORE") return (t.taxonomyScore ?? 0) < 0.45;
        return true;
      });
    }

    const response: PaginatedResponse<TeamDetailResponse> = {
      data: enrichedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    await CacheService.set(cacheKey, response, 60);
    return response;
  }

  /**
   * Retrieves single squad details with member profile information, roles, and match analysis.
   */
  static async getTeamById(
    teamId: string,
    caller: CallerContext
  ): Promise<TeamDetailResponse | null> {
    const { callerDbId, userTaxNodeIds, userUniversity } = caller;

    const cacheKey = `team:${teamId}:${callerDbId || "anon"}`;
    const cached = await CacheService.get<TeamDetailResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: true,
        roles: true,
        taxonomy: true,
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
        invites: true,
        applications: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    });

    if (!team) return null;

    let taxonomyScore: number | undefined;
    let category: any = undefined;
    let requirementBreakdown: any = undefined;
    let bestMatchingRole: any = undefined;

    if (userTaxNodeIds.length > 0) {
      try {
        const candidatePayload = {
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
        };

        const recs = await AIService.getRecommendations({
          userId: callerDbId || "anonymous",
          userTaxonomyNodeIds: userTaxNodeIds,
          userUniversity,
          candidateTeams: [candidatePayload],
          topK: 1,
        });

        if (recs.length > 0) {
          taxonomyScore = recs[0].taxonomyScore;
          category = recs[0].recommendationCategory;
          requirementBreakdown = recs[0].requirementBreakdown;
          bestMatchingRole = recs[0].bestMatchingRole;
        }
      } catch {
        // Continue
      }
    }

    const maxCapacity = calculateTeamMaxCapacity(team);
    const isLeader = callerDbId ? team.members.some((m) => m.userId === callerDbId && m.role === "Leader") : false;
    const isMember = callerDbId ? team.members.some((m) => m.userId === callerDbId) : false;
    const hasApplied = callerDbId
      ? team.applications.some((a) => a.userId === callerDbId && a.status === "PENDING")
      : false;

    const response: TeamDetailResponse = {
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
            university: team.event.location,
            orgId: team.event.orgId,
          }
        : undefined,
      orgId: team.orgId,
      requirements: team.requirements,
      roles: team.roles
        ? team.roles.map((r) => ({
            id: r.id,
            teamId: r.teamId,
            title: r.title,
            skills: r.skills,
            spots: r.spots,
            assignedToId: r.assignedToId,
          }))
        : [],
      bestMatchingRole: bestMatchingRole
        ? {
            roleId: bestMatchingRole.roleId,
            roleTitle: bestMatchingRole.roleTitle,
            score: bestMatchingRole.score,
            fulfilledCount: bestMatchingRole.fulfilledCount,
            totalCount: bestMatchingRole.totalCount,
            skills: bestMatchingRole.skills,
          }
        : null,
      university: team.university || team.event?.location || null,
      members: team.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.imageUrl || null,
        imageUrl: m.user.imageUrl || null,
        university: m.user.profile?.university || null,
        skills: m.user.profile?.skills || [],
        title: m.user.profile?.title || null,
      })),
      invites: isLeader
        ? team.invites.map((i) => ({
            id: i.id,
            teamId: i.teamId,
            senderId: i.senderId,
            email: i.email,
            roleId: i.roleId,
            roleTitle: i.roleTitle,
            roleSkills: i.roleSkills,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
          }))
        : undefined,
      applications: isLeader
        ? team.applications.map((a) => ({
            id: a.id,
            teamId: a.teamId,
            userId: a.userId,
            message: a.message,
            status: a.status,
            createdAt: a.createdAt.toISOString(),
            applicant: a.user
              ? {
                  id: a.user.id,
                  name: a.user.name,
                  email: a.user.email,
                  university: a.user.profile?.university || null,
                  skills: a.user.profile?.skills || [],
                  title: a.user.profile?.title || null,
                }
              : undefined,
          }))
        : undefined,
      isLeader,
      isMember,
      hasApplied,
      maxCapacity,
      taxonomyScore,
      category,
      requirementBreakdown,
      neededRequirement: team.requirements?.[0],
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };

    await CacheService.set(cacheKey, response, 120);
    return response;
  }

  /**
   * Creates a new squad, sets the creator as Leader, and claims optional role position.
   */
  static async createTeam(
    data: CreateTeamRequest,
    creatorUser: { id: string; email: string; name: string },
    authOrgId?: string | null
  ): Promise<{ team: any; requirementNodeIds?: string[] }> {
    const { eventId, name, roles, leaderRoleIndex, requirements, invites, roleInvites, orgId } = data;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new Error("Event not found.");
    }

    const creatorProfile = await prisma.profile.findUnique({
      where: { userId: creatorUser.id },
    });
    const defaultUniversity = creatorProfile?.university || event.location || undefined;

    let derivedRequirements = requirements || [];
    if ((!derivedRequirements || derivedRequirements.length === 0) && roles && roles.length > 0) {
      const skillsSet = new Set<string>();
      roles.forEach((r) => {
        if (r.skills && Array.isArray(r.skills)) {
          r.skills.forEach((s) => skillsSet.add(s.trim()));
        }
      });
      derivedRequirements = Array.from(skillsSet);
    }

    const team = await prisma.team.create({
      data: {
        eventId,
        name: name.trim(),
        requirements: derivedRequirements,
        university: defaultUniversity,
        orgId: orgId || event.orgId || authOrgId || null,
        members: {
          create: {
            userId: creatorUser.id,
            role: "Leader",
          },
        },
      },
      include: {
        event: true,
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    });

    let createdRoles: any[] = [];
    if (roles && Array.isArray(roles) && roles.length > 0) {
      for (let i = 0; i < roles.length; i++) {
        const r = roles[i];
        const isLeaderRole = leaderRoleIndex !== undefined && leaderRoleIndex === i;
        const initialSpots = r.spots !== undefined && r.spots !== null ? Math.max(0, r.spots) : 1;
        const finalSpots = isLeaderRole ? Math.max(0, initialSpots - 1) : initialSpots;

        const roleRecord = await prisma.teamRole.create({
          data: {
            teamId: team.id,
            title: r.title.trim(),
            skills: r.skills || [],
            spots: finalSpots,
            assignedToId: isLeaderRole ? creatorUser.id : null,
          },
        });
        createdRoles.push(roleRecord);
      }
    }

    // Process Initial Invites if provided
    const allInvites: Array<{ email: string; roleId?: string; roleTitle?: string; roleSkills?: string[] }> = [];
    if (roleInvites && Array.isArray(roleInvites)) {
      allInvites.push(...roleInvites);
    }
    if (invites && Array.isArray(invites)) {
      invites.forEach((e) => {
        if (typeof e === "string") allInvites.push({ email: e });
      });
    }

    for (const inv of allInvites) {
      const normalizedEmail = inv.email?.trim().toLowerCase();
      if (!normalizedEmail || normalizedEmail === creatorUser.email.toLowerCase()) continue;

      let matchedRoleId = inv.roleId;
      let matchedRoleTitle = inv.roleTitle;
      let matchedRoleSkills = inv.roleSkills;

      if (!matchedRoleId && matchedRoleTitle && createdRoles.length > 0) {
        const found = createdRoles.find((cr) => cr.title.toLowerCase() === matchedRoleTitle!.toLowerCase());
        if (found) {
          matchedRoleId = found.id;
          matchedRoleSkills = found.skills;
        }
      }

      const inviteRecord = await prisma.teamInvite.create({
        data: {
          teamId: team.id,
          senderId: creatorUser.id,
          email: normalizedEmail,
          roleId: matchedRoleId || null,
          roleTitle: matchedRoleTitle || null,
          roleSkills: matchedRoleSkills || [],
        },
      });

      const invitedUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (invitedUser) {
        await NotificationService.createNotification({
          userId: invitedUser.id,
          type: "TEAM_INVITE",
          title: "New Squad Invitation!",
          message: `${creatorUser.name} invited you to join "${team.name}"${matchedRoleTitle ? ` as ${matchedRoleTitle}` : ""}.`,
          link: `/team/${team.id}?inviteId=${inviteRecord.id}`,
          data: {
            teamId: team.id,
            teamName: team.name,
            inviteId: inviteRecord.id,
            senderName: creatorUser.name,
            roleTitle: matchedRoleTitle,
          },
        });
      }

      await queueTeamInvitationEmail({
        toEmail: normalizedEmail,
        teamName: team.name,
        teamId: team.id,
        inviteId: inviteRecord.id,
        senderName: creatorUser.name,
        eventTitle: event.title,
        roleTitle: matchedRoleTitle || undefined,
        roleSkills: matchedRoleSkills || undefined,
      });
    }

    // Taxonomy Resolution in background/inline
    let resolvedNodeIds: string[] = [];
    try {
      const taxRes = await AIService.resolveTeamRequirements(team.id, derivedRequirements);
      resolvedNodeIds = taxRes.requirement_node_ids;
    } catch {
      // Continue
    }

    // Invalidate caches
    await CacheService.invalidateTeam(team.id);
    await CacheService.invalidatePattern("teams:list:*");
    await CacheService.invalidatePattern("events:*");

    return {
      team: {
        ...team,
        roles: createdRoles,
      },
      requirementNodeIds: resolvedNodeIds,
    };
  }

  /**
   * Updates squad details, requirements, and roles.
   */
  static async updateTeam(
    teamId: string,
    data: UpdateTeamRequest,
    callerUserId: string
  ): Promise<any> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        roles: true,
      },
    });

    if (!team) throw new Error("Team not found.");

    const isLeader = team.members.some((m) => m.userId === callerUserId && m.role === "Leader");
    if (!isLeader) {
      throw new Error("Forbidden. Only the team leader can update team details.");
    }

    const { name, requirements, university } = data;
    const updateData: Prisma.TeamUpdateInput = {};

    if (name) updateData.name = name.trim();
    if (requirements) updateData.requirements = requirements;
    if (university !== undefined) updateData.university = university ? university.trim() : null;

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
      include: {
        event: true,
        roles: true,
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    });

    if (requirements) {
      try {
        await AIService.resolveTeamRequirements(teamId, requirements);
      } catch {
        // Continue
      }
    }

    await CacheService.invalidateTeam(teamId);
    return updated;
  }

  /**
   * Deletes squad.
   */
  static async deleteTeam(teamId: string, callerUserId: string): Promise<void> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) throw new Error("Team not found.");

    const isLeader = team.members.some((m) => m.userId === callerUserId && m.role === "Leader");
    if (!isLeader) {
      throw new Error("Forbidden. Only the team leader can delete this team.");
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    await CacheService.invalidateTeam(teamId);
  }

  /**
   * Member leaves squad; if leader leaves, leadership is transferred or team vacated.
   */
  static async leaveTeam(teamId: string, callerUserId: string): Promise<{ message: string }> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: true },
          orderBy: { joinedAt: "asc" },
        },
        roles: true,
      },
    });

    if (!team) throw new Error("Team not found.");

    const currentMember = team.members.find((m) => m.userId === callerUserId);
    if (!currentMember) {
      throw new Error("You are not a member of this squad.");
    }

    const isLeader = currentMember.role === "Leader";
    const userRole = team.roles.find((r) => r.assignedToId === callerUserId);

    await prisma.teamMember.delete({
      where: { id: currentMember.id },
    });

    if (userRole) {
      await prisma.teamRole.update({
        where: { id: userRole.id },
        data: {
          spots: (userRole.spots ?? 0) + 1,
          assignedToId: null,
        },
      });
    }

    const remainingMembers = team.members.filter((m) => m.userId !== callerUserId);

    if (isLeader && remainingMembers.length > 0) {
      const nextLeader = remainingMembers[0];
      await prisma.teamMember.update({
        where: { id: nextLeader.id },
        data: { role: "Leader" },
      });

      await NotificationService.createNotification({
        userId: nextLeader.userId,
        type: "TEAM_JOINED",
        title: "You are now Squad Leader!",
        message: `${currentMember.user.name} left "${team.name}". Leadership has been transferred to you.`,
        link: `/team/${team.id}`,
        data: { teamId: team.id, teamName: team.name },
      });
    } else if (!isLeader) {
      const leader = team.members.find((m) => m.role === "Leader");
      if (leader) {
        await NotificationService.createNotification({
          userId: leader.userId,
          type: "TEAM_MEMBER_LEFT",
          title: "Teammate Left Squad",
          message: `${currentMember.user.name} has left your squad "${team.name}".`,
          link: `/team/${team.id}`,
          data: { teamId: team.id, teamName: team.name },
        });
      }
    }

    await CacheService.invalidateTeam(teamId);
    return { message: "Successfully left the squad." };
  }

  /**
   * Leader removes a teammate from the squad.
   */
  static async removeTeamMember(teamId: string, memberUserId: string, callerUserId: string): Promise<{ message: string }> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { include: { user: true } },
        roles: true,
      },
    });

    if (!team) throw new Error("Team not found.");

    const callerIsLeader = team.members.some((m) => m.userId === callerUserId && m.role === "Leader");
    if (!callerIsLeader) {
      throw new Error("Forbidden. Only the team leader can remove members.");
    }

    if (memberUserId === callerUserId) {
      throw new Error("Cannot remove yourself as leader. Use leave team instead.");
    }

    const targetMember = team.members.find((m) => m.userId === memberUserId);
    if (!targetMember) {
      throw new Error("Target user is not a member of this squad.");
    }

    await prisma.teamMember.delete({
      where: { id: targetMember.id },
    });

    const targetRole = team.roles.find((r) => r.assignedToId === memberUserId);
    if (targetRole) {
      await prisma.teamRole.update({
        where: { id: targetRole.id },
        data: {
          spots: (targetRole.spots ?? 0) + 1,
          assignedToId: null,
        },
      });
    }

    await NotificationService.createNotification({
      userId: targetMember.userId,
      type: "TEAM_MEMBER_LEFT",
      title: "Removed from Squad",
      message: `You have been removed from squad "${team.name}".`,
      link: `/teams`,
      data: { teamId: team.id, teamName: team.name },
    });

    await CacheService.invalidateTeam(teamId);
    return { message: "Member removed from squad." };
  }
}

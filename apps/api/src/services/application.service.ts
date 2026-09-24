import { prisma } from "../lib/prisma.js";
import {
  MyApplicationResponse,
  IncomingApplicationResponse,
  IncomingApplicationSkill,
} from "@squadup/shared";
import { AIService } from "./ai.service.js";
import { CacheService } from "./cache.service.js";
import { NotificationService } from "./notification.service.js";
import { formatTimeAgo } from "../utils/date.utils.js";
import { calculateTeamMaxCapacity } from "./team.service.js";

export class ApplicationService {
  /**
   * Applies to join a squad.
   */
  static async applyToTeam(
    teamId: string,
    message: string | undefined,
    applicantUser: { id: string; name: string },
    roleTitle?: string,
    roleId?: string
  ): Promise<{ applicationId: string; status: string }> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        roles: true,
        applications: {
          where: { userId: applicantUser.id },
        },
      },
    });

    if (!team) throw new Error("Team not found.");

    const isMember = team.members.some((m) => m.userId === applicantUser.id);
    if (isMember) {
      throw new Error("You are already a member of this squad.");
    }

    const existingPending = team.applications.find((a) => a.status === "PENDING");
    if (existingPending) {
      throw new Error("You have already applied to this team and your application is pending.");
    }

    const application = await prisma.teamApplication.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId: applicantUser.id,
        },
      },
      create: {
        teamId,
        userId: applicantUser.id,
        message: message?.trim() || null,
        roleId: roleId || null,
        roleTitle: roleTitle?.trim() || null,
        status: "PENDING",
      },
      update: {
        message: message?.trim() || null,
        roleId: roleId || null,
        roleTitle: roleTitle?.trim() || null,
        status: "PENDING",
      },
      include: {
        team: {
          include: {
            members: {
              where: { role: "Leader" },
            },
          },
        },
      },
    });

    // Notify squad leader(s)
    const leader = application.team.members[0];
    if (leader) {
      await NotificationService.createNotification({
        userId: leader.userId,
        type: "APPLICATION_RECEIVED",
        title: "New Squad Application!",
        message: `${applicantUser.name} applied to join "${team.name}".`,
        link: `/team/${team.id}`,
        data: {
          teamId: team.id,
          teamName: team.name,
          applicationId: application.id,
          applicantName: applicantUser.name,
        },
      });
    }

    await CacheService.invalidateTeam(teamId);
    return { applicationId: application.id, status: application.status };
  }

  /**
   * Candidate withdraws application by team ID.
   */
  static async withdrawApplication(teamId: string, applicantUserId: string): Promise<void> {
    const application = await prisma.teamApplication.findFirst({
      where: {
        teamId,
        userId: applicantUserId,
        status: "PENDING",
      },
    });

    if (!application) {
      throw new Error("No pending application found to withdraw.");
    }

    await prisma.teamApplication.update({
      where: { id: application.id },
      data: { status: "WITHDRAWN" },
    });

    await CacheService.invalidateTeam(teamId);
  }

  /**
   * Candidate withdraws application by application ID.
   */
  static async withdrawApplicationById(applicationId: string, applicantUserId: string): Promise<void> {
    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    if (application.userId !== applicantUserId) {
      throw new Error("Forbidden. You can only withdraw your own applications.");
    }

    if (application.status !== "PENDING") {
      throw new Error(`Cannot withdraw an application that is already ${application.status}.`);
    }

    await prisma.teamApplication.update({
      where: { id: applicationId },
      data: { status: "WITHDRAWN" },
    });

    await CacheService.invalidateTeam(application.teamId);
  }

  /**
   * Candidate lists their own applications.
   */
  static async getMyApplications(applicantUserId: string): Promise<MyApplicationResponse[]> {
    const applications = await prisma.teamApplication.findMany({
      where: { userId: applicantUserId },
      include: {
        team: {
          include: { event: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return applications.map((app) => ({
      id: app.id,
      teamId: app.teamId,
      teamName: app.team.name,
      eventId: app.team.eventId,
      eventTitle: app.team.event?.title || "Event",
      university: app.team.university || app.team.event?.location || null,
      requirements: app.team.requirements || [],
      message: app.message,
      roleId: app.roleId || null,
      roleTitle: app.roleTitle || null,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    }));
  }

  /**
   * Squad leader lists incoming applications for their teams with scoring calculation.
   */
  static async getIncomingApplications(
    params: { teamId?: string; status?: string },
    callerUserId: string
  ): Promise<{ applications: IncomingApplicationResponse[]; total: number }> {
    const { teamId, status } = params;

    const leaderTeams = await prisma.team.findMany({
      where: {
        ...(teamId ? { id: teamId } : {}),
        members: {
          some: {
            userId: callerUserId,
            role: "Leader",
          },
        },
      },
      select: { id: true, name: true, requirements: true, university: true, eventId: true, event: true, roles: true },
    });

    const leaderTeamIds = leaderTeams.map((t) => t.id);
    if (leaderTeamIds.length === 0) {
      return { applications: [], total: 0 };
    }

    const whereClause: any = {
      teamId: { in: leaderTeamIds },
    };
    if (status) {
      whereClause.status = status;
    }

    const rawApplications = await prisma.teamApplication.findMany({
      where: whereClause,
      include: {
        team: {
          include: {
            event: true,
            roles: true,
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
      orderBy: { createdAt: "desc" },
    });

    const enrichedApplications: IncomingApplicationResponse[] = [];

    for (const app of rawApplications) {
      const candidateUser = app.user;
      const candidateProfile = candidateUser.profile;
      const candidateTaxNodeIds = candidateUser.taxonomy?.taxonomyNodeIds || [];
      const team = app.team;

      const explicitlyAppliedRole = app.roleTitle?.trim() || null;
      let matchScore = 0.0;
      let appliedRole = explicitlyAppliedRole || "General Applicant";
      const candidateSkills: IncomingApplicationSkill[] = [];

      // Find if candidate applied for a specific role defined in the squad
      let targetRole = null;
      if (app.roleId) {
        targetRole = team?.roles?.find((r) => r.id === app.roleId) || null;
      }
      if (!targetRole && explicitlyAppliedRole) {
        targetRole =
          team?.roles?.find(
            (r) => r.title.toLowerCase().trim() === explicitlyAppliedRole.toLowerCase().trim()
          ) || null;
      }

      if (targetRole && !explicitlyAppliedRole) {
        appliedRole = targetRole.title;
      }

      if (candidateTaxNodeIds.length > 0 && team) {
        try {
          const scopedRoles = targetRole
            ? [
                {
                  id: targetRole.id,
                  title: targetRole.title,
                  skills: targetRole.skills,
                  spots: 1,
                  assignedToId: null,
                },
              ]
            : team.roles
            ? team.roles.map((r) => ({
                id: r.id,
                title: r.title,
                skills: r.skills,
                spots: r.spots,
                assignedToId: r.assignedToId,
              }))
            : undefined;

          const teamPayload = {
            team_id: team.id,
            team_name: team.name,
            university: team.university || team.event?.location || null,
            description: team.event?.description || null,
            requirements: targetRole ? targetRole.skills : team.requirements || [],
            requirement_node_ids: targetRole ? [] : team.taxonomy?.requirementNodeIds || [],
            roles: scopedRoles,
            is_global: team.event?.isGlobal ?? false,
            is_eligible: true,
          };

          const recs = await AIService.getRecommendations({
            userId: candidateUser.id,
            userTaxonomyNodeIds: candidateTaxNodeIds,
            userUniversity: candidateProfile?.university || null,
            candidateTeams: [teamPayload],
            topK: 1,
          });

          if (recs && recs.length > 0) {
            const firstRec = recs[0];
            matchScore = firstRec.taxonomyScore ?? 0.0;
            if (!explicitlyAppliedRole && firstRec.bestMatchingRole?.roleTitle) {
              appliedRole = firstRec.bestMatchingRole.roleTitle;
            }

            if (firstRec.requirementBreakdown) {
              firstRec.requirementBreakdown.forEach((rb) => {
                if (rb.bestUserSkillName) {
                  const isExact = rb.score >= 0.95;
                  const isPartial = rb.score >= 0.40 && rb.score < 0.95;
                  let cleanExplanation = `Exact match with '${rb.bestUserSkillName}' from candidate profile.`;
                  if (isPartial) {
                    cleanExplanation = `Relevant experience matched with '${rb.bestUserSkillName}' for '${rb.requirementName}'.`;
                  } else if (!isExact && rb.score < 0.40) {
                    cleanExplanation = `Related background in '${rb.bestUserSkillName}'.`;
                  }

                  candidateSkills.push({
                    name: rb.requirementName || rb.bestUserSkillName,
                    provenance: cleanExplanation,
                    score: rb.score,
                  });
                }
              });
            }
          }
        } catch {
          // Fallback scoring
        }
      }

      if (candidateSkills.length === 0 && candidateTaxNodeIds.length === 0 && candidateProfile?.skills) {
        candidateProfile.skills.forEach((skillName) => {
          candidateSkills.push({
            name: skillName,
            provenance: "Profile Resume",
            score: 0.8,
          });
        });
      }

      const teamUni = team.university || team.event?.location || "";
      const candidateUni = candidateProfile?.university || "";
      const isCampusMatch = Boolean(
        teamUni && candidateUni && teamUni.toLowerCase().trim() === candidateUni.toLowerCase().trim()
      );

      enrichedApplications.push({
        id: app.id,
        candidateId: candidateUser.id,
        name: candidateUser.name,
        avatarUrl: candidateUser.imageUrl || null,
        university: candidateProfile?.university || "Student",
        year: (candidateProfile?.education as any)?.[0]?.year || "Student",
        appliedRole: explicitlyAppliedRole || appliedRole || candidateProfile?.title || "Applicant",
        matchScore: Math.round(matchScore * 100) / 100,
        isCampusMatch,
        appliedTimeAgo: formatTimeAgo(app.createdAt),
        coverNote: app.message || "I would love to join your squad and collaborate for this hackathon!",
        skills: candidateSkills,
        status: app.status as any,
        teamId: team.id,
        teamName: team.name,
        createdAt: app.createdAt.toISOString(),
      });
    }

    return {
      applications: enrichedApplications,
      total: enrichedApplications.length,
    };
  }

  /**
   * Retrieves single application dossier.
   */
  static async getApplicationById(applicationId: string, callerUserId: string): Promise<any> {
    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
      include: {
        team: {
          include: {
            members: true,
            event: true,
            roles: true,
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

    if (!application) throw new Error("Application not found.");

    const isApplicant = application.userId === callerUserId;
    const isLeader = application.team.members.some((m) => m.userId === callerUserId && m.role === "Leader");

    if (!isApplicant && !isLeader) {
      throw new Error("Forbidden. You do not have permission to view this application.");
    }

    return application;
  }

  /**
   * Retrieves all applications for a specific squad.
   */
  static async getTeamApplications(teamId: string, callerUserId: string): Promise<any[]> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        applications: {
          include: {
            user: {
              include: { profile: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!team) throw new Error("Team not found.");

    const isLeader = team.members.some((m) => m.userId === callerUserId && m.role === "Leader");
    if (!isLeader) {
      throw new Error("Forbidden. Only the team leader can view team applications.");
    }

    return team.applications;
  }

  /**
   * Leader accepts a candidate application.
   */
  static async acceptApplication(
    applicationId: string,
    reviewerUserId: string
  ): Promise<{ message: string; teamId: string }> {
    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
      include: {
        team: {
          include: {
            members: { include: { user: true } },
            roles: true,
          },
        },
        user: { include: { profile: true } },
      },
    });

    if (!application) throw new Error("Application not found.");

    const team = application.team;
    const isLeader = team.members.some((m) => m.userId === reviewerUserId && m.role === "Leader");
    if (!isLeader) {
      throw new Error("Forbidden. Only the team leader can accept applications.");
    }

    if (application.status !== "PENDING") {
      throw new Error(`Cannot accept an application that is already ${application.status}.`);
    }

    const alreadyMember = team.members.some((m) => m.userId === application.userId);
    if (alreadyMember) {
      await prisma.teamApplication.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED" },
      });
      return { message: "Candidate is already a team member.", teamId: team.id };
    }

    const maxCap = calculateTeamMaxCapacity(team);
    if (team.members.length >= maxCap) {
      throw new Error("Team is already at maximum capacity.");
    }

    // Determine Role assignment
    const appRoleId = (application as any).roleId;
    const appRoleTitle = (application as any).roleTitle;

    let assignedRoleTitle = appRoleTitle || application.user.profile?.title || "Member";
    let candidateAssignedRole = null;

    if (appRoleId) {
      candidateAssignedRole = team.roles.find(
        (r) => r.id === appRoleId && (!r.assignedToId || (r.spots ?? 0) > 0)
      );
    }
    if (!candidateAssignedRole && appRoleTitle) {
      candidateAssignedRole = team.roles.find(
        (r) => r.title.toLowerCase().trim() === appRoleTitle.toLowerCase().trim() && (!r.assignedToId || (r.spots ?? 0) > 0)
      );
    }
    if (!candidateAssignedRole) {
      candidateAssignedRole = team.roles.find((r) => !r.assignedToId && (r.spots ?? 0) > 0);
    }

    if (candidateAssignedRole) {
      assignedRoleTitle = candidateAssignedRole.title;
      await prisma.teamRole.update({
        where: { id: candidateAssignedRole.id },
        data: {
          spots: Math.max(0, (candidateAssignedRole.spots ?? 1) - 1),
          assignedToId: candidateAssignedRole.assignedToId ? candidateAssignedRole.assignedToId : application.userId,
        },
      });
    }

    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: application.userId,
          role: assignedRoleTitle,
        },
      }),
      prisma.teamApplication.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED" },
      }),
    ]);

    await NotificationService.createNotification({
      userId: application.userId,
      type: "APPLICATION_ACCEPTED",
      title: "Application Accepted! 🎉",
      message: `You have been accepted into squad "${team.name}" as ${assignedRoleTitle}!`,
      link: `/team/${team.id}`,
      data: {
        teamId: team.id,
        teamName: team.name,
        roleTitle: assignedRoleTitle,
      },
    });

    await CacheService.invalidateTeam(team.id);
    await CacheService.invalidateProfile(application.userId);
    await CacheService.invalidateProfile(reviewerUserId);
    return { message: "Application accepted and member added to squad.", teamId: team.id };
  }

  /**
   * Leader rejects a candidate application.
   */
  static async rejectApplication(
    applicationId: string,
    reviewerUserId: string
  ): Promise<{ message: string }> {
    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
      include: {
        team: { include: { members: true } },
        user: true,
      },
    });

    if (!application) throw new Error("Application not found.");

    const isLeader = application.team.members.some((m) => m.userId === reviewerUserId && m.role === "Leader");
    if (!isLeader) {
      throw new Error("Forbidden. Only the team leader can reject applications.");
    }

    if (application.status !== "PENDING") {
      throw new Error(`Cannot reject an application that is already ${application.status}.`);
    }

    await prisma.teamApplication.update({
      where: { id: applicationId },
      data: { status: "REJECTED" },
    });

    await NotificationService.createNotification({
      userId: application.userId,
      type: "APPLICATION_REJECTED",
      title: "Squad Application Update",
      message: `Your application to join "${application.team.name}" was not selected.`,
      link: `/teams`,
      data: {
        teamId: application.team.id,
        teamName: application.team.name,
      },
    });

    await CacheService.invalidateTeam(application.teamId);
    return { message: "Application rejected." };
  }
}

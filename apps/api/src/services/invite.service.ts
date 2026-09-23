import { prisma } from "../lib/prisma.js";
import {
  SendTeamInvitesRequest,
  SendTeamInvitesResponse,
  TeamInviteResponse,
} from "@squadup/shared";
import { CacheService } from "./cache.service.js";
import { NotificationService } from "./notification.service.js";
import { queueTeamInvitationEmail } from "../queues/email.queue.js";
import { calculateTeamMaxCapacity } from "./team.service.js";

export class InviteService {
  /**
   * Sends role-assigned invitations to teammates via email and notifications.
   */
  static async sendTeamInvites(
    teamId: string,
    data: SendTeamInvitesRequest,
    senderUser: { id: string; name: string; email: string }
  ): Promise<SendTeamInvitesResponse> {
    const { invites, roleId: topRoleId, roleTitle: topRoleTitle, roleSkills: topRoleSkills } = data;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
        invites: true,
        roles: true,
        event: { select: { id: true, title: true, isGlobal: true, orgId: true, location: true } },
      },
    });

    if (!team) throw new Error("Team not found.");

    const isLeader = team.members.some((m) => m.userId === senderUser.id && m.role === "Leader");
    if (!isLeader) {
      throw new Error("Forbidden. Only the team leader can send invites.");
    }

    const parsedInvites: Array<{
      email: string;
      roleId?: string | null;
      roleTitle?: string | null;
      roleSkills: string[];
    }> = [];

    const existingInviteEmails = new Set(team.invites.map((i) => i.email.toLowerCase()));

    for (const item of invites) {
      let email = "";
      let itemRoleId = topRoleId || null;
      let itemRoleTitle = topRoleTitle || null;
      let itemRoleSkills: string[] = topRoleSkills || [];

      if (typeof item === "string") {
        email = item.trim().toLowerCase();
      } else if (item && typeof item === "object") {
        email = (item.email || "").trim().toLowerCase();
        if (item.roleId) itemRoleId = item.roleId;
        if (item.roleTitle) itemRoleTitle = item.roleTitle;
        if (item.roleSkills) itemRoleSkills = item.roleSkills;
      }

      if (!email) continue;
      if (existingInviteEmails.has(email)) continue;

      if (itemRoleId && team.roles) {
        const matchedRole = team.roles.find((r) => r.id === itemRoleId);
        if (matchedRole) {
          itemRoleTitle = matchedRole.title;
          itemRoleSkills = matchedRole.skills;
        }
      }

      const isAlreadyMember = team.members.some(
        (m) => m.user.email.toLowerCase() === email
      );
      if (isAlreadyMember) continue;

      parsedInvites.push({
        email,
        roleId: itemRoleId,
        roleTitle: itemRoleTitle,
        roleSkills: itemRoleSkills,
      });
    }

    const successfulInvites: string[] = [];
    const failedInvites: Array<{ email: string; reason: string }> = [];

    for (const inv of parsedInvites) {
      try {
        const inviteRecord = await prisma.teamInvite.create({
          data: {
            teamId,
            senderId: senderUser.id,
            email: inv.email,
            roleId: inv.roleId || null,
            roleTitle: inv.roleTitle || null,
            roleSkills: inv.roleSkills,
          },
        });

        successfulInvites.push(inv.email);

        const invitedUser = await prisma.user.findUnique({
          where: { email: inv.email },
        });

        if (invitedUser) {
          await NotificationService.createNotification({
            userId: invitedUser.id,
            type: "TEAM_INVITE",
            title: "New Squad Invitation!",
            message: `${senderUser.name} invited you to join squad "${team.name}"${inv.roleTitle ? ` for the ${inv.roleTitle} role` : ""}!`,
            link: `/team/${team.id}?inviteId=${inviteRecord.id}`,
            data: {
              teamId: team.id,
              teamName: team.name,
              inviteId: inviteRecord.id,
              senderName: senderUser.name,
              roleId: inv.roleId,
              roleTitle: inv.roleTitle,
              roleSkills: inv.roleSkills,
              eventId: team.eventId,
              eventTitle: team.event?.title,
            },
          });
        }

        await queueTeamInvitationEmail({
          toEmail: inv.email,
          teamName: team.name,
          teamId: team.id,
          inviteId: inviteRecord.id,
          senderName: senderUser.name,
          eventTitle: team.event?.title || "Upcoming Event",
          roleTitle: inv.roleTitle || undefined,
          roleSkills: inv.roleSkills && inv.roleSkills.length > 0 ? inv.roleSkills : undefined,
        });
      } catch (err: any) {
        failedInvites.push({
          email: inv.email,
          reason: err.message || "Failed to create invite record.",
        });
      }
    }

    await CacheService.invalidateTeam(teamId);

    return {
      message: `Processed ${successfulInvites.length} invite(s).`,
      successful: successfulInvites,
      failed: failedInvites,
      invitedEmails: successfulInvites,
    };
  }

  /**
   * Retrieves pending invitations for the authenticated user.
   */
  static async getMyInvites(userEmail: string, userId?: string): Promise<TeamInviteResponse[]> {
    const invites = await prisma.teamInvite.findMany({
      where: {
        email: userEmail.toLowerCase(),
        status: "PENDING",
      },
      include: {
        team: {
          include: {
            event: true,
            members: true,
            roles: true,
          },
        },
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return invites.map((inv) => ({
      id: inv.id,
      teamId: inv.teamId,
      teamName: inv.team.name,
      eventId: inv.team.eventId,
      eventTitle: inv.team.event?.title || "Event",
      isGlobal: inv.team.event?.isGlobal ?? false,
      senderId: inv.senderId,
      senderName: inv.sender.name,
      email: inv.email,
      roleId: inv.roleId,
      roleTitle: inv.roleTitle,
      roleSkills: inv.roleSkills,
      membersCount: inv.team.members.length,
      requirements: inv.team.requirements,
      status: inv.status,
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  /**
   * Accepts a role-based team invitation.
   */
  static async acceptInvite(
    inviteId: string,
    callerUser: { id: string; name: string; email: string }
  ): Promise<{ message: string; teamId: string }> {
    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: {
        team: {
          include: {
            members: true,
            roles: true,
          },
        },
      },
    });

    if (!invite) throw new Error("Invite not found.");

    if (invite.email.toLowerCase() !== callerUser.email.toLowerCase()) {
      throw new Error("This invite was sent to a different email address.");
    }

    if (invite.status !== "PENDING") {
      throw new Error(`This invite is already ${invite.status.toLowerCase()}.`);
    }

    const team = invite.team;
    const isAlreadyMember = team.members.some((m) => m.userId === callerUser.id);
    if (isAlreadyMember) {
      await prisma.teamInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" },
      });
      return { message: "You are already a member of this team.", teamId: team.id };
    }

    const maxCap = calculateTeamMaxCapacity(team);
    if (team.members.length >= maxCap) {
      throw new Error("Team has reached its maximum capacity.");
    }

    let assignedRoleTitle = invite.roleTitle || "Member";
    if (invite.roleId && team.roles) {
      const targetRole = team.roles.find((r) => r.id === invite.roleId);
      if (targetRole) {
        assignedRoleTitle = targetRole.title;
        await prisma.teamRole.update({
          where: { id: targetRole.id },
          data: {
            spots: Math.max(0, (targetRole.spots ?? 1) - 1),
            assignedToId: callerUser.id,
          },
        });
      }
    }

    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: callerUser.id,
          role: assignedRoleTitle,
        },
      }),
      prisma.teamInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" },
      }),
    ]);

    const leader = team.members.find((m) => m.role === "Leader");
    if (leader) {
      await NotificationService.createNotification({
        userId: leader.userId,
        type: "TEAM_JOINED",
        title: "Teammate Joined Squad!",
        message: `${callerUser.name} accepted your invite and joined "${team.name}" as ${assignedRoleTitle}!`,
        link: `/team/${team.id}`,
        data: {
          teamId: team.id,
          teamName: team.name,
          roleTitle: assignedRoleTitle,
        },
      });
    }

    await CacheService.invalidateTeam(team.id);
    await CacheService.invalidateProfile(callerUser.id);
    return { message: "Successfully joined the squad!", teamId: team.id };
  }

  /**
   * Declines a team invitation.
   */
  static async declineInvite(
    inviteId: string,
    callerUserEmail: string
  ): Promise<{ message: string }> {
    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) throw new Error("Invite not found.");

    if (invite.email.toLowerCase() !== callerUserEmail.toLowerCase()) {
      throw new Error("This invite was sent to a different email address.");
    }

    if (invite.status !== "PENDING") {
      throw new Error(`This invite is already ${invite.status.toLowerCase()}.`);
    }

    await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: "DECLINED" },
    });

    await CacheService.invalidateTeam(invite.teamId);
    return { message: "Invite declined." };
  }

  /**
   * Leader cancels an invitation.
   */
  static async cancelInvite(
    teamId: string,
    inviteId: string,
    callerUserId: string
  ): Promise<{ message: string }> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) throw new Error("Team not found.");

    const isLeader = team.members.some((m) => m.userId === callerUserId && m.role === "Leader");
    if (!isLeader) {
      throw new Error("Forbidden. Only the team leader can cancel invites.");
    }

    const invite = await prisma.teamInvite.findFirst({
      where: { id: inviteId, teamId },
    });

    if (!invite) throw new Error("Invite not found.");

    await prisma.teamInvite.delete({
      where: { id: inviteId },
    });

    await CacheService.invalidateTeam(teamId);
    return { message: "Invite cancelled successfully." };
  }
}

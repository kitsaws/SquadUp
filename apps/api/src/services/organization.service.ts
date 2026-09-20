import { prisma } from "../lib/prisma.js";
import {
  CreateOrganizerRequest,
  UpdateOrganizerRequest,
  CreateOrganizationRequest,
  OrganizerResponse,
  OrganizationResponse,
} from "@squadup/shared";
import { linkUserToOrganization } from "../utils/auth.utils.js";
import { CacheService } from "./cache.service.js";

export class OrganizationService {
  // ==========================================
  // University Organizations
  // ==========================================

  static async createOrganization(data: CreateOrganizationRequest) {
    const { clerkOrgId, name, slug, domain, logoUrl, location } = data;
    return await prisma.organization.create({
      data: {
        clerkOrgId,
        name,
        slug: slug.toLowerCase().trim(),
        domain,
        logoUrl,
        location,
      },
    });
  }

  static async listOrganizations(): Promise<OrganizationResponse[]> {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { subOrganizers: true, events: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return orgs.map((o) => ({
      id: o.id,
      clerkOrgId: o.clerkOrgId,
      name: o.name,
      slug: o.slug,
      domain: o.domain,
      logoUrl: o.logoUrl,
      location: o.location,
      subOrganizersCount: o._count.subOrganizers,
      eventsCount: o._count.events,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
  }

  static async getOrganizationByClerkId(clerkOrgId: string) {
    return await prisma.organization.findUnique({
      where: { clerkOrgId },
      include: {
        subOrganizers: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
          },
        },
        _count: {
          select: { events: true },
        },
      },
    });
  }

  static async selectUniversity(
    user: { id: string; clerkId: string },
    params: { clerkOrgId?: string; organizationId?: string }
  ) {
    const { clerkOrgId, organizationId } = params;
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          ...(clerkOrgId ? [{ clerkOrgId }] : []),
          ...(organizationId ? [{ id: organizationId }] : []),
        ],
      },
    });

    if (!org) {
      throw new Error("University organization not found.");
    }

    const { membership, profile } = await linkUserToOrganization(
      user.id,
      user.clerkId,
      org
    );

    // Invalidate cached profile on university selection
    try {
      await CacheService.del(`profile:${user.id}`);
    } catch {
      // ignore
    }

    return {
      organization: org,
      membership,
      profile,
    };
  }

  // ==========================================
  // University Sub-Organizers (Clubs/Societies)
  // ==========================================

  static async createOrganizer(
    ownerId: string,
    data: CreateOrganizerRequest,
    callerOrgId?: string | null
  ) {
    const { name, slug, description, logoUrl, website, email, orgId: bodyOrgId } = data;
    const targetOrgId = bodyOrgId || callerOrgId || null;

    let linkedOrganizationId: string | null = null;
    if (targetOrgId) {
      const parentOrg = await prisma.organization.findUnique({
        where: { clerkOrgId: targetOrgId },
      });
      if (parentOrg) {
        linkedOrganizationId = parentOrg.id;
      }
    }

    return await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organizer.create({
        data: {
          name: name.trim(),
          slug: slug.toLowerCase().trim(),
          description: description || null,
          logoUrl: logoUrl || null,
          website: website || null,
          email: email || null,
          orgId: targetOrgId,
          organizationId: linkedOrganizationId,
          ownerId,
        },
      });

      // Automatically add creator as ADMIN
      await tx.organizerMember.create({
        data: {
          organizerId: newOrg.id,
          userId: ownerId,
          role: "ADMIN",
        },
      });

      return newOrg;
    });
  }

  static async listOrganizers(params: {
    orgId?: string;
    search?: string;
  }): Promise<OrganizerResponse[]> {
    const { orgId, search } = params;
    const where: any = {};
    if (orgId) {
      where.orgId = orgId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const organizers = await prisma.organizer.findMany({
      where,
      include: {
        _count: {
          select: { members: true, events: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return organizers.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      logoUrl: org.logoUrl,
      website: org.website,
      email: org.email,
      orgId: org.orgId,
      organizationId: org.organizationId,
      ownerId: org.ownerId,
      membersCount: org._count.members,
      eventsCount: org._count.events,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    }));
  }

  static async getOrganizerById(idOrSlug: string) {
    const organizer = await prisma.organizer.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        events: {
          select: {
            id: true,
            title: true,
            date: true,
            isGlobal: true,
            location: true,
            _count: { select: { teams: true } },
          },
          orderBy: { date: "asc" },
        },
        _count: {
          select: { events: true, members: true },
        },
      },
    });

    if (!organizer) {
      return null;
    }

    return {
      id: organizer.id,
      name: organizer.name,
      slug: organizer.slug,
      description: organizer.description,
      logoUrl: organizer.logoUrl,
      website: organizer.website,
      email: organizer.email,
      orgId: organizer.orgId,
      organizationId: organizer.organizationId,
      ownerId: organizer.ownerId,
      membersCount: organizer._count.members,
      eventsCount: organizer._count.events,
      members: organizer.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      })),
      events: organizer.events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date.toISOString(),
        isGlobal: e.isGlobal,
        location: e.location,
        teamsCount: e._count.teams,
      })),
      createdAt: organizer.createdAt.toISOString(),
      updatedAt: organizer.updatedAt.toISOString(),
    };
  }

  static async updateOrganizer(
    organizerId: string,
    callerDbId: string,
    data: UpdateOrganizerRequest
  ) {
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      include: { members: true },
    });

    if (!organizer) {
      throw new Error("Organizer not found.");
    }

    const isAdmin =
      organizer.ownerId === callerDbId ||
      organizer.members.some((m) => m.userId === callerDbId && m.role === "ADMIN");

    if (!isAdmin) {
      throw new Error("Forbidden. Only an admin of this organizer can make edits.");
    }

    const { name, description, logoUrl, website, email } = data;

    return await prisma.organizer.update({
      where: { id: organizerId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(website !== undefined && { website }),
        ...(email !== undefined && { email }),
      },
    });
  }

  static async addOrganizerMember(
    organizerId: string,
    callerDbId: string,
    email: string,
    role?: string
  ) {
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      include: { members: true },
    });

    if (!organizer) {
      throw new Error("Organizer not found.");
    }

    const isCallerAdmin =
      organizer.ownerId === callerDbId ||
      organizer.members.some((m) => m.userId === callerDbId && m.role === "ADMIN");

    if (!isCallerAdmin) {
      throw new Error("Forbidden. Only admins can add new members to an organizer.");
    }

    const targetUser = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });

    if (!targetUser) {
      throw new Error(`User with email "${email}" has not registered on SquadUp yet.`);
    }

    const newMember = await prisma.organizerMember.upsert({
      where: {
        organizerId_userId: {
          organizerId,
          userId: targetUser.id,
        },
      },
      update: {
        role: role || "ADMIN",
      },
      create: {
        organizerId,
        userId: targetUser.id,
        role: role || "ADMIN",
      },
    });

    return {
      targetUserName: targetUser.name,
      member: newMember,
    };
  }

  static async removeOrganizerMember(
    organizerId: string,
    callerDbId: string,
    targetUserId: string
  ) {
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      include: { members: true },
    });

    if (!organizer) {
      throw new Error("Organizer not found.");
    }

    const isCallerAdmin =
      organizer.ownerId === callerDbId ||
      organizer.members.some((m) => m.userId === callerDbId && m.role === "ADMIN");

    if (!isCallerAdmin) {
      throw new Error("Forbidden. Only admins can remove members.");
    }

    if (targetUserId === organizer.ownerId) {
      throw new Error("Cannot remove the owner of the organizer.");
    }

    await prisma.organizerMember.delete({
      where: {
        organizerId_userId: {
          organizerId,
          userId: targetUserId,
        },
      },
    });
  }
}

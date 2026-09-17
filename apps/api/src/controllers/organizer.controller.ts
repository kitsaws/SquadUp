import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient } from "@prisma/client";
import {
  CreateOrganizerRequest,
  UpdateOrganizerRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizerResponse,
  OrganizationResponse,
} from "@squadup/shared";
import { getOrCreateUserByClerkId, linkUserToOrganization } from "../utils/auth.utils.js";

const prisma = new PrismaClient();

// ==========================================
// 1. University Organizations
// ==========================================

export const createOrganization = async (
  req: Request<{}, {}, CreateOrganizationRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { clerkOrgId, name, slug, domain, logoUrl, location } = req.body;
  if (!clerkOrgId || !name || !slug) {
    return res.status(400).json({ error: "clerkOrgId, name, and slug are required." });
  }

  try {
    const org = await prisma.organization.create({
      data: {
        clerkOrgId,
        name,
        slug: slug.toLowerCase().trim(),
        domain,
        logoUrl,
        location,
      },
    });

    return res.status(201).json(org);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Organization with this clerkOrgId or slug already exists." });
    }
    console.error("[Organizer API] Error creating organization:", error);
    return res.status(500).json({ error: "Failed to create organization." });
  }
};

export const listOrganizations = async (req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { subOrganizers: true, events: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const response: OrganizationResponse[] = orgs.map((o) => ({
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

    return res.json(response);
  } catch (error) {
    console.error("[Organizer API] Error listing organizations:", error);
    return res.status(500).json({ error: "Failed to list organizations." });
  }
};

export const getOrganizationByClerkId = async (req: Request<{ clerkOrgId: string }>, res: Response) => {
  const { clerkOrgId } = req.params;

  try {
    const org = await prisma.organization.findUnique({
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

    if (!org) {
      return res.status(404).json({ error: "Organization not found." });
    }

    return res.json(org);
  } catch (error) {
    console.error("[Organizer API] Error fetching organization:", error);
    return res.status(500).json({ error: "Failed to fetch organization." });
  }
};

export const selectUniversity = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { clerkOrgId, organizationId } = req.body;
  if (!clerkOrgId && !organizationId) {
    return res.status(400).json({ error: "clerkOrgId or organizationId is required." });
  }

  try {
    const userInDb = await getOrCreateUserByClerkId(userId);

    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          ...(clerkOrgId ? [{ clerkOrgId }] : []),
          ...(organizationId ? [{ id: organizationId }] : []),
        ],
      },
    });

    if (!org) {
      return res.status(404).json({ error: "University organization not found." });
    }

    const { membership, profile } = await linkUserToOrganization(
      userInDb.id,
      userInDb.clerkId,
      org
    );

    // Invalidate cached profile on university selection
    try {
      const { CacheService } = await import("../services/cache.service.js");
      await CacheService.del(`profile:${userInDb.id}`);
    } catch {
      // ignore
    }

    return res.json({
      success: true,
      message: `Successfully affiliated with ${org.name}.`,
      organization: org,
      membership,
      profile,
    });
  } catch (error) {
    console.error("[Organizer API] Error selecting university:", error);
    return res.status(500).json({ error: "Failed to select university organization." });
  }
};

// ==========================================
// 2. University Sub-Organizers (Clubs/Societies)
// ==========================================

export const createOrganizer = async (
  req: Request<{}, {}, CreateOrganizerRequest>,
  res: Response
) => {
  const { userId, orgId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, slug, description, logoUrl, website, email, orgId: bodyOrgId } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: "name and slug are required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  const targetOrgId = bodyOrgId || orgId || null;

  try {
    // If targetOrgId provided, check if university record exists to link
    let linkedOrganizationId: string | null = null;
    if (targetOrgId) {
      const parentOrg = await prisma.organization.findUnique({
        where: { clerkOrgId: targetOrgId },
      });
      if (parentOrg) {
        linkedOrganizationId = parentOrg.id;
      }
    }

    const organizer = await prisma.$transaction(async (tx) => {
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
          ownerId: userInDb.id,
        },
      });

      // Automatically add creator as ADMIN
      await tx.organizerMember.create({
        data: {
          organizerId: newOrg.id,
          userId: userInDb.id,
          role: "ADMIN",
        },
      });

      return newOrg;
    });

    return res.status(201).json({
      message: "Organizer profile created successfully.",
      organizer,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "An organizer with this slug already exists." });
    }
    console.error("[Organizer API] Error creating organizer:", error);
    return res.status(500).json({ error: "Failed to create organizer profile." });
  }
};

export const listOrganizers = async (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string)?.trim() || undefined;
  const search = (req.query.search as string)?.trim() || undefined;

  try {
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

    const response: OrganizerResponse[] = organizers.map((org) => ({
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

    return res.json(response);
  } catch (error) {
    console.error("[Organizer API] Error listing organizers:", error);
    return res.status(500).json({ error: "Failed to list organizers." });
  }
};

export const getOrganizerById = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    const organizer = await prisma.organizer.findFirst({
      where: {
        OR: [{ id }, { slug: id.toLowerCase() }],
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
      return res.status(404).json({ error: "Organizer not found." });
    }

    return res.json({
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
    });
  } catch (error) {
    console.error("[Organizer API] Error fetching organizer:", error);
    return res.status(500).json({ error: "Failed to fetch organizer." });
  }
};

export const updateOrganizer = async (
  req: Request<{ id: string }, {}, UpdateOrganizerRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const { name, description, logoUrl, website, email } = req.body;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const organizer = await prisma.organizer.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!organizer) {
      return res.status(404).json({ error: "Organizer not found." });
    }

    const isAdmin =
      organizer.ownerId === userInDb.id ||
      organizer.members.some((m) => m.userId === userInDb.id && m.role === "ADMIN");

    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden. Only an admin of this organizer can make edits." });
    }

    const updated = await prisma.organizer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(website !== undefined && { website }),
        ...(email !== undefined && { email }),
      },
    });

    return res.json({ message: "Organizer updated successfully.", organizer: updated });
  } catch (error) {
    console.error("[Organizer API] Error updating organizer:", error);
    return res.status(500).json({ error: "Failed to update organizer." });
  }
};

export const addOrganizerMember = async (
  req: Request<{ id: string }, {}, { email: string; role?: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email is required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const organizer = await prisma.organizer.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!organizer) {
      return res.status(404).json({ error: "Organizer not found." });
    }

    const isCallerAdmin =
      organizer.ownerId === userInDb.id ||
      organizer.members.some((m) => m.userId === userInDb.id && m.role === "ADMIN");

    if (!isCallerAdmin) {
      return res.status(403).json({ error: "Forbidden. Only admins can add new members to an organizer." });
    }

    const targetUser = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });

    if (!targetUser) {
      return res.status(404).json({ error: `User with email "${email}" has not registered on SquadUp yet.` });
    }

    const newMember = await prisma.organizerMember.upsert({
      where: {
        organizerId_userId: {
          organizerId: id,
          userId: targetUser.id,
        },
      },
      update: {
        role: role || "ADMIN",
      },
      create: {
        organizerId: id,
        userId: targetUser.id,
        role: role || "ADMIN",
      },
    });

    return res.status(201).json({
      message: `Added ${targetUser.name} as ${newMember.role}.`,
      member: newMember,
    });
  } catch (error) {
    console.error("[Organizer API] Error adding member:", error);
    return res.status(500).json({ error: "Failed to add member." });
  }
};

export const removeOrganizerMember = async (
  req: Request<{ id: string; userId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, userId: targetUserId } = req.params;

  let callerInDb;
  try {
    callerInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const organizer = await prisma.organizer.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!organizer) {
      return res.status(404).json({ error: "Organizer not found." });
    }

    const isCallerAdmin =
      organizer.ownerId === callerInDb.id ||
      organizer.members.some((m) => m.userId === callerInDb.id && m.role === "ADMIN");

    if (!isCallerAdmin) {
      return res.status(403).json({ error: "Forbidden. Only admins can remove members." });
    }

    if (targetUserId === organizer.ownerId) {
      return res.status(400).json({ error: "Cannot remove the owner of the organizer." });
    }

    await prisma.organizerMember.delete({
      where: {
        organizerId_userId: {
          organizerId: id,
          userId: targetUserId,
        },
      },
    });

    return res.json({ message: "Organizer member removed successfully." });
  } catch (error) {
    console.error("[Organizer API] Error removing member:", error);
    return res.status(500).json({ error: "Failed to remove member." });
  }
};

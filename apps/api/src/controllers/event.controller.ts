import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  CreateEventRequest,
  UpdateEventRequest,
  EventResponse,
  EventDetailResponse,
  PaginatedResponse,
} from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { CacheService } from "../services/cache.service.js";

const prisma = new PrismaClient();

export const listEvents = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const userOrgId = auth.orgId || null;

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
  const search = (req.query.search as string)?.trim() || "";
  const scope = (req.query.scope as string) || "all";
  const campus = (req.query.campus as string)?.trim() || "";
  const sort = (req.query.sort as string) || "popularity";

  const cacheKey = `events:list:${JSON.stringify({ page, limit, search, scope, campus, sort, userOrgId })}`;
  const cached = await CacheService.get<PaginatedResponse<EventDetailResponse>>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const andClauses: Prisma.EventWhereInput[] = [];

    // Scope filtering
    if (scope === "global") {
      andClauses.push({ isGlobal: true });
    } else if (scope === "org") {
      if (userOrgId) {
        andClauses.push({ isGlobal: false, orgId: userOrgId });
      } else {
        andClauses.push({ isGlobal: false });
      }
    } else {
      // scope === 'all'
      if (userOrgId) {
        andClauses.push({
          OR: [{ isGlobal: true }, { orgId: userOrgId }],
        });
      }
    }

    // Campus filter (e.g. My University)
    if (campus && campus !== "ALL") {
      andClauses.push({
        OR: [
          { location: { contains: campus, mode: "insensitive" } },
          { organizerProfile: { name: { contains: campus, mode: "insensitive" } } },
          { organization: { name: { contains: campus, mode: "insensitive" } } },
        ],
      });
    }

    // Search query
    if (search) {
      andClauses.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.EventWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};

    // Sort order: default popularity (teams count desc), date, or created_at
    let orderBy: Prisma.EventOrderByWithRelationInput | Prisma.EventOrderByWithRelationInput[] = [
      { teams: { _count: "desc" } },
      { date: "asc" },
    ];
    if (sort === "date_asc") {
      orderBy = { date: "asc" };
    } else if (sort === "date_desc") {
      orderBy = { date: "desc" };
    } else if (sort === "created_at") {
      orderBy = { createdAt: "desc" };
    } else if (sort === "popularity" || sort === "popular") {
      orderBy = [{ teams: { _count: "desc" } }, { date: "asc" }];
    }

    const [total, events] = await prisma.$transaction([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organizer: {
            select: { id: true, name: true, email: true },
          },
          organizerProfile: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
          organization: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
          _count: {
            select: { teams: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const data: EventDetailResponse[] = events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      date: ev.date.toISOString(),
      location: ev.location || undefined,
      organizerId: ev.organizerId,
      organizerProfileId: ev.organizerProfileId || undefined,
      orgId: ev.orgId || undefined,
      isGlobal: ev.isGlobal,
      organizer: ev.organizer,
      organizerProfile: ev.organizerProfile,
      organization: ev.organization,
      teamsCount: ev._count.teams,
      createdAt: ev.createdAt.toISOString(),
      updatedAt: ev.updatedAt.toISOString(),
    }));

    const responsePayload: PaginatedResponse<EventDetailResponse> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    // Cache list for 5 minutes (300 seconds)
    await CacheService.set(cacheKey, responsePayload, 300);

    return res.json(responsePayload);
  } catch (error) {
    console.error("[Event API] Error listing events:", error);
    return res.status(500).json({ error: "Failed to fetch events." });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Event ID is required." });
  }

  const cacheKey = `event:${id}`;
  const cached = await CacheService.get<EventDetailResponse>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        organizerProfile: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        teams: {
          select: {
            id: true,
            name: true,
            requirements: true,
            _count: { select: { members: true } },
          },
        },
        _count: {
          select: { teams: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    const payload: EventDetailResponse = {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date.toISOString(),
      location: event.location || undefined,
      organizerId: event.organizerId,
      organizerProfileId: event.organizerProfileId || undefined,
      orgId: event.orgId || undefined,
      isGlobal: event.isGlobal,
      organizer: event.organizer,
      organizerProfile: event.organizerProfile,
      organization: event.organization,
      teamsCount: event._count.teams,
      teams: event.teams.map((t) => ({
        id: t.id,
        name: t.name,
        membersCount: t._count.members,
        requirements: t.requirements,
      })),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };

    // Cache single event with dynamic TTL
    const dynamicTTL = CacheService.calculateEventTTL(event.date);
    await CacheService.set(cacheKey, payload, dynamicTTL);

    return res.json(payload);
  } catch (error) {
    console.error("[Event API] Error fetching event by ID:", error);
    return res.status(500).json({ error: "Failed to fetch event." });
  }
};

export const createEvent = async (
  req: Request<{}, {}, CreateEventRequest>,
  res: Response<EventResponse | { error: string }>
) => {
  const { userId, orgId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, description, date, location, isGlobal, organizerProfileId } = req.body;

  if (!title || !description || !date) {
    return res.status(400).json({ error: "Title, description, and date are required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    // If organizerProfileId is provided, verify it exists
    if (organizerProfileId) {
      const orgProfile = await prisma.organizer.findUnique({
        where: { id: organizerProfileId },
        include: { members: true },
      });
      if (!orgProfile) {
        return res.status(400).json({ error: "Specified Organizer Profile does not exist." });
      }
      const isOwnerOrAdmin =
        orgProfile.ownerId === userInDb.id ||
        orgProfile.members.some((m) => m.userId === userInDb.id && m.role === "ADMIN");
      if (!isOwnerOrAdmin) {
        return res.status(403).json({ error: "You do not have permission to organize on behalf of this entity." });
      }
    }

    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        date: eventDate,
        location,
        organizerId: userInDb.id,
        organizerProfileId: organizerProfileId || null,
        orgId: orgId || null,
        isGlobal: isGlobal ?? false,
      },
    });

    // Invalidate event list cache
    await CacheService.invalidatePattern("events:list:*");

    return res.status(201).json({
      id: newEvent.id,
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date.toISOString(),
      location: newEvent.location || undefined,
      organizerId: newEvent.organizerId,
      organizerProfileId: newEvent.organizerProfileId || undefined,
      orgId: newEvent.orgId || undefined,
      isGlobal: newEvent.isGlobal,
      createdAt: newEvent.createdAt.toISOString(),
      updatedAt: newEvent.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("[Event API] Error creating event:", error);
    return res.status(500).json({ error: "Failed to create event." });
  }
};

export const updateEvent = async (
  req: Request<{ id: string }, {}, UpdateEventRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const { title, description, date, location, isGlobal, organizerProfileId } = req.body;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        organizerProfile: { include: { members: true } },
      },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found." });
    }

    // Check authorization: organizerId or admin of organizerProfile
    const isPrimaryOrganizer = existingEvent.organizerId === userInDb.id;
    const isProfileAdmin = existingEvent.organizerProfile?.members.some(
      (m) => m.userId === userInDb.id && m.role === "ADMIN"
    );

    if (!isPrimaryOrganizer && !isProfileAdmin) {
      return res.status(403).json({ error: "Forbidden. You are not an organizer of this event." });
    }

    let parsedDate: Date | undefined;
    if (date) {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format." });
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(parsedDate !== undefined && { date: parsedDate }),
        ...(location !== undefined && { location }),
        ...(isGlobal !== undefined && { isGlobal }),
        ...(organizerProfileId !== undefined && { organizerProfileId: organizerProfileId || null }),
      },
    });

    // Invalidate caches
    await CacheService.del(`event:${id}`);
    await CacheService.invalidatePattern("events:list:*");

    return res.json({
      message: "Event updated successfully.",
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        date: updatedEvent.date.toISOString(),
        location: updatedEvent.location || undefined,
        organizerId: updatedEvent.organizerId,
        organizerProfileId: updatedEvent.organizerProfileId || undefined,
        orgId: updatedEvent.orgId || undefined,
        isGlobal: updatedEvent.isGlobal,
        createdAt: updatedEvent.createdAt.toISOString(),
        updatedAt: updatedEvent.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Event API] Error updating event:", error);
    return res.status(500).json({ error: "Failed to update event." });
  }
};

export const deleteEvent = async (req: Request<{ id: string }>, res: Response) => {
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
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found." });
    }

    if (existingEvent.organizerId !== userInDb.id) {
      return res.status(403).json({ error: "Forbidden. Only the event creator can delete this event." });
    }

    // Delete event and cascading associations
    await prisma.event.delete({
      where: { id },
    });

    // Invalidate caches
    await CacheService.del(`event:${id}`);
    await CacheService.invalidatePattern("events:list:*");
    await CacheService.invalidatePattern("teams:*");

    return res.json({ message: "Event deleted successfully." });
  } catch (error) {
    console.error("[Event API] Error deleting event:", error);
    return res.status(500).json({ error: "Failed to delete event." });
  }
};

export const getEventTeams = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Event ID is required." });
  }

  try {
    const teams = await prisma.team.findMany({
      where: { eventId: id },
      include: {
        taxonomy: true,
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });

    return res.json({
      eventId: id,
      totalTeams: teams.length,
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        requirements: t.requirements,
        requirementNodeIds: t.taxonomy?.requirementNodeIds || [],
        membersCount: t._count.members,
        university: t.university,
        members: t.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
          name: m.user.name,
          email: m.user.email,
          avatarUrl: (m.user as any).imageUrl || null,
          university: m.user.profile?.university || null,
          skills: m.user.profile?.skills || [],
          title: m.user.profile?.title || null,
        })),
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Event API] Error fetching event teams:", error);
    return res.status(500).json({ error: "Failed to fetch event teams." });
  }
};

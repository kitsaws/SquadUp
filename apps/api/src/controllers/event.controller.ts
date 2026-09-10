import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient } from "@prisma/client";
import { CreateEventRequest, EventResponse } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";

const prisma = new PrismaClient();

export const createEvent = async (req: Request<{}, {}, CreateEventRequest>, res: Response<EventResponse | { error: string }>) => {
  const { userId, orgId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, description, date, location, isGlobal } = req.body;

  if (!title || !description || !date) {
    return res.status(400).json({ error: "Title, description, and date are required." });
  }

  // Ensure user exists in our DB to prevent Foreign Key constraints
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

    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        date: eventDate,
        location,
        organizerId: userInDb.id,
        orgId: orgId || null,
        isGlobal: isGlobal ?? false,
      },
    });

    return res.status(201).json({
      id: newEvent.id,
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date.toISOString(),
      location: newEvent.location || undefined,
      organizerId: newEvent.organizerId,
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

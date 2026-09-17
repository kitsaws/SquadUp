import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient } from "@prisma/client";
import { UpdateUserPreferencesRequest } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";

const prisma = new PrismaClient();

export const getPreferences = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const { userId } = auth;

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
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: userInDb.id },
    });

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: userInDb.id,
          themeMode: "system",
          palettePreset: "default",
          primaryColor: null,
          bannerConfig: undefined,
          emailNotifications: true,
          teamInvitesNotification: true,
          applicationUpdates: true,
          marketingEmails: false,
          defaultCampusOnly: false,
          openToCollaboration: true,
          preferredRoles: [],
        },
      });
    }

    return res.json(preferences);
  } catch (error) {
    console.error("[PreferencesController] Error fetching preferences:", error);
    return res.status(500).json({ error: "Internal server error fetching user preferences." });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const { userId } = auth;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  const updates: UpdateUserPreferencesRequest = req.body;

  try {
    // Whitelist allowed fields to prevent arbitrary injection
    const dataToUpdate: any = {};
    if (typeof updates.themeMode === "string") dataToUpdate.themeMode = updates.themeMode;
    if (typeof updates.palettePreset === "string") dataToUpdate.palettePreset = updates.palettePreset;
    if (updates.primaryColor !== undefined) dataToUpdate.primaryColor = updates.primaryColor;
    if (updates.bannerConfig !== undefined) dataToUpdate.bannerConfig = updates.bannerConfig;
    if (typeof updates.emailNotifications === "boolean") dataToUpdate.emailNotifications = updates.emailNotifications;
    if (typeof updates.teamInvitesNotification === "boolean") dataToUpdate.teamInvitesNotification = updates.teamInvitesNotification;
    if (typeof updates.applicationUpdates === "boolean") dataToUpdate.applicationUpdates = updates.applicationUpdates;
    if (typeof updates.marketingEmails === "boolean") dataToUpdate.marketingEmails = updates.marketingEmails;
    if (typeof updates.defaultCampusOnly === "boolean") dataToUpdate.defaultCampusOnly = updates.defaultCampusOnly;
    if (typeof updates.openToCollaboration === "boolean") dataToUpdate.openToCollaboration = updates.openToCollaboration;
    if (Array.isArray(updates.preferredRoles)) dataToUpdate.preferredRoles = updates.preferredRoles;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: userInDb.id },
      create: {
        userId: userInDb.id,
        ...dataToUpdate,
      },
      update: dataToUpdate,
    });

    // Invalidate cached profile so new preferences and bannerConfig are reflected immediately
    try {
      const { CacheService } = await import("../services/cache.service.js");
      await CacheService.del(`profile:${userInDb.id}`);
    } catch {
      // ignore
    }

    return res.json(preferences);
  } catch (error) {
    console.error("[PreferencesController] Error updating preferences:", error);
    return res.status(500).json({ error: "Internal server error updating user preferences." });
  }
};

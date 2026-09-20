import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateOrganizerRequest,
  UpdateOrganizerRequest,
  OrganizerResponse,
} from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { OrganizationService } from "../services/organization.service.js";

// Re-export university organization handlers for backward compatibility
export {
  createOrganization,
  listOrganizations,
  getOrganizationByClerkId,
  selectUniversity,
} from "./organization.controller.js";

// ==========================================
// University Sub-Organizers (Clubs/Societies)
// ==========================================

export const createOrganizer = async (
  req: Request<{}, {}, CreateOrganizerRequest>,
  res: Response
) => {
  const { userId, orgId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: "name and slug are required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const organizer = await OrganizationService.createOrganizer(
      userInDb.id,
      req.body,
      orgId
    );

    return res.status(201).json({
      message: "Organizer profile created successfully.",
      organizer,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "An organizer with this slug already exists." });
    }
    console.error("[Organizer Controller] Error creating organizer:", error);
    return res.status(500).json({ error: "Failed to create organizer profile." });
  }
};

export const listOrganizers = async (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string)?.trim() || undefined;
  const search = (req.query.search as string)?.trim() || undefined;

  try {
    const response: OrganizerResponse[] = await OrganizationService.listOrganizers({
      orgId,
      search,
    });
    return res.json(response);
  } catch (error) {
    console.error("[Organizer Controller] Error listing organizers:", error);
    return res.status(500).json({ error: "Failed to list organizers." });
  }
};

export const getOrganizerById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const { id } = req.params;

  try {
    const result = await OrganizationService.getOrganizerById(id);
    if (!result) {
      return res.status(404).json({ error: "Organizer not found." });
    }
    return res.json(result);
  } catch (error) {
    console.error("[Organizer Controller] Error fetching organizer:", error);
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

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const updated = await OrganizationService.updateOrganizer(
      id,
      userInDb.id,
      req.body
    );
    return res.json({ message: "Organizer updated successfully.", organizer: updated });
  } catch (error: any) {
    if (error.message === "Organizer not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("[Organizer Controller] Error updating organizer:", error);
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
    const { targetUserName, member } = await OrganizationService.addOrganizerMember(
      id,
      userInDb.id,
      email,
      role
    );

    return res.status(201).json({
      message: `Added ${targetUserName} as ${member.role}.`,
      member,
    });
  } catch (error: any) {
    if (error.message === "Organizer not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("has not registered")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("[Organizer Controller] Error adding member:", error);
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
    await OrganizationService.removeOrganizerMember(id, callerInDb.id, targetUserId);
    return res.json({ message: "Organizer member removed successfully." });
  } catch (error: any) {
    if (error.message === "Organizer not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === "Cannot remove the owner of the organizer.") {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Organizer Controller] Error removing member:", error);
    return res.status(500).json({ error: "Failed to remove member." });
  }
};

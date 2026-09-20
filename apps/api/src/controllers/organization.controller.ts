import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateOrganizationRequest,
  OrganizationResponse,
} from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { OrganizationService } from "../services/organization.service.js";

// ==========================================
// University Organizations Controller
// ==========================================

export const createOrganization = async (
  req: Request<{}, {}, CreateOrganizationRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { clerkOrgId, name, slug } = req.body;
  if (!clerkOrgId || !name || !slug) {
    return res.status(400).json({ error: "clerkOrgId, name, and slug are required." });
  }

  try {
    const org = await OrganizationService.createOrganization(req.body);
    return res.status(201).json(org);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Organization with this clerkOrgId or slug already exists." });
    }
    console.error("[Organization Controller] Error creating organization:", error);
    return res.status(500).json({ error: "Failed to create organization." });
  }
};

export const listOrganizations = async (_req: Request, res: Response) => {
  try {
    const response: OrganizationResponse[] = await OrganizationService.listOrganizations();
    return res.json(response);
  } catch (error) {
    console.error("[Organization Controller] Error listing organizations:", error);
    return res.status(500).json({ error: "Failed to list organizations." });
  }
};

export const getOrganizationByClerkId = async (
  req: Request<{ clerkOrgId: string }>,
  res: Response
) => {
  const { clerkOrgId } = req.params;

  try {
    const org = await OrganizationService.getOrganizationByClerkId(clerkOrgId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found." });
    }
    return res.json(org);
  } catch (error) {
    console.error("[Organization Controller] Error fetching organization:", error);
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
    const result = await OrganizationService.selectUniversity(userInDb, {
      clerkOrgId,
      organizationId,
    });

    return res.json({
      success: true,
      message: `Successfully affiliated with ${result.organization.name}.`,
      organization: result.organization,
      membership: result.membership,
      profile: result.profile,
    });
  } catch (error: any) {
    if (error.message === "University organization not found.") {
      return res.status(404).json({ error: error.message });
    }
    console.error("[Organization Controller] Error selecting university:", error);
    return res.status(500).json({ error: "Failed to select university organization." });
  }
};

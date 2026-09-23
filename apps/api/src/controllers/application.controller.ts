import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { CreateApplicationRequest } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { ApplicationService } from "../services/application.service.js";

// ==========================================
// Application Controller
// ==========================================

export const applyToTeam = async (
  req: Request<{ id: string }, {}, CreateApplicationRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId } = req.params;
  const { message, roleTitle, roleId } = req.body as any;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await ApplicationService.applyToTeam(teamId, message, userInDb, roleTitle, roleId);
    return res.status(201).json({
      message: "Application submitted successfully.",
      applicationId: result.applicationId,
      status: result.status,
    });
  } catch (error: any) {
    if (error.message === "Team not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (
      error.message.includes("already a member") ||
      error.message.includes("already applied")
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Application Controller] Error applying to team:", error);
    return res.status(500).json({ error: "Failed to submit application." });
  }
};

export const withdrawApplication = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    await ApplicationService.withdrawApplication(teamId, userInDb.id);
    return res.json({ message: "Application withdrawn successfully." });
  } catch (error: any) {
    if (error.message.includes("No pending application")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("[Application Controller] Error withdrawing application:", error);
    return res.status(500).json({ error: "Failed to withdraw application." });
  }
};

export const withdrawApplicationById = async (
  req: Request<{ applicationId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicationId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    await ApplicationService.withdrawApplicationById(applicationId, userInDb.id);
    return res.json({ message: "Application withdrawn successfully." });
  } catch (error: any) {
    if (error.message === "Application not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("Cannot withdraw")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Application Controller] Error withdrawing application by id:", error);
    return res.status(500).json({ error: "Failed to withdraw application." });
  }
};

export const getMyApplications = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
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
    const result = await ApplicationService.getMyApplications(userInDb.id);
    return res.json(result);
  } catch (error) {
    console.error("[Application Controller] Error fetching my applications:", error);
    return res.status(500).json({ error: "Failed to fetch applications." });
  }
};

export const getIncomingApplications = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const teamId = (req.query.teamId as string)?.trim() || undefined;
  const status = (req.query.status as string)?.trim() || undefined;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await ApplicationService.getIncomingApplications(
      { teamId, status },
      userInDb.id
    );
    return res.json(result);
  } catch (error) {
    console.error("[Application Controller] Error fetching incoming applications:", error);
    return res.status(500).json({ error: "Failed to fetch incoming applications." });
  }
};

export const getApplicationById = async (
  req: Request<{ applicationId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicationId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const application = await ApplicationService.getApplicationById(applicationId, userInDb.id);
    return res.json(application);
  } catch (error: any) {
    if (error.message === "Application not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("[Application Controller] Error fetching application details:", error);
    return res.status(500).json({ error: "Failed to fetch application details." });
  }
};

export const getTeamApplications = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const applications = await ApplicationService.getTeamApplications(teamId, userInDb.id);
    return res.json(applications);
  } catch (error: any) {
    if (error.message === "Team not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("[Application Controller] Error fetching team applications:", error);
    return res.status(500).json({ error: "Failed to fetch team applications." });
  }
};

export const acceptApplication = async (
  req: Request<{ applicationId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicationId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await ApplicationService.acceptApplication(applicationId, userInDb.id);
    return res.json(result);
  } catch (error: any) {
    if (error.message === "Application not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    if (
      error.message.includes("Cannot accept") ||
      error.message.includes("maximum capacity")
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Application Controller] Error accepting application:", error);
    return res.status(500).json({ error: "Failed to accept application." });
  }
};

export const rejectApplication = async (
  req: Request<{ applicationId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicationId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await ApplicationService.rejectApplication(applicationId, userInDb.id);
    return res.json(result);
  } catch (error: any) {
    if (error.message === "Application not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("Cannot reject")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Application Controller] Error rejecting application:", error);
    return res.status(500).json({ error: "Failed to reject application." });
  }
};

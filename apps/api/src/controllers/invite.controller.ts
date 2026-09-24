import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { SendTeamInvitesRequest } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { InviteService } from "../services/invite.service.js";

// ==========================================
// Invite Controller
// ==========================================

export const sendTeamInvites = async (
  req: Request<{ id: string }, {}, SendTeamInvitesRequest>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId } = req.params;
  const { invites } = req.body;

  if (!invites || !Array.isArray(invites) || invites.length === 0) {
    return res.status(400).json({ error: "An array of invite emails/objects is required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await InviteService.sendTeamInvites(teamId, req.body, userInDb);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Team not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("[Invite Controller] Error sending invites:", error);
    return res.status(500).json({ error: "Failed to send team invites." });
  }
};

export const getMyInvites = async (req: Request, res: Response) => {
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
    const response = await InviteService.getMyInvites(userInDb.email, userInDb.id);
    return res.json(response);
  } catch (error) {
    console.error("[Invite Controller] Error fetching user invites:", error);
    return res.status(500).json({ error: "Failed to fetch invitations." });
  }
};

export const getInviteById = async (
  req: Request<{ inviteId: string }>,
  res: Response
) => {
  const { inviteId } = req.params;

  try {
    const response = await InviteService.getInviteById(inviteId);
    return res.json(response);
  } catch (error: any) {
    if (error.message === "Invite not found.") {
      return res.status(404).json({ error: error.message });
    }
    console.error("[Invite Controller] Error fetching invite by ID:", error);
    return res.status(500).json({ error: "Failed to fetch invitation." });
  }
};

export const acceptInvite = async (
  req: Request<{ inviteId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { inviteId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await InviteService.acceptInvite(inviteId, userInDb);
    return res.json(result);
  } catch (error: any) {
    if (error.message === "Invite not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (
      error.message.includes("different email") ||
      error.message.includes("already") ||
      error.message.includes("maximum capacity")
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Invite Controller] Error accepting invite:", error);
    return res.status(500).json({ error: "Failed to accept invite." });
  }
};

export const declineInvite = async (
  req: Request<{ inviteId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { inviteId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await InviteService.declineInvite(inviteId, userInDb.email);
    return res.json(result);
  } catch (error: any) {
    if (error.message === "Invite not found.") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("different email") || error.message.includes("already")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[Invite Controller] Error declining invite:", error);
    return res.status(500).json({ error: "Failed to decline invite." });
  }
};

export const cancelInvite = async (
  req: Request<{ id: string; inviteId: string }>,
  res: Response
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: teamId, inviteId } = req.params;

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    const result = await InviteService.cancelInvite(teamId, inviteId, userInDb.id);
    return res.json(result);
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Forbidden")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("[Invite Controller] Error cancelling invite:", error);
    return res.status(500).json({ error: "Failed to cancel invite." });
  }
};

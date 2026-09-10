import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient } from "@prisma/client";
import { CreateTeamRequest } from "@squadup/shared";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";

const prisma = new PrismaClient();

export const createTeam = async (req: Request<{}, {}, CreateTeamRequest>, res: Response) => {
  const { userId, orgId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { eventId, name, requirements, invites } = req.body;

  if (!eventId || !name) {
    return res.status(400).json({ error: "eventId and name are required." });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user profile." });
  }

  try {
    // We use a transaction to ensure all team data is created atomicaly
    const team = await prisma.$transaction(async (tx) => {
      // 1. Create the team
      const newTeam = await tx.team.create({
        data: {
          name,
          eventId,
          requirements: requirements || [],
          orgId: orgId || null,
        },
      });

      // 2. Add the creator as the Leader
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: userInDb.id,
          role: "Leader",
        },
      });

      // 3. Create invites if provided
      if (invites && invites.length > 0) {
        const uniqueEmails = [...new Set(invites)]; // Deduplicate emails
        
        await tx.teamInvite.createMany({
          data: uniqueEmails.map(email => ({
            teamId: newTeam.id,
            senderId: userInDb.id,
            email,
            status: "PENDING"
          }))
        });
      }

      return newTeam;
    });

    return res.status(201).json({ 
      message: "Team created successfully", 
      teamId: team.id 
    });
  } catch (error: any) {
    console.error("[Team API] Error creating team:", error);
    return res.status(500).json({ error: "Failed to create team." });
  }
};

export const acceptInvite = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const { userId, sessionClaims } = auth;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { inviteId } = req.params;

  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({ error: `Invite is already ${invite.status}` });
    }

    // Since sessionClaims.email or sessionClaims.email_addresses might be used based on Clerk config
    // We should safely try to extract the user's primary email. In Clerk v2, it's often in sessionClaims or we can fetch the user details.
    // For this API, let's assume the client passes the email in the body for verification, 
    // OR we fetch it from Clerk API. To be robust without fetching Clerk API, we can rely on standard claims.
    
    let userInDb;
    try {
      userInDb = await getOrCreateUserByClerkId(userId);
    } catch (error) {
      return res.status(500).json({ error: "Failed to verify user profile." });
    }

    if (userInDb.email.toLowerCase() !== invite.email.toLowerCase()) {
      return res.status(403).json({ 
        error: "Forbidden. This invite was sent to a different email address." 
      });
    }

    await prisma.$transaction([
      // Update invite
      prisma.teamInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" }
      }),
      // Create team member
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: userInDb.id,
          role: "Member"
        }
      })
    ]);

    return res.status(200).json({ message: "Invite accepted successfully" });
  } catch (error) {
    console.error("[Team API] Error accepting invite:", error);
    return res.status(500).json({ error: "Failed to accept invite." });
  }
};

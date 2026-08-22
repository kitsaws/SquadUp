import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProfile = async (req: Request, res: Response) => {
  console.log("[Profile API] Received request");
  console.log("[Profile API] Auth Header:", req.headers.authorization ? "Present" : "Missing");
  
  const auth = getAuth(req);
  console.log("[Profile API] getAuth() result:", JSON.stringify(auth));

  const { userId } = auth;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", details: auth });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });
    
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    return res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
};

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Looks up the internal database User by their Clerk ID.
 * If the user doesn't exist (e.g., local development without webhooks), 
 * it seamlessly fetches their details from the Clerk API and creates them.
 */
export async function getOrCreateUserByClerkId(clerkId: string) {
  let userInDb = await prisma.user.findUnique({ where: { clerkId } });
  
  if (!userInDb) {
    console.log(`[Auth Utils] User with Clerk ID ${clerkId} missing in DB. Fetching from Clerk API...`);
    try {
      const { clerkClient } = await import('@clerk/express');
      const clerkUser = await clerkClient.users.getUser(clerkId);
      
      const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkId}@squadup.dev`;
      const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "SquadUp User";
      
      userInDb = await prisma.user.create({
        data: { clerkId, email, name }
      });
      console.log(`[Auth Utils] Successfully synced user ${clerkId} to DB.`);
    } catch (clerkError) {
      console.error("[Auth Utils] Error fetching user from Clerk API:", clerkError);
      throw new Error("Failed to verify user profile with Clerk.");
    }
  }

  return userInDb;
}

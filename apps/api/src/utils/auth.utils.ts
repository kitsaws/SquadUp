import { prisma } from "../lib/prisma.js";

export async function syncUserOrganizationsFromClerk(userId: string, clerkId: string) {
  try {
    const { clerkClient } = await import("@clerk/express");
    const memberships = await clerkClient.users.getOrganizationMembershipList({
      userId: clerkId,
    });

    for (const mem of memberships.data) {
      const clerkOrg = mem.organization;
      if (!clerkOrg) continue;

      // Upsert Org
      const org = await prisma.organization.upsert({
        where: { clerkOrgId: clerkOrg.id },
        update: {
          name: clerkOrg.name,
          slug: clerkOrg.slug || clerkOrg.id,
          ...(clerkOrg.imageUrl && { logoUrl: clerkOrg.imageUrl }),
        },
        create: {
          clerkOrgId: clerkOrg.id,
          name: clerkOrg.name,
          slug: clerkOrg.slug || clerkOrg.id,
          logoUrl: clerkOrg.imageUrl || null,
        },
      });

      // Upsert membership
      await prisma.organizationMembership.upsert({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: userId,
          },
        },
        update: {
          clerkMemberId: mem.id,
          role: mem.role,
        },
        create: {
          clerkMemberId: mem.id,
          organizationId: org.id,
          userId: userId,
          role: mem.role,
        },
      });

      // Synchronize user profile university
      await prisma.profile.upsert({
        where: { userId },
        update: {
          university: org.name,
        },
        create: {
          userId,
          university: org.name,
          skills: [],
        },
      });

      console.log(`[Auth Utils] Synced Clerk Org ${org.name} for user ${clerkId}`);
    }
  } catch (err) {
    console.warn(`[Auth Utils] Note: Could not auto-sync orgs from Clerk for user ${clerkId}:`, err);
  }
}

export async function linkUserToOrganization(
  userId: string,
  clerkUserId: string,
  organization: { id: string; clerkOrgId: string; name: string }
) {
  let clerkMemberId: string | null = null;

  if (organization.clerkOrgId && clerkUserId) {
    try {
      const { clerkClient } = await import("@clerk/express");
      try {
        const clerkMembership = await clerkClient.organizations.createOrganizationMembership({
          organizationId: organization.clerkOrgId,
          userId: clerkUserId,
          role: "org:member",
        });
        if (clerkMembership?.id) {
          clerkMemberId = clerkMembership.id;
          console.log(`[Auth Utils] Created Clerk membership ${clerkMemberId} for user ${clerkUserId} in org ${organization.clerkOrgId}`);
        }
      } catch (clerkCreateErr: any) {
        console.warn(`[Auth Utils] Clerk createOrganizationMembership notice: ${clerkCreateErr?.message || clerkCreateErr}. Querying existing memberships...`);
        const existingList = await clerkClient.users.getOrganizationMembershipList({
          userId: clerkUserId,
        });
        const match = existingList.data?.find((m: any) => m.organization?.id === organization.clerkOrgId);
        if (match?.id) {
          clerkMemberId = match.id;
          console.log(`[Auth Utils] Retrieved existing Clerk membership ID: ${clerkMemberId}`);
        }
      }
    } catch (clerkErr) {
      console.warn(`[Auth Utils] Non-fatal: Could not create organization membership in Clerk:`, clerkErr);
    }
  }

  // Remove any previous conflicting organization memberships if user is switching university
  await prisma.organizationMembership.deleteMany({
    where: {
      userId,
      organizationId: { not: organization.id },
    },
  });

  // Upsert membership
  const membership = await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: userId,
      },
    },
    update: {
      role: "org:member",
      ...(clerkMemberId ? { clerkMemberId } : {}),
    },
    create: {
      clerkMemberId: clerkMemberId || null,
      organizationId: organization.id,
      userId: userId,
      role: "org:member",
    },
  });

  // Synchronize user profile university
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {
      university: organization.name,
    },
    create: {
      userId,
      university: organization.name,
      skills: [],
    },
  });

  return { membership, profile, clerkMemberId };
}

/**
 * Looks up the internal database User by their Clerk ID.
 * If the user doesn't exist (e.g., local development without webhooks), 
 * it seamlessly fetches their details from the Clerk API and creates them.
 */
export async function getOrCreateUserByClerkId(clerkId: string) {
  let userInDb = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      profile: true,
      organizationMemberships: {
        include: { organization: true },
      },
    },
  });
  
  if (!userInDb) {
    console.log(`[Auth Utils] User with Clerk ID ${clerkId} missing in DB. Fetching from Clerk API...`);
    try {
      const { clerkClient } = await import("@clerk/express");
      const clerkUser = await clerkClient.users.getUser(clerkId);
      
      const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkId}@squadup.dev`;
      const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "SquadUp User";
      const imageUrl = clerkUser.imageUrl || null;
      
      userInDb = await prisma.user.upsert({
        where: { clerkId },
        update: { email, name, ...(imageUrl && { imageUrl }) },
        create: { clerkId, email, name, imageUrl },
        include: {
          profile: true,
          organizationMemberships: {
            include: { organization: true },
          },
        },
      });

      await prisma.profile.upsert({
        where: { userId: userInDb.id },
        update: {},
        create: {
          userId: userInDb.id,
          skills: [],
        },
      });

      await prisma.userPreferences.upsert({
        where: { userId: userInDb.id },
        update: {},
        create: {
          userId: userInDb.id,
        },
      });

      console.log(`[Auth Utils] Successfully synced user ${clerkId} to DB.`);
    } catch (clerkError) {
      console.error("[Auth Utils] Error fetching user from Clerk API:", clerkError);
      throw new Error("Failed to verify user profile with Clerk.");
    }
  } else if (!userInDb.imageUrl) {
    // Lazily backfill imageUrl if missing in DB
    try {
      const { clerkClient } = await import("@clerk/express");
      const clerkUser = await clerkClient.users.getUser(clerkId);
      if (clerkUser.imageUrl) {
        userInDb = await prisma.user.update({
          where: { clerkId },
          data: { imageUrl: clerkUser.imageUrl },
          include: {
            profile: true,
            organizationMemberships: {
              include: { organization: true },
            },
          },
        });
      }
    } catch {
      // Non-blocking
    }
  }

  // If user has no organization memberships registered or profile has no university,
  // query Clerk API to sync memberships automatically
  if (userInDb.organizationMemberships.length === 0 || !userInDb.profile?.university) {
    await syncUserOrganizationsFromClerk(userInDb.id, clerkId);
  } else {
    // If organization name was updated, ensure Profile.university is kept in sync
    const primaryOrgName = userInDb.organizationMemberships[0]?.organization?.name;
    if (primaryOrgName && userInDb.profile?.university !== primaryOrgName) {
      await prisma.profile.update({
        where: { userId: userInDb.id },
        data: { university: primaryOrgName },
      });
      if (userInDb.profile) {
        userInDb.profile.university = primaryOrgName;
      }
    }
  }

  return userInDb;
}

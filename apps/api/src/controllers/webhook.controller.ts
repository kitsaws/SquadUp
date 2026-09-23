import { Request, Response } from "express";
import { Webhook } from "svix";
import { prisma } from "../lib/prisma.js";
import { CacheService } from "../services/cache.service.js";
import { TeamService } from "../services/team.service.js";

export const clerkWebhookHandler = async (req: Request, res: Response) => {
  const now = new Date().toLocaleTimeString();
  console.log("\n" + "=".repeat(70));
  console.log(`⚡ [CLERK WEBHOOK INCOMING] ${now}`);
  console.log(`   Method: ${req.method} | URL: ${req.originalUrl}`);

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("❌ [Clerk Webhook] Error: Missing CLERK_WEBHOOK_SECRET in environment");
    console.log("=".repeat(70) + "\n");
    return res.status(500).json({ error: "Missing CLERK_WEBHOOK_SECRET" });
  }

  // Get Svix verification headers
  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  console.log(`   svix-id:        ${svix_id || "(missing)"}`);
  console.log(`   svix-timestamp: ${svix_timestamp || "(missing)"}`);
  console.log(`   svix-signature: ${svix_signature ? svix_signature.slice(0, 20) + "..." : "(missing)"}`);

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.warn("⚠️  [Clerk Webhook] Rejected: Missing required Svix headers");
    console.log("=".repeat(70) + "\n");
    return res.status(400).json({ error: "Missing Svix headers" });
  }

  // Get raw body as string for Svix verification
  const payload = req.body;
  const body = Buffer.isBuffer(payload)
    ? payload.toString("utf8")
    : typeof payload === "string"
    ? payload
    : JSON.stringify(payload || {});

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error(`❌ [Clerk Webhook] Signature verification failed: ${(err as Error).message}`);
    console.log("=".repeat(70) + "\n");
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  const eventType: string = evt.type;
  const data = evt.data;

  console.log(`✅ [Clerk Webhook] Signature Verified Successfully!`);
  console.log(`🏷️  [Clerk Webhook] Event Type: ${eventType} (ID: ${data?.id || "N/A"})`);
  console.log(`📦 [Clerk Webhook] Event Payload:`);
  console.log(JSON.stringify(data, null, 2));
  console.log("-".repeat(70));

  try {
    switch (eventType) {
      // ==========================================
      // 1. USER EVENTS
      // ==========================================
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, primary_email_address_id, first_name, last_name, username } = data;
        const primaryEmailObj =
          email_addresses?.find((e: any) => e.id === primary_email_address_id) ||
          email_addresses?.[0];
        const email = primaryEmailObj?.email_address || `${id}@squadup.dev`;
        const name = `${first_name || ""} ${last_name || ""}`.trim() || username || "SquadUp User";

        let user = await prisma.user.findUnique({
          where: { clerkId: id },
        });

        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { email, name },
          });
        } else {
          const existingUserByEmail = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUserByEmail) {
            // Old user was deleted in Clerk and a fresh account created with same email
            await TeamService.handleUserDeletion(existingUserByEmail.id);
            await prisma.user.delete({
              where: { id: existingUserByEmail.id },
            });
          }

          user = await prisma.user.create({
            data: {
              clerkId: id,
              email,
              name,
            },
          });
        }

        // Ensure user has a profile record initialized
        await prisma.profile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            skills: [],
          },
        });

        console.log(`[Clerk Webhook] Synced user ${id} (${email}) to database.`);
        break;
      }

      case "user.deleted": {
        const { id } = data;
        const userInDb = await prisma.user.findUnique({
          where: { clerkId: id },
        });

        if (userInDb) {
          // Gracefully transfer leadership and unassign roles across all squads
          await TeamService.handleUserDeletion(userInDb.id);
        }

        await prisma.user.deleteMany({
          where: { clerkId: id },
        });

        await CacheService.invalidateAllTeams();
        console.log(`[Clerk Webhook] Deleted user ${id}, transferred team leaderships, and invalidated related caches.`);
        break;
      }

      // ==========================================
      // 2. ORGANIZATION (UNIVERSITY) EVENTS
      // ==========================================
      case "organization.created":
      case "organization.updated": {
        const { id: clerkOrgId, name, slug, logo_url, image_url, public_metadata } = data;
        const logo = logo_url || image_url || null;
        const domain = public_metadata?.domain || null;
        const location = public_metadata?.location || null;
        const resolvedSlug = slug || clerkOrgId;

        const org = await prisma.organization.upsert({
          where: { clerkOrgId },
          update: {
            name: name || "University Organization",
            slug: resolvedSlug,
            ...(logo !== undefined && { logoUrl: logo }),
            ...(domain && { domain }),
            ...(location && { location }),
          },
          create: {
            clerkOrgId,
            name: name || "University Organization",
            slug: resolvedSlug,
            logoUrl: logo,
            domain,
            location,
          },
        });

        // Cascade updated organization name to all affiliated member Profiles
        const orgMemberships = await prisma.organizationMembership.findMany({
          where: { organizationId: org.id },
          select: { userId: true },
        });
        const memberUserIds = orgMemberships.map((m) => m.userId);

        if (memberUserIds.length > 0) {
          const profileUpdates = await prisma.profile.updateMany({
            where: { userId: { in: memberUserIds } },
            data: { university: org.name },
          });
          console.log(
            `[Clerk Webhook] Propagated university name "${org.name}" to ${profileUpdates.count} member profile(s).`
          );
        }

        // Also cascade organization name to teams associated with this organization
        const teamUpdates = await prisma.team.updateMany({
          where: {
            OR: [
              { organizationId: org.id },
              { orgId: clerkOrgId },
            ],
          },
          data: { university: org.name },
        });
        if (teamUpdates.count > 0) {
          console.log(
            `[Clerk Webhook] Propagated university name "${org.name}" to ${teamUpdates.count} team(s).`
          );
        }

        await CacheService.invalidateAllTeams();
        console.log(`[Clerk Webhook] Synced organization ${clerkOrgId} (${name}).`);
        break;
      }

      case "organization.deleted": {
        const { id: clerkOrgId } = data;
        const org = await prisma.organization.findUnique({
          where: { clerkOrgId },
          include: {
            members: { select: { userId: true } },
          },
        });

        if (org) {
          const memberUserIds = org.members.map((m) => m.userId);
          if (memberUserIds.length > 0) {
            await prisma.profile.updateMany({
              where: {
                userId: { in: memberUserIds },
                university: org.name,
              },
              data: { university: null },
            });
            console.log(
              `[Clerk Webhook] Cleared Profile.university for ${memberUserIds.length} member(s) of deleted organization "${org.name}".`
            );
          }

          await prisma.organization.delete({
            where: { id: org.id },
          });
        }

        await CacheService.invalidateAllTeams();
        console.log(`[Clerk Webhook] Deleted organization ${clerkOrgId}.`);
        break;
      }

      // ==========================================
      // 3. ORGANIZATION MEMBERSHIP EVENTS
      // ==========================================
      case "organizationMembership.created":
      case "organizationMembership.updated": {
        const { id: clerkMemberId, role, organization, public_user_data } = data;
        const clerkOrgId = organization?.id;
        const clerkUserId = public_user_data?.user_id;

        if (!clerkOrgId || !clerkUserId) {
          console.warn("[Clerk Webhook] Membership event missing organization.id or public_user_data.user_id");
          return res.status(400).json({ error: "Missing required membership references" });
        }

        // 1. Ensure Organization exists in DB
        let org = await prisma.organization.findUnique({
          where: { clerkOrgId },
        });

        if (!org) {
          const orgName = organization?.name || "University Organization";
          const orgSlug = organization?.slug || clerkOrgId;
          const orgLogo = organization?.logo_url || organization?.image_url || null;
          org = await prisma.organization.create({
            data: {
              clerkOrgId,
              name: orgName,
              slug: orgSlug,
              logoUrl: orgLogo,
            },
          });
        }

        // 2. Ensure User exists in DB
        let user = await prisma.user.findUnique({
          where: { clerkId: clerkUserId },
        });

        if (!user) {
          const userEmail = public_user_data?.identifier || `${clerkUserId}@squadup.dev`;
          const userName =
            `${public_user_data?.first_name || ""} ${public_user_data?.last_name || ""}`.trim() ||
            "SquadUp User";

          const existingUserByEmail = await prisma.user.findUnique({
            where: { email: userEmail },
          });

          if (existingUserByEmail) {
            user = await prisma.user.update({
              where: { id: existingUserByEmail.id },
              data: { clerkId: clerkUserId, name: userName },
            });
          } else {
            user = await prisma.user.create({
              data: {
                clerkId: clerkUserId,
                email: userEmail,
                name: userName,
              },
            });
          }
        }

        // 3. Upsert OrganizationMembership record
        await prisma.organizationMembership.upsert({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: user.id,
            },
          },
          update: {
            clerkMemberId: clerkMemberId || undefined,
            role: role || "org:member",
          },
          create: {
            clerkMemberId: clerkMemberId || null,
            organizationId: org.id,
            userId: user.id,
            role: role || "org:member",
          },
        });

        // 4. Synchronize user's Profile.university with the organization name
        await prisma.profile.upsert({
          where: { userId: user.id },
          update: {
            university: org.name,
          },
          create: {
            userId: user.id,
            university: org.name,
            skills: [],
          },
        });

        await CacheService.invalidateAllTeams();
        console.log(
          `[Clerk Webhook] Synced membership: User ${clerkUserId} -> Org ${org.name} (${role})`
        );
        break;
      }

      case "organizationMembership.deleted": {
        const { id: clerkMemberId, organization, public_user_data } = data;
        const clerkOrgId = organization?.id;
        const clerkUserId = public_user_data?.user_id;

        const org = clerkOrgId
          ? await prisma.organization.findUnique({ where: { clerkOrgId } })
          : null;
        const user = clerkUserId
          ? await prisma.user.findUnique({ where: { clerkId: clerkUserId } })
          : null;

        if (clerkMemberId) {
          await prisma.organizationMembership.deleteMany({
            where: { clerkMemberId },
          });
        } else if (org && user) {
          await prisma.organizationMembership.deleteMany({
            where: {
              organizationId: org.id,
              userId: user.id,
            },
          });
        }

        // Reset Profile.university if it was previously set to this organization
        if (user && org) {
          const updatedCount = await prisma.profile.updateMany({
            where: {
              userId: user.id,
              university: org.name,
            },
            data: { university: null },
          });
          if (updatedCount.count > 0) {
            console.log(
              `[Clerk Webhook] Reset profile university for user ${clerkUserId} after leaving ${org.name}`
            );
          }
        }

        await CacheService.invalidateAllTeams();
        console.log(
          `[Clerk Webhook] Removed membership for member ID ${clerkMemberId || "unspecified"}`
        );
        break;
      }

      default: {
        console.log(`[Clerk Webhook] Received unhandled event type: ${eventType}`);
        break;
      }
    }

    console.log(`🎉 [Clerk Webhook] Successfully processed and committed "${eventType}" to DB.`);
    console.log("=".repeat(70) + "\n");
    return res.status(200).json({ success: true, event: eventType });
  } catch (dbError) {
    console.error(`💥 [Clerk Webhook] Database error while processing ${eventType}:`, dbError);
    console.log("=".repeat(70) + "\n");
    return res.status(500).json({ error: "Database error processing webhook" });
  }
};


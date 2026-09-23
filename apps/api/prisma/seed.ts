import { prisma } from "../src/lib/prisma.js";
import { Redis } from "ioredis";
import { seedOrganizations } from "./seeds/organizations.seed.js";
import { seedUsers } from "./seeds/users.seed.js";
import { seedEvents } from "./seeds/events.seed.js";
import { seedTeams } from "./seeds/teams.seed.js";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function main() {
  console.log("\n=========================================================");
  console.log("🌱 Starting SquadUp Fresh Database Seeding");
  console.log("=========================================================\n");

  // =========================================================================
  // 1. RESET ALL EXISTING DATA IN REVERSE FOREIGN KEY DEPENDENCY ORDER
  // =========================================================================
  console.log("🧹 Clearing all existing database tables...");
  await prisma.notification.deleteMany({});
  await prisma.teamInvite.deleteMany({});
  await prisma.teamApplication.deleteMany({});
  await prisma.teamRole.deleteMany({});
  await prisma.teamTaxonomy.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.organizerMember.deleteMany({});
  await prisma.organizer.deleteMany({});
  await prisma.organizationMembership.deleteMany({});
  await prisma.userTaxonomy.deleteMany({});
  await prisma.userPreferences.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  console.log("   ✅ Database tables cleared successfully.\n");

  // =========================================================================
  // 2. SEED ORGANIZATIONS & SUB-ORGANIZERS
  // =========================================================================
  const { orgMap, clubMap } = await seedOrganizations(prisma);

  // =========================================================================
  // 3. SEED USERS, PROFILES, PREFERENCES & TAXONOMIES
  // =========================================================================
  const createdStudents = await seedUsers(prisma, orgMap);

  // =========================================================================
  // 4. SEED EVENTS (HACKATHONS & PRODUCTATHONS)
  // =========================================================================
  const createdEvents = await seedEvents(prisma, orgMap, clubMap, createdStudents);

  // =========================================================================
  // 5. SEED TEAMS, ROLES, SQUAD TAXONOMIES & APPLICATIONS
  // =========================================================================
  const totalTeams = await seedTeams(prisma, createdEvents, createdStudents);

  // =========================================================================
  // 6. FLUSH REDIS CACHE
  // =========================================================================
  console.log("\n🧹 Invalidating Redis Cache...");
  try {
    const keys = await redis.keys("events:*");
    const teamKeys = await redis.keys("teams:*");
    const profileKeys = await redis.keys("profile:*");
    const recKeys = await redis.keys("recs:*");
    const allKeys = [...keys, ...teamKeys, ...profileKeys, ...recKeys];

    if (allKeys.length > 0) {
      await redis.del(...allKeys);
      console.log(`   ✅ Flushed ${allKeys.length} stale Redis cache keys.`);
    } else {
      console.log("   ✅ Redis cache clean.");
    }
  } catch (err: any) {
    console.warn("   ⚠️ Redis flush warning (continuing):", err.message);
  }

  console.log("\n=========================================================");
  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log(`🏫 Organizations: ${Object.keys(orgMap).length} Verified Universities`);
  console.log(`🏛️ Sub-Organizers: ${Object.keys(clubMap).length} Campus Clubs & Societies`);
  console.log(`👥 Students: ${createdStudents.length} Simulated Students with AI Taxonomies`);
  console.log(`📅 Events: ${createdEvents.length} Hackathons (Campus-Scoped + Global)`);
  console.log(`⚔️ Teams: ${totalTeams} Squads with Roles & Applications`);
  console.log("=========================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

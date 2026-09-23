import { PrismaClient } from "@prisma/client";
import { SeededStudent } from "./users.seed.js";

export async function seedEvents(
  prisma: PrismaClient,
  orgMap: Record<string, any>,
  clubMap: Record<string, any>,
  students: SeededStudent[]
): Promise<any[]> {
  console.log("\n📅 Seeding 16 Collegiate & Global Hackathons...");

  const tietOrg = orgMap["tiet"];
  const bitsOrg = orgMap["bits-pilani"];
  const vitOrg = orgMap["vit-vellore"];
  const iitdOrg = orgMap["iit-delhi"];

  // Map student helpers by org
  const tietStudents = students.filter((s) => s.orgSlug === "tiet");
  const bitsStudents = students.filter((s) => s.orgSlug === "bits-pilani");
  const vitStudents = students.filter((s) => s.orgSlug === "vit-vellore");
  const iitdStudents = students.filter((s) => s.orgSlug === "iit-delhi");

  const eventsData = [
    // --- 5 TIET Events ---
    {
      title: "Makeathon 7.0",
      description: "TIET's flagship 36-hour hackathon hosted by MLSC TIET. Build breakthrough software and hardware solutions with tracks in AI, FinTech, and IoT.",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      location: "Thapar Institute of Engineering & Technology, Patiala",
      organizerId: tietStudents[1]?.id || students[0].id,
      organizerProfileId: clubMap["mlsc-tiet"]?.id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "HackTU 6.0",
      description: "North India's premier collegiate hackathon organized by Creative Computing Society (CCS). High energy 24-hour innovation sprint.",
      date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      location: "TIET Main Auditorium, Patiala",
      organizerId: tietStudents[2]?.id || students[0].id,
      organizerProfileId: clubMap["ccs-tiet"]?.id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "CyberSurge 2026: TIET CTF & Security Sprint",
      description: "24-hour Capture-The-Flag and defensive cybersecurity challenge organized by OWASP TIET.",
      date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      location: "TIET Computer Labs, Patiala",
      organizerId: tietStudents[5]?.id || students[0].id,
      organizerProfileId: clubMap["owasp-tiet"]?.id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "DevSprint TIET: 24h FullStack Productathon",
      description: "A rapid product development sprint by GDSC TIET. Turn ideas into working web and mobile apps.",
      date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      location: "Library Hall, TIET, Patiala",
      organizerId: tietStudents[3]?.id || students[0].id,
      organizerProfileId: clubMap["gdsc-tiet"]?.id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "CodeHers TIET 2026",
      description: "A vibrant women-in-tech hackathon organized by ACM TIET, fostering diversity and innovation.",
      date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
      location: "Niranjan Hall, TIET, Patiala",
      organizerId: tietStudents[0]?.id || students[0].id,
      organizerProfileId: clubMap["acm-tiet"]?.id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },

    // --- 3 BITS Pilani Events ---
    {
      title: "APOGEE Hackathon 2026",
      description: "Flagship hackathon of BITS Pilani's annual technical fest APOGEE. Tackling real-world industry problem statements.",
      date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      location: "BITS Pilani Campus, Rajasthan",
      organizerId: bitsStudents[1]?.id || students[0].id,
      organizerProfileId: clubMap["apogee-bits"]?.id,
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      isGlobal: false,
    },
    {
      title: "BITS ByteCraft 2026",
      description: "Systems programming and low-latency algorithmic engineering sprint by Coding Club BITS.",
      date: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
      location: "NAB Auditorium, BITS Pilani",
      organizerId: bitsStudents[2]?.id || students[0].id,
      organizerProfileId: clubMap["coding-club-bits"]?.id,
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      isGlobal: false,
    },
    {
      title: "Pilani Web3 Build-a-thon",
      description: "Decentralized applications, smart contracts, and zero-knowledge crypto sprint by IEEE BITS.",
      date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      location: "BITS Pilani",
      organizerId: bitsStudents[0]?.id || students[0].id,
      organizerProfileId: clubMap["ieee-bits-pilani"]?.id,
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      isGlobal: false,
    },

    // --- 3 VIT Vellore Events ---
    {
      title: "Gravitas 2026 Flagship Hackathon",
      description: "Annual international techno-management knowledge festival hackathon hosted by CSI VIT.",
      date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      location: "Anna Auditorium, VIT Vellore",
      organizerId: vitStudents[0]?.id || students[0].id,
      organizerProfileId: clubMap["csi-vit"]?.id,
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      isGlobal: false,
    },
    {
      title: "HackBattle 2026: ACM VIT",
      description: "36-hour continuous build challenge with tracks in AI Agents, FinTech, and Autonomous Systems.",
      date: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000),
      location: "Technology Tower, VIT Vellore",
      organizerId: vitStudents[1]?.id || students[0].id,
      organizerProfileId: clubMap["acm-vit"]?.id,
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      isGlobal: false,
    },
    {
      title: "DevSpace 2026",
      description: "Full-stack cloud and open-source sprint organized by IEEE-CS VIT.",
      date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      location: "SJT Hall, VIT Vellore",
      organizerId: vitStudents[2]?.id || students[0].id,
      organizerProfileId: clubMap["ieee-cs-vit"]?.id,
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      isGlobal: false,
    },

    // --- 3 IIT Delhi Events ---
    {
      title: "Tryst Hackathon 2026",
      description: "North India's largest technological festival hackathon at Indian Institute of Technology Delhi.",
      date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      location: "Dogra Hall, IIT Delhi",
      organizerId: iitdStudents[1]?.id || students[0].id,
      organizerProfileId: clubMap["tryst-iitd"]?.id,
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      isGlobal: false,
    },
    {
      title: "DevClub Productathon IITD",
      description: "24-hour rapid prototyping and devtooling sprint organized by DevClub IIT Delhi.",
      date: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
      location: "Bharti Building, IIT Delhi",
      organizerId: iitdStudents[2]?.id || students[0].id,
      organizerProfileId: clubMap["devclub-iitd"]?.id,
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      isGlobal: false,
    },
    {
      title: "OpenHack IIT Delhi 2026",
      description: "Open source software development and infrastructure challenge by ACM IIT Delhi.",
      date: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
      location: "IIT Delhi Campus",
      organizerId: iitdStudents[0]?.id || students[0].id,
      organizerProfileId: clubMap["acm-iitd"]?.id,
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      isGlobal: false,
    },

    // --- 5 Global / Inter-University Events (isGlobal = true) ---
    {
      title: "Indian Collegiate Hackathon League (ICHL 2026)",
      description: "Premier national inter-university hackathon bringing together top engineering talent across India.",
      date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
      location: "Hybrid (New Delhi & Virtual)",
      organizerId: students[0].id,
      organizerProfileId: clubMap["ccs-tiet"]?.id,
      organizationId: tietOrg.id,
      orgId: tietOrg.clerkOrgId,
      isGlobal: true,
    },
    {
      title: "Global AI Agents Championship 2026",
      description: "Build autonomous, multi-agent frameworks that perform complex software engineering and research workflows.",
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      location: "Virtual / Global",
      organizerId: iitdStudents[1]?.id || students[1].id,
      organizerProfileId: clubMap["devclub-iitd"]?.id,
      organizationId: iitdOrg.id,
      orgId: iitdOrg.clerkOrgId,
      isGlobal: true,
    },
    {
      title: "TreeHacks 2026",
      description: "Stanford's premier collegiate hackathon with global tracks in Healthcare, AI, and ClimateTech.",
      date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
      location: "Stanford, CA & Virtual",
      organizerId: students[2].id,
      organizationId: orgMap["stanford"]?.id,
      orgId: orgMap["stanford"]?.clerkOrgId,
      isGlobal: true,
    },
    {
      title: "Cal Hacks 12.0",
      description: "The world's largest collegiate hackathon hosted at the historic Palace of Fine Arts.",
      date: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000),
      location: "San Francisco, CA & Remote",
      organizerId: bitsStudents[0]?.id || students[3].id,
      organizationId: orgMap["uc-berkeley"]?.id,
      orgId: orgMap["uc-berkeley"]?.clerkOrgId,
      isGlobal: true,
    },
    {
      title: "FinTech Frontier Hackathon 2026",
      description: "High-frequency trading engines, decentralized orderbooks, and predictive credit intelligence.",
      date: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000),
      location: "Mumbai, India & Virtual",
      organizerId: vitStudents[1]?.id || students[4].id,
      organizerProfileId: clubMap["csi-vit"]?.id,
      organizationId: vitOrg.id,
      orgId: vitOrg.clerkOrgId,
      isGlobal: true,
    },
  ];

  const createdEvents: any[] = [];
  for (const ev of eventsData) {
    const event = await prisma.event.create({
      data: ev,
    });
    createdEvents.push(event);
  }

  console.log(`   ✅ Seeded ${createdEvents.length} Hackathons (11 Campus-Scoped + 5 Global).`);
  return createdEvents;
}

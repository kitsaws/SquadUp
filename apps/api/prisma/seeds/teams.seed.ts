import { PrismaClient } from "@prisma/client";
import { TaxonomyService } from "../../src/taxonomy/taxonomy.service.js";
import { SeededStudent } from "./users.seed.js";

export async function seedTeams(
  prisma: PrismaClient,
  createdEvents: any[],
  createdStudents: SeededStudent[]
): Promise<number> {
  console.log("\n⚔️ Seeding 60+ Teams with Structured Roles & Offline AI Taxonomies...");

  const teamTemplates = [
    // Fullstack & Web
    {
      name: "CodeCrafters",
      roles: [
        { title: "Frontend Developer", skills: ["React", "TypeScript", "Tailwind CSS"], spots: 1 },
        { title: "Backend Developer", skills: ["FastAPI", "Python", "PostgreSQL"], spots: 1 },
        { title: "UI/UX Designer", skills: ["UI/UX Design", "Frontend Development"], spots: 1 },
      ],
    },
    {
      name: "Nexus Web Guild",
      roles: [
        { title: "Full Stack Engineer", skills: ["Next.js", "React", "TypeScript"], spots: 1 },
        { title: "Backend Specialist", skills: ["Node.js", "Express", "PostgreSQL"], spots: 1 },
      ],
    },
    {
      name: "PixelPioneers",
      roles: [
        { title: "Frontend Lead", skills: ["React", "TypeScript", "Tailwind CSS"], spots: 1 },
        { title: "Design Technologist", skills: ["UI/UX Design", "CSS", "React"], spots: 1 },
      ],
    },
    {
      name: "FullStack Titans",
      roles: [
        { title: "Frontend Developer", skills: ["Vue", "TypeScript"], spots: 1 },
        { title: "Backend Engineer", skills: ["FastAPI", "Python", "MongoDB"], spots: 1 },
      ],
    },
    {
      name: "API Architects",
      roles: [
        { title: "API Engineer", skills: ["Node.js", "Express", "PostgreSQL"], spots: 1 },
        { title: "DevOps Engineer", skills: ["Docker", "Linux", "Cloud Computing"], spots: 1 },
      ],
    },
    {
      name: "UI Vanguard",
      roles: [
        { title: "UI Architect", skills: ["Frontend Development", "React", "CSS"], spots: 1 },
        { title: "Product Designer", skills: ["UI/UX Design", "Figma"], spots: 1 },
      ],
    },

    // AI & Machine Learning
    {
      name: "NeuralSync AI",
      roles: [
        { title: "AI/ML Engineer", skills: ["PyTorch", "Python", "Deep Learning"], spots: 1 },
        { title: "Backend & ML Pipeline", skills: ["FastAPI", "Python", "Docker"], spots: 1 },
      ],
    },
    {
      name: "DeepVision Squad",
      roles: [
        { title: "Vision Researcher", skills: ["Computer Vision", "PyTorch", "Python"], spots: 1 },
        { title: "Deployment Engineer", skills: ["C++", "Python", "Docker"], spots: 1 },
      ],
    },
    {
      name: "PromptEngineers",
      roles: [
        { title: "GenAI Specialist", skills: ["Generative AI", "Python", "Natural Language Processing"], spots: 1 },
        { title: "Full Stack AI UI", skills: ["React", "TypeScript", "FastAPI"], spots: 1 },
      ],
    },
    {
      name: "NLP Navigators",
      roles: [
        { title: "NLP Engineer", skills: ["Natural Language Processing", "Python", "PyTorch"], spots: 1 },
        { title: "Data Pipeline Lead", skills: ["Python", "PostgreSQL", "Docker"], spots: 1 },
      ],
    },
    {
      name: "AgentForge",
      roles: [
        { title: "Agentic Systems Architect", skills: ["Python", "Generative AI", "Machine Learning"], spots: 1 },
        { title: "Backend Engineer", skills: ["FastAPI", "Docker", "Redis"], spots: 1 },
      ],
    },
    {
      name: "TensorTribe",
      roles: [
        { title: "Deep Learning Engineer", skills: ["TensorFlow", "Python", "Deep Learning"], spots: 1 },
        { title: "MLOps Lead", skills: ["Docker", "Python", "Cloud Computing"], spots: 1 },
      ],
    },

    // Cloud, DevOps & Distributed Systems
    {
      name: "CloudSurfers",
      roles: [
        { title: "Cloud Architect", skills: ["Docker", "Kubernetes", "AWS"], spots: 1 },
        { title: "DevOps Engineer", skills: ["Linux", "DevOps", "Docker"], spots: 1 },
      ],
    },
    {
      name: "ByteForce Systems",
      roles: [
        { title: "Systems Engineer", skills: ["Rust", "C++", "Linux"], spots: 1 },
        { title: "Distributed Systems Lead", skills: ["Distributed Systems", "Go", "Docker"], spots: 1 },
      ],
    },
    {
      name: "Kubernetes Knights",
      roles: [
        { title: "Kubernetes Engineer", skills: ["Kubernetes", "Docker", "Go"], spots: 1 },
        { title: "Infrastructure SRE", skills: ["DevOps", "Linux", "Cloud Computing"], spots: 1 },
      ],
    },
    {
      name: "GopherSquad",
      roles: [
        { title: "Go Microservices Lead", skills: ["Go", "PostgreSQL", "Docker"], spots: 1 },
        { title: "Distributed Storage Engineer", skills: ["Go", "Redis", "Linux"], spots: 1 },
      ],
    },
    {
      name: "ScaleMasters",
      roles: [
        { title: "Backend Scalability Engineer", skills: ["Backend Development", "PostgreSQL", "Redis"], spots: 1 },
        { title: "Database Architect", skills: ["PostgreSQL", "Distributed Systems", "Docker"], spots: 1 },
      ],
    },

    // Mobile Development
    {
      name: "FlutterFlow",
      roles: [
        { title: "Flutter Developer", skills: ["Flutter", "Dart", "Firebase"], spots: 1 },
        { title: "Mobile UI Designer", skills: ["UI/UX Design", "Flutter"], spots: 1 },
      ],
    },
    {
      name: "AppVenturers",
      roles: [
        { title: "React Native Lead", skills: ["React Native", "TypeScript", "React"], spots: 1 },
        { title: "Backend API Engineer", skills: ["Node.js", "Express", "PostgreSQL"], spots: 1 },
      ],
    },
    {
      name: "NativePulse",
      roles: [
        { title: "Android Specialist", skills: ["Android", "Kotlin"], spots: 1 },
        { title: "Backend Developer", skills: ["FastAPI", "Python", "Docker"], spots: 1 },
      ],
    },

    // Security & Web3
    {
      name: "CyberWardens",
      roles: [
        { title: "Security Analyst", skills: ["Cybersecurity", "Network Security", "Linux"], spots: 1 },
        { title: "Reverse Engineer", skills: ["C++", "Cybersecurity", "Linux"], spots: 1 },
      ],
    },
    {
      name: "ZeroDay Hunters",
      roles: [
        { title: "Vulnerability Researcher", skills: ["Cybersecurity", "Python", "Linux"], spots: 1 },
        { title: "SecOps Engineer", skills: ["Network Security", "Docker", "Linux"], spots: 1 },
      ],
    },
    {
      name: "BlockBuilders",
      roles: [
        { title: "Smart Contract Engineer", skills: ["Blockchain", "Solidity", "Ethereum"], spots: 1 },
        { title: "Rust Protocol Developer", skills: ["Rust", "Blockchain", "Distributed Systems"], spots: 1 },
      ],
    },
    {
      name: "DecentralSquad",
      roles: [
        { title: "dApp Frontend Lead", skills: ["Blockchain", "React", "TypeScript"], spots: 1 },
        { title: "Web3 Integration Engineer", skills: ["Solidity", "Node.js", "TypeScript"], spots: 1 },
      ],
    },
  ];

  let totalTeamsCreated = 0;

  for (let eventIdx = 0; eventIdx < createdEvents.length; eventIdx++) {
    const currentEvent = createdEvents[eventIdx];
    const isGlobal = currentEvent.isGlobal;
    const teamsForThisEvent = isGlobal ? 4 : 3;

    for (let t = 0; t < teamsForThisEvent; t++) {
      const templateIdx = (eventIdx * 3 + t) % teamTemplates.length;
      const template = teamTemplates[templateIdx];

      // Select leader
      let leader = createdStudents[(eventIdx * 2 + t) % createdStudents.length];
      let teamUni = leader.profile.university;

      if (!isGlobal && currentEvent.organizationId) {
        const campusStudents = createdStudents.filter(
          (s) => s.profile.university === currentEvent.location || s.orgSlug === (eventIdx < 5 ? "tiet" : eventIdx < 8 ? "bits-pilani" : eventIdx < 11 ? "vit-vellore" : "iit-delhi")
        );
        if (campusStudents.length > 0) {
          leader = campusStudents[t % campusStudents.length];
          teamUni = leader.profile.university;
        }
      }

      const teamName = isGlobal
        ? `${template.name} [${currentEvent.title.split(" ")[0]}]`
        : `${template.name} #${t + 1}`;

      const allReqs = [...new Set(template.roles.flatMap((r) => r.skills))];
      const resolvedRoleTax = TaxonomyService.resolveTeamRoles(template.roles);

      const team = await prisma.team.create({
        data: {
          name: teamName,
          eventId: currentEvent.id,
          orgId: currentEvent.orgId || null,
          organizationId: currentEvent.organizationId || null,
          requirements: allReqs,
          university: teamUni,
          members: {
            create: {
              userId: leader.id,
              role: "Leader",
            },
          },
          roles: {
            create: template.roles.map((r, idx) => ({
              title: r.title,
              skills: r.skills,
              spots: r.spots ?? 1,
              assignedToId: idx === 0 ? leader.id : null,
            })),
          },
        },
      });

      // Add a 2nd member to some teams
      if ((t + eventIdx) % 2 === 0) {
        const memberUser = createdStudents[(t + 5 + eventIdx) % createdStudents.length];
        if (memberUser.id !== leader.id) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: memberUser.id,
              role: "Member",
            },
          });
        }
      }

      // Save system-calculated TeamTaxonomy
      await prisma.teamTaxonomy.create({
        data: {
          teamId: team.id,
          requirementNodeIds: resolvedRoleTax.requirementNodeIds,
          rawRequirements: allReqs,
          roleTaxonomies: resolvedRoleTax.roleTaxonomies as any,
        },
      });

      // Create a pending application on first few teams
      if (t === 0 && eventIdx < 6) {
        const applicant = createdStudents[(eventIdx + 7) % createdStudents.length];
        if (applicant.id !== leader.id) {
          await prisma.teamApplication.create({
            data: {
              teamId: team.id,
              userId: applicant.id,
              message: `Hi! I'm excited to collaborate for ${currentEvent.title}. I have strong background in ${applicant.profile.skills.slice(0, 3).join(", ")}.`,
              status: "PENDING",
            },
          });
        }
      }

      totalTeamsCreated++;
    }
  }

  console.log(`   ✅ Seeded ${totalTeamsCreated} Teams with structured roles, taxonomies, and candidate applications.`);
  return totalTeamsCreated;
}

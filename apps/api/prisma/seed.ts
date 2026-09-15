import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function main() {
  console.log("🌱 Starting SquadUp Database Seeding...\n");

  // =========================================================================
  // 1. ORGANIZATIONS (UNIVERSITIES)
  // =========================================================================
  console.log("🏫 Creating Organizations (Universities)...");

  const tietOrg = await prisma.organization.upsert({
    where: { clerkOrgId: "org_3IHwqmkzEfISGzP4JQGimqIz8WM" },
    update: {
      name: "TIET",
      slug: "tiet",
      domain: "thapar.edu",
      location: "Patiala, Punjab, India",
    },
    create: {
      clerkOrgId: "org_3IHwqmkzEfISGzP4JQGimqIz8WM",
      name: "TIET",
      slug: "tiet",
      domain: "thapar.edu",
      logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
      location: "Patiala, Punjab, India",
    },
  });

  const stanfordOrg = await prisma.organization.upsert({
    where: { clerkOrgId: "org_stanford_univ_2026" },
    update: {},
    create: {
      clerkOrgId: "org_stanford_univ_2026",
      name: "Stanford University",
      slug: "stanford",
      domain: "stanford.edu",
      logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&h=200&fit=crop",
      location: "Stanford, CA, USA",
    },
  });

  const berkeleyOrg = await prisma.organization.upsert({
    where: { clerkOrgId: "org_uc_berkeley_2026" },
    update: {},
    create: {
      clerkOrgId: "org_uc_berkeley_2026",
      name: "University of California, Berkeley",
      slug: "berkeley",
      domain: "berkeley.edu",
      logoUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200&h=200&fit=crop",
      location: "Berkeley, CA, USA",
    },
  });

  console.log(`   ✅ Seeded 3 Organizations (including TIET: ${tietOrg.clerkOrgId})`);

  // =========================================================================
  // 2. SEED USERS & PROFILES
  // =========================================================================
  console.log("\n👥 Creating Users & AI Profiles...");

  const rawUsers = [
    // TIET Students & Organizers
    {
      clerkId: "user_tiet_aarav_sharma",
      email: "aarav.sharma@thapar.edu",
      name: "Aarav Sharma",
      university: "TIET",
      title: "Full Stack & Distributed Systems Enthusiast",
      summary: "3rd year COE student at TIET. Passionate about building high-throughput backend APIs with Node.js and FastAPI.",
      skills: ["React", "Node.js", "FastAPI", "PostgreSQL", "Docker"],
      taxonomyNodes: ["react", "nodejs", "fastapi", "postgresql", "docker", "web_development", "backend_development"],
    },
    {
      clerkId: "user_tiet_riya_patel",
      email: "riya.patel@thapar.edu",
      name: "Riya Patel",
      university: "TIET",
      title: "AI/ML Researcher & Deep Learning Specialist",
      summary: "Working on LLM fine-tuning and Computer Vision pipelines. Winner of Makeathon 6.0.",
      skills: ["Python", "PyTorch", "TensorFlow", "Computer Vision", "FastAPI"],
      taxonomyNodes: ["python", "pytorch", "tensorflow", "computer_vision", "fastapi", "machine_learning", "deep_learning"],
    },
    {
      clerkId: "user_tiet_kabir_mehta",
      email: "kabir.mehta@thapar.edu",
      name: "Kabir Mehta",
      university: "TIET",
      title: "Lead Frontend Engineer & UI/UX Designer",
      summary: "Crafting silky smooth micro-interactions and performant web apps in React, Next.js, and Figma.",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "UI/UX Design"],
      taxonomyNodes: ["react", "typescript", "frontend_development", "web_development", "ui_ux_design"],
    },
    {
      clerkId: "user_tiet_ananya_gupta",
      email: "ananya.gupta@thapar.edu",
      name: "Ananya Gupta",
      university: "TIET",
      title: "Cloud Native & DevOps Engineer",
      summary: "Kubernetes, Docker, Terraform, and CI/CD pipelines. Core team member at GDSC TIET.",
      skills: ["Docker", "Kubernetes", "AWS", "Go", "Linux"],
      taxonomyNodes: ["docker", "kubernetes", "cloud_devops", "go", "linux", "cloud_computing"],
    },
    {
      clerkId: "user_tiet_rohan_singh",
      email: "rohan.singh@thapar.edu",
      name: "Rohan Singh",
      university: "TIET",
      title: "Mobile App Developer & Flutter Specialist",
      summary: "Building cross-platform mobile apps for millions of users. Active open source contributor.",
      skills: ["Flutter", "Dart", "Firebase", "Android", "REST APIs"],
      taxonomyNodes: ["flutter", "mobile_development", "android", "software_development"],
    },
    {
      clerkId: "user_tiet_sanya_verma",
      email: "sanya.verma@thapar.edu",
      name: "Sanya Verma",
      university: "TIET",
      title: "Cybersecurity Analyst & Ethical Hacker",
      summary: "President at OWASP TIET. CTF player and security researcher specializing in web penetration testing.",
      skills: ["Cybersecurity", "Network Security", "Python", "Linux", "Penetration Testing"],
      taxonomyNodes: ["cybersecurity", "python", "linux", "network_security"],
    },
    {
      clerkId: "user_tiet_aditya_kumar",
      email: "aditya.kumar@thapar.edu",
      name: "Aditya Kumar",
      university: "TIET",
      title: "Web3 & Blockchain Architect",
      summary: "Solidity, Ethereum, smart contract auditing, and zero-knowledge proofs.",
      skills: ["Blockchain", "Solidity", "Rust", "Ethereum", "TypeScript"],
      taxonomyNodes: ["blockchain", "rust", "typescript", "software_development"],
    },
    {
      clerkId: "user_tiet_meera_nair",
      email: "meera.nair@thapar.edu",
      name: "Meera Nair",
      university: "TIET",
      title: "Data Scientist & NLP Engineer",
      summary: "Transformer architectures, Hugging Face, vector databases, and semantic search.",
      skills: ["Python", "Natural Language Processing", "PyTorch", "SQL", "Pandas"],
      taxonomyNodes: ["python", "natural_language_processing", "pytorch", "data_systems", "machine_learning"],
    },

    // Stanford & Global Organizers / Students
    {
      clerkId: "user_stanford_david_chen",
      email: "dchen@stanford.edu",
      name: "David Chen",
      university: "Stanford University",
      title: "TreeHacks Lead Organizer & Distributed Systems Engineer",
      summary: "Organizing TreeHacks 2026. Researching Raft consensus and high-performance databases.",
      skills: ["Rust", "Go", "Distributed Systems", "PostgreSQL", "Docker"],
      taxonomyNodes: ["rust", "go", "postgresql", "docker", "distributed_systems", "backend_development"],
    },
    {
      clerkId: "user_stanford_elena_rostova",
      email: "erostova@stanford.edu",
      name: "Elena Rostova",
      university: "Stanford University",
      title: "Generative AI Systems Researcher",
      summary: "Diffusion models, autonomous multi-agent systems, and model optimization.",
      skills: ["Python", "PyTorch", "Generative AI", "C++", "FastAPI"],
      taxonomyNodes: ["python", "pytorch", "generative_ai", "cpp", "fastapi", "ai_machine_learning"],
    },
    {
      clerkId: "user_berkeley_marcus_vance",
      email: "mvance@berkeley.edu",
      name: "Marcus Vance",
      university: "University of California, Berkeley",
      title: "Cal Hacks Director & Full Stack Engineer",
      summary: "Building community and hackathons. Full stack TypeScript and GraphQL wizard.",
      skills: ["React", "TypeScript", "Node.js", "GraphQL", "PostgreSQL"],
      taxonomyNodes: ["react", "typescript", "nodejs", "postgresql", "frontend_development", "web_development"],
    },
    {
      clerkId: "user_global_sophia_martinez",
      email: "sophia.martinez@mit.edu",
      name: "Sophia Martinez",
      university: "MIT",
      title: "Quantum Algorithms & Robotics Developer",
      summary: "Intersection of robotics, computer vision, and ROS2.",
      skills: ["C++", "Python", "ROS", "Computer Vision", "Linux"],
      taxonomyNodes: ["cpp", "python", "computer_vision", "linux", "software_development"],
    },
  ];

  const createdUsers: any[] = [];
  for (const u of rawUsers) {
    const user = await prisma.user.upsert({
      where: { clerkId: u.clerkId },
      update: { name: u.name, email: u.email },
      create: {
        clerkId: u.clerkId,
        email: u.email,
        name: u.name,
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        university: u.university,
        title: u.title,
        summary: u.summary,
        skills: u.skills,
      },
      create: {
        userId: user.id,
        university: u.university,
        title: u.title,
        summary: u.summary,
        skills: u.skills,
      },
    });

    await prisma.userTaxonomy.upsert({
      where: { userId: user.id },
      update: {
        taxonomyNodeIds: u.taxonomyNodes,
        rawSkills: u.skills,
      },
      create: {
        userId: user.id,
        taxonomyNodeIds: u.taxonomyNodes,
        rawSkills: u.skills,
      },
    });

    createdUsers.push({ ...user, profile: u });
  }

  console.log(`   ✅ Seeded ${createdUsers.length} Users with AI Profiles and Taxonomies`);

  const tietUser1 = createdUsers[0]; // Aarav Sharma
  const tietUser2 = createdUsers[1]; // Riya Patel
  const tietUser3 = createdUsers[2]; // Kabir Mehta
  const stanfordUser = createdUsers[8]; // David Chen
  const berkeleyUser = createdUsers[10]; // Marcus Vance

  // =========================================================================
  // 3. SUB-ORGANIZERS (CLUBS & SOCIETIES)
  // =========================================================================
  console.log("\n🏛️ Creating Sub-Organizers (Clubs/Societies)...");

  const tietClubsData = [
    {
      name: "ACM TIET Student Chapter",
      slug: "acm-tiet",
      description: "Premier student chapter of the Association for Computing Machinery at TIET.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: tietUser1.id,
      email: "acm@thapar.edu",
    },
    {
      name: "MLSC TIET",
      slug: "mlsc-tiet",
      description: "Microsoft Learn Student Chapter at TIET. Hosts Makeathon flagship hackathons.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: tietUser2.id,
      email: "mlsc@thapar.edu",
    },
    {
      name: "OWASP TIET Chapter",
      slug: "owasp-tiet",
      description: "Cybersecurity and open web application security community at Thapar Institute.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: tietUser3.id,
      email: "owasp@thapar.edu",
    },
    {
      name: "GDSC TIET",
      slug: "gdsc-tiet",
      description: "Google Developer Student Club at TIET. Accelerating student developer potential.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: tietUser1.id,
      email: "gdsc@thapar.edu",
    },
    {
      name: "Creative Computing Society (CCS)",
      slug: "ccs-tiet",
      description: "The official computing and design society at Thapar. Organizers of HackTU.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: tietUser3.id,
      email: "ccs@thapar.edu",
    },
  ];

  const createdClubs: any[] = [];
  for (const c of tietClubsData) {
    const club = await prisma.organizer.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        orgId: c.orgId,
        organizationId: c.organizationId,
        ownerId: c.ownerId,
        email: c.email,
        members: {
          create: {
            userId: c.ownerId,
            role: "ADMIN",
          },
        },
      },
    });
    createdClubs.push(club);
  }

  // Stanford & Berkeley Clubs
  const treehacksClub = await prisma.organizer.upsert({
    where: { slug: "treehacks-committee" },
    update: {},
    create: {
      name: "TreeHacks Organizing Committee",
      slug: "treehacks-committee",
      description: "The team organizing Stanford's premier collegiate hackathon.",
      orgId: stanfordOrg.clerkOrgId,
      organizationId: stanfordOrg.id,
      ownerId: stanfordUser.id,
      email: "team@treehacks.com",
      members: {
        create: {
          userId: stanfordUser.id,
          role: "ADMIN",
        },
      },
    },
  });

  const calhacksClub = await prisma.organizer.upsert({
    where: { slug: "calhacks-team" },
    update: {},
    create: {
      name: "Cal Hacks Organizing Team",
      slug: "calhacks-team",
      description: "UC Berkeley student-led organization hosting the world's largest collegiate hackathon.",
      orgId: berkeleyOrg.clerkOrgId,
      organizationId: berkeleyOrg.id,
      ownerId: berkeleyUser.id,
      email: "team@calhacks.io",
      members: {
        create: {
          userId: berkeleyUser.id,
          role: "ADMIN",
        },
      },
    },
  });

  console.log(`   ✅ Seeded ${createdClubs.length + 2} Sub-Organizers / Clubs`);

  // =========================================================================
  // 4. SEED 20 EVENTS (TIET + GLOBAL)
  // =========================================================================
  console.log("\n📅 Creating 20 Events...");

  const eventsData = [
    // --- 8 TIET EVENTS (Scoped to TIET orgId) ---
    {
      title: "Makeathon 7.0",
      description: "TIET's flagship 36-hour hackathon hosted by MLSC TIET. Build breakthrough software and hardware solutions with tracks in AI, FinTech, and IoT.",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // in 14 days
      location: "Thapar Institute of Engineering & Technology, Patiala",
      organizerId: tietUser2.id,
      organizerProfileId: createdClubs[1].id, // MLSC
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "HackTU 6.0",
      description: "North India's largest annual collegiate hackathon organized by Creative Computing Society (CCS). High energy 24-hour sprint.",
      date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      location: "TIET Main Auditorium, Patiala",
      organizerId: tietUser3.id,
      organizerProfileId: createdClubs[4].id, // CCS
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "CyberSurge 2026: TIET CTF & Security Sprint",
      description: "24-hour Capture-The-Flag and defensive cybersecurity challenge organized by OWASP TIET. Real-world penetration testing and crypto challenges.",
      date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      location: "TIET Computer Labs, Patiala",
      organizerId: tietUser3.id,
      organizerProfileId: createdClubs[2].id, // OWASP
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "DevSprint TIET: FullStack Productathon",
      description: "A rapid 24-hour product development sprint by GDSC TIET. Turn ideas into working web and mobile apps with industry mentors.",
      date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      location: "Library Hall, TIET, Patiala",
      organizerId: tietUser1.id,
      organizerProfileId: createdClubs[3].id, // GDSC
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "CodeHers TIET 2026",
      description: "A vibrant women-in-tech hackathon organized by ACM TIET, fostering diversity, innovation, and leadership in software engineering.",
      date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
      location: "Niranjan Hall, TIET, Patiala",
      organizerId: tietUser1.id,
      organizerProfileId: createdClubs[0].id, // ACM
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "TIET Web3 BUIDL-a-thon",
      description: "Decentralized applications, smart contract security, and crypto architecture sprint. Sponsored by top blockchain foundations.",
      date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      location: "TIET Patiala",
      organizerId: tietUser1.id,
      organizerProfileId: createdClubs[0].id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: true, // Global collaboration hosted at TIET
    },
    {
      title: "TIET AI Innovation Summit & Hack",
      description: "Cutting edge Generative AI, RAG pipelines, autonomous agents, and multi-modal models showcase.",
      date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      location: "TIET Patiala",
      organizerId: tietUser2.id,
      organizerProfileId: createdClubs[1].id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "Udgosh TechFest 2026: Code Challenge",
      description: "Inter-branch engineering championship celebrating software, algorithmic speed, and data structures.",
      date: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      location: "TIET Patiala",
      organizerId: tietUser3.id,
      organizerProfileId: createdClubs[4].id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },

    // --- 12 GLOBAL & INTER-UNIVERSITY EVENTS ---
    {
      title: "TreeHacks 2026",
      description: "Stanford's premier collegiate hackathon. Over 1,500 builders hacking on Healthcare, Climate, Education, and AI.",
      date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      location: "Stanford University, Palo Alto, CA",
      organizerId: stanfordUser.id,
      organizerProfileId: treehacksClub.id,
      orgId: stanfordOrg.clerkOrgId,
      organizationId: stanfordOrg.id,
      isGlobal: true,
    },
    {
      title: "Cal Hacks 12.0",
      description: "The world's largest collegiate hackathon hosted by UC Berkeley at the historic San Francisco Palace of Fine Arts.",
      date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      location: "San Francisco, CA, USA",
      organizerId: berkeleyUser.id,
      organizerProfileId: calhacksClub.id,
      orgId: berkeleyOrg.clerkOrgId,
      organizationId: berkeleyOrg.id,
      isGlobal: true,
    },
    {
      title: "Global AI Agents Championship 2026",
      description: "Build autonomous, multi-agent frameworks that perform complex software engineering and research tasks without human intervention.",
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      location: "Virtual / Global",
      organizerId: stanfordUser.id,
      isGlobal: true,
    },
    {
      title: "HackMIT 2026: Next-Gen Computing",
      description: "MIT's weekend-long celebration of invention and code, connecting talented students across continents.",
      date: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000),
      location: "Cambridge, MA, USA",
      organizerId: stanfordUser.id,
      isGlobal: true,
    },
    {
      title: "Global ClimateTech & Sustainability Hackathon",
      description: "Leverage satellite data, machine learning, and clean energy optimization to combat carbon emissions.",
      date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      location: "Hybrid (Palo Alto & Remote)",
      organizerId: stanfordUser.id,
      isGlobal: true,
    },
    {
      title: "FinTech Frontier: Algorithmic Markets Hack",
      description: "High-frequency trading engines, decentralized orderbooks, and predictive credit scoring algorithms.",
      date: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000),
      location: "New York, NY & Virtual",
      organizerId: berkeleyUser.id,
      isGlobal: true,
    },
    {
      title: "HealthHack Global 2026",
      description: "Revolutionizing digital diagnostics, medical imaging AI, and electronic health record interoperability.",
      date: new Date(Date.now() + 65 * 24 * 60 * 60 * 1000),
      location: "Boston, MA & Virtual",
      organizerId: stanfordUser.id,
      isGlobal: true,
    },
    {
      title: "Autonomous Robotics & Vision Sprint",
      description: "Computer vision, ROS2, SLAM navigation, and sensor fusion for robotic manipulation and drones.",
      date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      location: "Berkeley, CA & Remote",
      organizerId: berkeleyUser.id,
      isGlobal: true,
    },
    {
      title: "Open Source Founders Weekend",
      description: "Turn your open-source tools into sustainable ventures. Mentorship from YC alumni and top devtool founders.",
      date: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
      location: "Online / Global",
      organizerId: tietUser1.id,
      isGlobal: true,
    },
    {
      title: "CyberShield Global CTF Championship",
      description: "International cybersecurity competition testing binary exploitation, reverse engineering, and web defense.",
      date: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000),
      location: "Virtual",
      organizerId: tietUser3.id,
      isGlobal: true,
    },
    {
      title: "Quantum Leap Computing Challenge",
      description: "Explore quantum annealing, Qiskit circuits, and quantum machine learning algorithms.",
      date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      location: "Virtual / Global",
      organizerId: stanfordUser.id,
      isGlobal: true,
    },
    {
      title: "FullStack Distributed Systems Marathon",
      description: "High concurrency, event-driven architectures, WebSocket streams, and zero-downtime database scaling.",
      date: new Date(Date.now() + 95 * 24 * 60 * 60 * 1000),
      location: "Global Virtual",
      organizerId: berkeleyUser.id,
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

  console.log(`   ✅ Seeded ${createdEvents.length} Events (8 at TIET, 12 Global/Inter-University)`);

  // =========================================================================
  // 5. SEED 65 TEAMS WITH DYNAMIC REQUIREMENTS & TAXONOMY
  // =========================================================================
  console.log("\n⚔️ Creating 65 Teams with Dynamic Requirements & Taxonomies...");

  // Curated list of realistic team templates with dynamic requirements
  const teamTemplates = [
    // Fullstack & Web
    { name: "CodeCrafters TIET", reqs: ["React", "FastAPI", "UI/UX Design"], nodes: ["react", "fastapi", "ui_ux_design"] },
    { name: "Nexus Web Guild", reqs: ["Next.js", "Node.js", "PostgreSQL"], nodes: ["react", "nodejs", "postgresql"] },
    { name: "PixelPioneers", reqs: ["React", "TypeScript", "Tailwind CSS"], nodes: ["react", "typescript", "frontend_development"] },
    { name: "FullStack Titans", reqs: ["Vue", "FastAPI", "MongoDB"], nodes: ["vue", "fastapi", "mongodb"] },
    { name: "API Architects", reqs: ["Node.js", "Express", "PostgreSQL", "Docker"], nodes: ["nodejs", "express", "postgresql", "docker"] },
    { name: "UI Vanguard", reqs: ["Frontend Development", "UI/UX Design", "React"], nodes: ["frontend_development", "ui_ux_design", "react"] },

    // AI & Machine Learning
    { name: "NeuralSync AI", reqs: ["PyTorch", "Python", "FastAPI"], nodes: ["pytorch", "python", "fastapi"] },
    { name: "DeepVision Squad", reqs: ["Computer Vision", "Python", "PyTorch"], nodes: ["computer_vision", "python", "pytorch"] },
    { name: "PromptEngineers", reqs: ["Generative AI", "Python", "React"], nodes: ["generative_ai", "python", "react"] },
    { name: "NLP Navigators", reqs: ["Natural Language Processing", "Python", "PyTorch"], nodes: ["natural_language_processing", "python", "pytorch"] },
    { name: "AgentForge", reqs: ["Python", "FastAPI", "Docker", "Machine Learning"], nodes: ["python", "fastapi", "docker", "machine_learning"] },
    { name: "TensorTribe", reqs: ["TensorFlow", "Deep Learning", "Python"], nodes: ["tensorflow", "deep_learning", "python"] },

    // Cloud, DevOps & Distributed Systems
    { name: "CloudSurfers", reqs: ["Docker", "Kubernetes", "AWS"], nodes: ["docker", "kubernetes", "cloud_computing"] },
    { name: "ByteForce Systems", reqs: ["Rust", "Distributed Systems", "Docker"], nodes: ["rust", "distributed_systems", "docker"] },
    { name: "Kubernetes Knights", reqs: ["DevOps", "Kubernetes", "Go"], nodes: ["cloud_devops", "kubernetes", "go"] },
    { name: "GopherSquad", reqs: ["Go", "PostgreSQL", "Docker"], nodes: ["go", "postgresql", "docker"] },
    { name: "ScaleMasters", reqs: ["Backend Development", "PostgreSQL", "Redis"], nodes: ["backend_development", "postgresql", "databases"] },

    // Mobile Development
    { name: "FlutterFlow TIET", reqs: ["Flutter", "Dart", "Firebase"], nodes: ["flutter", "mobile_development"] },
    { name: "AppVenturers", reqs: ["React Native", "TypeScript", "Node.js"], nodes: ["react", "typescript", "nodejs"] },
    { name: "NativePulse", reqs: ["Android", "Kotlin", "FastAPI"], nodes: ["android", "mobile_development", "fastapi"] },

    // Security & Web3
    { name: "CyberWardens", reqs: ["Cybersecurity", "Network Security", "Linux"], nodes: ["cybersecurity", "network_security", "linux"] },
    { name: "ZeroDay Hunters", reqs: ["Cybersecurity", "Python", "Linux"], nodes: ["cybersecurity", "python", "linux"] },
    { name: "BlockBuilders TIET", reqs: ["Blockchain", "Solidity", "Rust"], nodes: ["blockchain", "rust", "software_development"] },
    { name: "DecentralSquad", reqs: ["Blockchain", "TypeScript", "React"], nodes: ["blockchain", "typescript", "react"] },
  ];

  let totalTeamsCreated = 0;

  // We assign teams across the 20 events
  // Events 0..7 are TIET events -> will get ~30 teams with TIET orgId
  // Events 8..19 are Global events -> will get ~35 teams
  for (let eventIndex = 0; eventIndex < createdEvents.length; eventIndex++) {
    const currentEvent = createdEvents[eventIndex];
    const isTietEvent = eventIndex < 8;

    // Number of teams for this event: 3 to 4
    const teamsCountForThisEvent = isTietEvent ? (eventIndex % 2 === 0 ? 4 : 3) : 3;

    for (let t = 0; t < teamsCountForThisEvent; t++) {
      const templateIndex = (eventIndex * 3 + t) % teamTemplates.length;
      const template = teamTemplates[templateIndex];

      const teamName = isTietEvent
        ? `${template.name} #${t + 1}`
        : `${template.name} [${currentEvent.title.split(" ")[0]}]`;

      // Assign leader from user pool
      const leader = isTietEvent
        ? createdUsers[t % 8] // Pick from TIET students
        : createdUsers[t % createdUsers.length]; // Pick from global pool

      const universityName = isTietEvent ? "TIET" : leader.profile.university;

      const team = await prisma.team.create({
        data: {
          name: teamName,
          eventId: currentEvent.id,
          orgId: currentEvent.orgId || null,
          organizationId: currentEvent.organizationId || null,
          requirements: template.reqs,
          university: universityName,
          members: {
            create: {
              userId: leader.id,
              role: "Leader",
            },
          },
        },
      });

      // Optionally add a 2nd member to some teams
      if ((t + eventIndex) % 2 === 0) {
        const memberUser = createdUsers[(t + 3) % createdUsers.length];
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

      // Create decoupled TeamTaxonomy record
      await prisma.teamTaxonomy.create({
        data: {
          teamId: team.id,
          requirementNodeIds: template.nodes,
          rawRequirements: template.reqs,
        },
      });

      totalTeamsCreated++;
    }
  }

  console.log(`   ✅ Seeded ${totalTeamsCreated} Teams with dynamic requirements, members, and TeamTaxonomies`);

  // =========================================================================
  // 6. INVALIDATE REDIS CACHE
  // =========================================================================
  console.log("\n🧹 Invalidating Redis Cache...");
  try {
    const keys = await redis.keys("events:*");
    const teamKeys = await redis.keys("teams:*");
    const allKeys = [...keys, ...teamKeys];
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
      console.log(`   ✅ Flushed ${allKeys.length} stale Redis cache keys.`);
    } else {
      console.log("   ✅ Redis cache was already clean.");
    }
  } catch (err: any) {
    console.warn("   ⚠️ Redis flush warning (continuing):", err.message);
  }

  console.log("\n=========================================================");
  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log(`🏫 Organizations: 3 (TIET: ${tietOrg.clerkOrgId})`);
  console.log(`🏛️ Sub-Organizers: ${createdClubs.length + 2} Clubs/Societies`);
  console.log(`👥 Users & Profiles: ${createdUsers.length}`);
  console.log(`📅 Events: ${createdEvents.length} (8 TIET + 12 Global)`);
  console.log(`⚔️ Teams: ${totalTeamsCreated} (with dynamic taxonomy requirements)`);
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

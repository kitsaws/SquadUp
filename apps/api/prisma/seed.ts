import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { TaxonomyService } from "../src/taxonomy/taxonomy.service.js";

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function main() {
  console.log("🌱 Starting SquadUp Database Seeding for Product Pitch...\n");

  // =========================================================================
  // 1. ORGANIZATIONS (UNIVERSITIES LINKED TO CLERK ORG IDs)
  // =========================================================================
  console.log("🏫 Creating 4 Verified University Organizations...");

  const orgsData = [
    {
      clerkOrgId: "org_3IHwqmkzEfISGzP4JQGimqIz8WM",
      name: "Thapar Institute of Engineering and Technology, Patiala",
      slug: "tiet",
      domain: "thapar.edu",
      location: "Patiala, Punjab, India",
      logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
    },
    {
      clerkOrgId: "org_3JQVBHND2wFmpI3bj5UDt1RN1Ox",
      name: "BITS Pilani",
      slug: "bits-pilani",
      domain: "pilani.bits-pilani.ac.in",
      location: "Pilani, Rajasthan, India",
      logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&h=200&fit=crop",
    },
    {
      clerkOrgId: "org_3JQUvvNw3HUuVOdvT0Degv4aUg4",
      name: "VIT Vellore",
      slug: "vit-vellore",
      domain: "vit.ac.in",
      location: "Vellore, Tamil Nadu, India",
      logoUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200&h=200&fit=crop",
    },
    {
      clerkOrgId: "org_3JQUuDymGDy0LSpF4pXCbxV6rii",
      name: "IIT Delhi",
      slug: "iit-delhi",
      domain: "iitd.ac.in",
      location: "New Delhi, Delhi, India",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=200&h=200&fit=crop",
    },
    {
      clerkOrgId: "org_seed_stanford",
      name: "Stanford University",
      slug: "stanford",
      domain: "stanford.edu",
      location: "Stanford, CA, USA",
      logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&h=200&fit=crop",
    },
    {
      clerkOrgId: "org_seed_ucberkeley",
      name: "UC Berkeley",
      slug: "uc-berkeley",
      domain: "berkeley.edu",
      location: "Berkeley, CA, USA",
      logoUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200&h=200&fit=crop",
    },
  ];

  const orgMap: Record<string, any> = {};
  for (const o of orgsData) {
    const org = await prisma.organization.upsert({
      where: { clerkOrgId: o.clerkOrgId },
      update: {
        name: o.name,
        slug: o.slug,
        domain: o.domain,
        location: o.location,
        logoUrl: o.logoUrl,
      },
      create: {
        clerkOrgId: o.clerkOrgId,
        name: o.name,
        slug: o.slug,
        domain: o.domain,
        location: o.location,
        logoUrl: o.logoUrl,
      },
    });
    orgMap[o.slug] = org;
    console.log(`   ✅ Synced Organization: ${org.name} (${org.clerkOrgId})`);
  }

  const tietOrg = orgMap["tiet"];
  const bitsOrg = orgMap["bits-pilani"];
  const vitOrg = orgMap["vit-vellore"];
  const iitdOrg = orgMap["iit-delhi"];

  // =========================================================================
  // 2. PRESENTER USER (SWASTIK NAGPAL)
  // =========================================================================
  console.log("\n👤 Ensuring Presenter Account (Swastik Nagpal)...");

  const presenterClerkId = process.env.SEED_PRESENTER_CLERK_ID || "user_3JNnb2vmTMZz3dTHLk5iXdgahTf";
  const presenterEmail = process.env.ADMIN_EMAIL || process.env.SEED_PRESENTER_EMAIL || "admin@squadup.dev";
  const presenterName = process.env.SEED_PRESENTER_NAME || "Swastik Nagpal";

  let presenterUser = await prisma.user.findUnique({
    where: { clerkId: presenterClerkId },
    include: { profile: true },
  });

  if (!presenterUser) {
    presenterUser = await prisma.user.create({
      data: {
        clerkId: presenterClerkId,
        email: presenterEmail,
        name: presenterName,
      },
      include: { profile: true },
    });
  }

  // Ensure Organization Membership at TIET
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: tietOrg.id,
        userId: presenterUser.id,
      },
    },
    update: { role: "org:admin" },
    create: {
      organizationId: tietOrg.id,
      userId: presenterUser.id,
      role: "org:admin",
    },
  });

  // If user doesn't have a profile yet, initialize one
  if (!presenterUser.profile) {
    const defaultSkills = ["React", "TypeScript", "Node.js", "FastAPI", "Python", "PostgreSQL", "Docker", "Redis", "Tailwind CSS"];
    const defaultProjects = [
      {
        name: "SquadUp Platform",
        description: "Collegiate team-forming hub with deterministic taxonomy matchmaking and LCA explainability.",
        bullet_points: ["Architected single-parent 143-node taxonomy graph evaluated in <15ms over 10k teams."],
        technologies: ["React", "TypeScript", "Node.js", "FastAPI", "PostgreSQL", "Docker"],
      },
      {
        name: "Distributed In-Memory Cache",
        description: "High-throughput in-memory caching engine supporting dynamic TTL eviction.",
        technologies: ["Node.js", "Redis", "TypeScript"],
      },
    ];
    const defaultExp = [
      {
        company: "Tech Solutions",
        role: "Software Engineering Intern",
        duration: "Summer 2025",
        bullet_points: ["Engineered real-time observability pipelines and async worker queues."],
        technologies: ["Node.js", "FastAPI", "Docker", "PostgreSQL"],
      },
    ];
    const defaultAchievements = [
      {
        title: "Winner - JPMorgan Chase Code for Good",
        organization: "JPMorgan Chase",
        award_tier: "Winner",
        year: "2025",
        description: "Built a production prototype for non-profit operations with JPMorgan tech mentors.",
        technologies: ["React", "Node.js"],
      },
    ];

    await prisma.profile.create({
      data: {
        userId: presenterUser.id,
        university: tietOrg.name,
        title: "Full Stack AI Engineer & Systems Architect",
        summary: "Passionate about building scalable distributed systems, in-memory graph algorithms, and full-stack web applications.",
        skills: defaultSkills,
        projects: defaultProjects as any,
        experience: defaultExp as any,
        achievements: defaultAchievements as any,
        education: [{ degree: "B.E. Computer Engineering", college: tietOrg.name }] as any,
      },
    });

    // Generate taxonomy nodes using our built-in TaxonomyService
    const taxRes = TaxonomyService.resolveUserTaxonomy(presenterUser.id, {
      skills: defaultSkills,
      projects: defaultProjects,
      experience: defaultExp,
      achievements: defaultAchievements,
    });

    await prisma.userTaxonomy.upsert({
      where: { userId: presenterUser.id },
      update: {
        taxonomyNodeIds: taxRes.taxonomy_node_ids,
        rawSkills: taxRes.raw_skills,
        evidence: taxRes.evidence as any,
      },
      create: {
        userId: presenterUser.id,
        taxonomyNodeIds: taxRes.taxonomy_node_ids,
        rawSkills: taxRes.raw_skills,
        evidence: taxRes.evidence as any,
      },
    });
  } else {
    // Preserve existing profile, ensure university matches TIET
    const updatedProfile = await prisma.profile.update({
      where: { userId: presenterUser.id },
      data: { university: tietOrg.name },
    });

    // Re-resolve and update presenter user's taxonomy with the calibrated taxonomy tree
    const taxRes = TaxonomyService.resolveUserTaxonomy(presenterUser.id, {
      skills: updatedProfile.skills,
      projects: (updatedProfile.projects as any) || [],
      experience: (updatedProfile.experience as any) || [],
      achievements: (updatedProfile.achievements as any) || [],
    });

    await prisma.userTaxonomy.upsert({
      where: { userId: presenterUser.id },
      update: {
        taxonomyNodeIds: taxRes.taxonomy_node_ids,
        rawSkills: taxRes.raw_skills,
        evidence: taxRes.evidence as any,
      },
      create: {
        userId: presenterUser.id,
        taxonomyNodeIds: taxRes.taxonomy_node_ids,
        rawSkills: taxRes.raw_skills,
        evidence: taxRes.evidence as any,
      },
    });
  }

  // Ensure preferences
  await prisma.userPreferences.upsert({
    where: { userId: presenterUser.id },
    update: {},
    create: {
      userId: presenterUser.id,
      themeMode: "system",
      palettePreset: "default",
    },
  });

  console.log(`   ✅ Presenter account ready: Swastik Nagpal (TIET: ${tietOrg.name})`);

  // =========================================================================
  // 3. DUMMY STUDENTS & AI TAXONOMIES (SYSTEM-GENERATED VIA TAXONOMY SERVICE)
  // =========================================================================
  console.log("\n👥 Creating 24 Simulated Students with System-Generated Taxonomies...");

  const rawStudents = [
    // --- TIET Students ---
    {
      clerkId: "user_seed_tiet_aarav_sharma",
      email: "aarav.sharma@thapar.edu",
      name: "Aarav Sharma",
      orgSlug: "tiet",
      title: "Full Stack & Distributed Systems Enthusiast",
      summary: "3rd year COE student at TIET. Passionate about building high-throughput backend APIs with Node.js and FastAPI.",
      skills: ["React", "Node.js", "FastAPI", "PostgreSQL", "Docker"],
      projects: [{ name: "CloudStream", description: "Real-time streaming pipeline", technologies: ["Node.js", "FastAPI", "PostgreSQL"] }],
      experience: [{ company: "Startup Labs", role: "Backend Intern", duration: "6 mos", technologies: ["Node.js", "Docker"] }],
      achievements: [{ title: "Finalist - HackTU 5.0", organization: "CCS", award_tier: "Finalist", year: "2025" }],
    },
    {
      clerkId: "user_seed_tiet_riya_patel",
      email: "riya.patel@thapar.edu",
      name: "Riya Patel",
      orgSlug: "tiet",
      title: "AI/ML Researcher & Deep Learning Specialist",
      summary: "Working on LLM fine-tuning and Computer Vision pipelines. Winner of Makeathon 6.0.",
      skills: ["Python", "PyTorch", "TensorFlow", "Computer Vision", "FastAPI"],
      projects: [{ name: "VisionGuard", description: "Edge camera object detection", technologies: ["Python", "PyTorch", "Computer Vision"] }],
      achievements: [{ title: "1st Place - Makeathon 6.0", organization: "MLSC TIET", award_tier: "1st Place", year: "2025" }],
    },
    {
      clerkId: "user_seed_tiet_kabir_mehta",
      email: "kabir.mehta@thapar.edu",
      name: "Kabir Mehta",
      orgSlug: "tiet",
      title: "Lead Frontend Engineer & UI/UX Designer",
      summary: "Crafting silky smooth micro-interactions and performant web apps in React, Next.js, and Figma.",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "UI/UX Design"],
      projects: [{ name: "DesignFlow", description: "Figma plugin for Tailwind", technologies: ["React", "TypeScript", "Tailwind CSS"] }],
    },
    {
      clerkId: "user_seed_tiet_ananya_gupta",
      email: "ananya.gupta@thapar.edu",
      name: "Ananya Gupta",
      orgSlug: "tiet",
      title: "Cloud Native & DevOps Engineer",
      summary: "Kubernetes, Docker, Terraform, and CI/CD pipelines. Core team member at GDSC TIET.",
      skills: ["Docker", "Kubernetes", "AWS", "Go", "Linux"],
      projects: [{ name: "KubeDeploy", description: "GitOps continuous delivery tool", technologies: ["Docker", "Kubernetes", "Go"] }],
    },
    {
      clerkId: "user_seed_tiet_rohan_singh",
      email: "rohan.singh@thapar.edu",
      name: "Rohan Singh",
      orgSlug: "tiet",
      title: "Mobile App Developer & Flutter Specialist",
      summary: "Building cross-platform mobile apps for thousands of users. Active open source contributor.",
      skills: ["Flutter", "Dart", "Firebase", "Android", "REST APIs"],
      projects: [{ name: "CampusPulse", description: "Student community application", technologies: ["Flutter", "Dart", "Firebase"] }],
    },
    {
      clerkId: "user_seed_tiet_sanya_verma",
      email: "sanya.verma@thapar.edu",
      name: "Sanya Verma",
      orgSlug: "tiet",
      title: "Cybersecurity Analyst & Ethical Hacker",
      summary: "President at OWASP TIET. CTF player and security researcher specializing in web penetration testing.",
      skills: ["Cybersecurity", "Network Security", "Python", "Linux", "Penetration Testing"],
      projects: [{ name: "VulnScanner", description: "Automated vulnerability scanner", technologies: ["Python", "Linux", "Cybersecurity"] }],
    },

    // --- BITS Pilani Students ---
    {
      clerkId: "user_seed_bits_tanmay_gupta",
      email: "tanmay.gupta@pilani.bits-pilani.ac.in",
      name: "Tanmay Gupta",
      orgSlug: "bits-pilani",
      title: "High Performance Systems & Rust Engineer",
      summary: "Building low-latency distributed databases and Raft consensus engines in Rust.",
      skills: ["Rust", "Go", "Distributed Systems", "PostgreSQL", "Docker"],
      projects: [{ name: "RaftKV", description: "Distributed consensus key-value store", technologies: ["Rust", "Distributed Systems"] }],
    },
    {
      clerkId: "user_seed_bits_shreya_iyer",
      email: "shreya.iyer@pilani.bits-pilani.ac.in",
      name: "Shreya Iyer",
      orgSlug: "bits-pilani",
      title: "Generative AI & LLM Systems Specialist",
      summary: "RAG pipelines, multi-agent frameworks, and vector search architectures.",
      skills: ["Python", "Generative AI", "PyTorch", "FastAPI", "Natural Language Processing"],
      projects: [{ name: "AgentForge", description: "Multi-agent coding assistant", technologies: ["Python", "Generative AI", "FastAPI"] }],
    },
    {
      clerkId: "user_seed_bits_nihal_sen",
      email: "nihal.sen@pilani.bits-pilani.ac.in",
      name: "Nihal Sen",
      orgSlug: "bits-pilani",
      title: "Frontend Architect & Vue/React Specialist",
      summary: "Passionate about web performance, WebSockets, and state synchronization.",
      skills: ["React", "Vue", "TypeScript", "Tailwind CSS", "Node.js"],
      projects: [{ name: "CollabCanvas", description: "Real-time collaborative whiteboard", technologies: ["React", "TypeScript", "Node.js"] }],
    },
    {
      clerkId: "user_seed_bits_pranav_joshi",
      email: "pranav.joshi@pilani.bits-pilani.ac.in",
      name: "Pranav Joshi",
      orgSlug: "bits-pilani",
      title: "Web3 & Blockchain Architect",
      summary: "Smart contract security, zero-knowledge proofs, and decentralized protocols.",
      skills: ["Blockchain", "Solidity", "Rust", "Ethereum", "TypeScript"],
      projects: [{ name: "ZK-Vault", description: "Privacy preserving vault", technologies: ["Blockchain", "Solidity", "Rust"] }],
    },
    {
      clerkId: "user_seed_bits_ishita_desai",
      email: "ishita.desai@pilani.bits-pilani.ac.in",
      name: "Ishita Desai",
      orgSlug: "bits-pilani",
      title: "Data Systems & Cloud Infrastructure Lead",
      summary: "Designing large-scale event pipelines with Kafka, ClickHouse, and Kubernetes.",
      skills: ["PostgreSQL", "Docker", "Kubernetes", "Python", "Backend Development"],
      projects: [{ name: "MetricsHub", description: "High-throughput time-series engine", technologies: ["PostgreSQL", "Docker", "Python"] }],
    },
    {
      clerkId: "user_seed_bits_varun_bahl",
      email: "varun.bahl@pilani.bits-pilani.ac.in",
      name: "Varun Bahl",
      orgSlug: "bits-pilani",
      title: "DevOps & SRE Specialist",
      summary: "Automating cloud infrastructure, chaos engineering, and zero-downtime deployments.",
      skills: ["Docker", "Kubernetes", "AWS", "Linux", "Go"],
      projects: [{ name: "ChaosBot", description: "Kubernetes pod disruptor", technologies: ["Kubernetes", "Go", "Docker"] }],
    },

    // --- VIT Vellore Students ---
    {
      clerkId: "user_seed_vit_kavya_subramanian",
      email: "kavya.subramanian@vit.ac.in",
      name: "Kavya Subramanian",
      orgSlug: "vit-vellore",
      title: "Computer Vision & Autonomous Robotics Lead",
      summary: "SLAM navigation, ROS2, and embedded vision systems for autonomous vehicles.",
      skills: ["Computer Vision", "Python", "C++", "PyTorch", "Linux"],
      projects: [{ name: "DroneVision", description: "Autonomous drone navigation", technologies: ["Computer Vision", "Python", "C++"] }],
    },
    {
      clerkId: "user_seed_vit_aditya_nair",
      email: "aditya.nair@vit.ac.in",
      name: "Aditya Nair",
      orgSlug: "vit-vellore",
      title: "Full Stack Engineer & React Specialist",
      summary: "President at ACM VIT. Building scalable web platforms with React, Node, and Postgres.",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "FastAPI"],
      projects: [{ name: "HackPortal", description: "Hackathon submission portal", technologies: ["React", "Node.js", "PostgreSQL"] }],
    },
    {
      clerkId: "user_seed_vit_harish_kumar",
      email: "harish.kumar@vit.ac.in",
      name: "Harish Kumar",
      orgSlug: "vit-vellore",
      title: "Android & Mobile Systems Developer",
      summary: "Kotlin coroutines, Jetpack Compose, and offline-first mobile applications.",
      skills: ["Android", "Mobile Development", "Kotlin", "Firebase", "REST APIs"],
      projects: [{ name: "VelloreTransit", description: "Campus bus tracking app", technologies: ["Android", "Kotlin", "Firebase"] }],
    },
    {
      clerkId: "user_seed_vit_pooja_reddy",
      email: "pooja.reddy@vit.ac.in",
      name: "Pooja Reddy",
      orgSlug: "vit-vellore",
      title: "Smart Contracts & Web3 Security Auditor",
      summary: "DeFi protocols, automated market makers, and EVM gas optimization.",
      skills: ["Blockchain", "Solidity", "TypeScript", "React", "Ethereum"],
      projects: [{ name: "DeFiSwap", description: "Decentralized liquidity pool", technologies: ["Blockchain", "Solidity", "TypeScript"] }],
    },
    {
      clerkId: "user_seed_vit_siddharth_rao",
      email: "siddharth.rao@vit.ac.in",
      name: "Siddharth Rao",
      orgSlug: "vit-vellore",
      title: "Backend Engineer & Distributed Systems",
      summary: "Go microservices, gRPC streams, and distributed caching with Redis.",
      skills: ["Go", "PostgreSQL", "Docker", "Backend Development", "Linux"],
      projects: [{ name: "FastQueue", description: "Lightweight message broker in Go", technologies: ["Go", "Docker", "Linux"] }],
    },
    {
      clerkId: "user_seed_vit_divya_menon",
      email: "divya.menon@vit.ac.in",
      name: "Divya Menon",
      orgSlug: "vit-vellore",
      title: "Generative AI & Agent Architectures",
      summary: "Autonomous tool-calling agents, LangChain, and structured extraction pipelines.",
      skills: ["Python", "Generative AI", "FastAPI", "Natural Language Processing", "Machine Learning"],
      projects: [{ name: "DocMind", description: "Multi-modal document synthesis", technologies: ["Python", "Generative AI", "FastAPI"] }],
    },

    // --- IIT Delhi Students ---
    {
      clerkId: "user_seed_iitd_aditya_sharma",
      email: "aditya.sharma@iitd.ac.in",
      name: "Aditya Sharma",
      orgSlug: "iit-delhi",
      title: "High Performance Computing & C++ Systems",
      summary: "Low-latency algorithmic engines, GPU acceleration with CUDA, and distributed caching.",
      skills: ["C++", "Python", "Distributed Systems", "Linux", "Docker"],
      projects: [{ name: "CUDAMatrix", description: "GPU accelerated tensor math", technologies: ["C++", "Linux", "Docker"] }],
    },
    {
      clerkId: "user_seed_iitd_megha_sen",
      email: "megha.sen@iitd.ac.in",
      name: "Megha Sen",
      orgSlug: "iit-delhi",
      title: "LLM Fine-Tuning & Deep Learning Researcher",
      summary: "Parameter-efficient fine-tuning (LoRA, QLoRA) and RLHF for reasoning models.",
      skills: ["Python", "PyTorch", "Deep Learning", "Generative AI", "Machine Learning"],
      projects: [{ name: "ReasonLM", description: "Fine-tuned reasoning assistant", technologies: ["Python", "PyTorch", "Deep Learning"] }],
    },
    {
      clerkId: "user_seed_iitd_kunal_aggarwal",
      email: "kunal.aggarwal@iitd.ac.in",
      name: "Kunal Aggarwal",
      orgSlug: "iit-delhi",
      title: "Cloud Infrastructure & SRE Lead",
      summary: "Core team at DevClub IIT Delhi. Kubernetes operator development and eBPF observability.",
      skills: ["Docker", "Kubernetes", "Go", "Cloud Computing", "Linux"],
      projects: [{ name: "KubeProbe", description: "eBPF based network probe", technologies: ["Docker", "Kubernetes", "Go"] }],
    },
    {
      clerkId: "user_seed_iitd_tanya_kapoor",
      email: "tanya.kapoor@iitd.ac.in",
      name: "Tanya Kapoor",
      orgSlug: "iit-delhi",
      title: "Full Stack TypeScript & Product Engineer",
      summary: "Crafting beautiful, accessible web applications with Next.js, GraphQL, and Prisma.",
      skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Frontend Development"],
      projects: [{ name: "DevConnect", description: "Student mentorship platform", technologies: ["React", "TypeScript", "Node.js"] }],
    },
    {
      clerkId: "user_seed_iitd_yash_singhal",
      email: "yash.singhal@iitd.ac.in",
      name: "Yash Singhal",
      orgSlug: "iit-delhi",
      title: "Quantum Algorithms & Scientific Computing",
      summary: "Simulating quantum annealing and variational quantum eigensolvers in Qiskit.",
      skills: ["Python", "Software Development", "Linux", "Data Systems"],
      projects: [{ name: "QuantumSim", description: "Noisy intermediate quantum simulator", technologies: ["Python", "Linux"] }],
    },
    {
      clerkId: "user_seed_iitd_neha_bansal",
      email: "neha.bansal@iitd.ac.in",
      name: "Neha Bansal",
      orgSlug: "iit-delhi",
      title: "Cybersecurity & Binary Exploitation Researcher",
      summary: "Reverse engineering, cryptographic protocol auditing, and kernel security.",
      skills: ["Cybersecurity", "Network Security", "C++", "Python", "Linux"],
      projects: [{ name: "KernelGuard", description: "Linux kernel module monitor", technologies: ["C++", "Linux", "Cybersecurity"] }],
    },
  ];

  const createdStudents: any[] = [];
  for (const s of rawStudents) {
    const org = orgMap[s.orgSlug];

    const user = await prisma.user.upsert({
      where: { clerkId: s.clerkId },
      update: { name: s.name, email: s.email },
      create: { clerkId: s.clerkId, email: s.email, name: s.name },
    });

    // Create Organization Membership
    await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
      update: { role: "org:member" },
      create: {
        organizationId: org.id,
        userId: user.id,
        role: "org:member",
      },
    });

    // Create Profile
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        university: org.name,
        title: s.title,
        summary: s.summary,
        skills: s.skills,
        projects: (s.projects || []) as any,
        experience: (s.experience || []) as any,
        achievements: (s.achievements || []) as any,
        education: [{ degree: "B.Tech Computer Science", college: org.name }] as any,
      },
      create: {
        userId: user.id,
        university: org.name,
        title: s.title,
        summary: s.summary,
        skills: s.skills,
        projects: (s.projects || []) as any,
        experience: (s.experience || []) as any,
        achievements: (s.achievements || []) as any,
        education: [{ degree: "B.Tech Computer Science", college: org.name }] as any,
      },
    });

    // Generate real deterministic taxonomy nodes via our built-in TaxonomyService
    const taxRes = TaxonomyService.resolveUserTaxonomy(user.id, {
      skills: s.skills,
      projects: s.projects as any,
      experience: s.experience as any,
      achievements: s.achievements as any,
    });

    await prisma.userTaxonomy.upsert({
      where: { userId: user.id },
      update: {
        taxonomyNodeIds: taxRes.taxonomy_node_ids,
        rawSkills: taxRes.raw_skills,
        evidence: taxRes.evidence as any,
      },
      create: {
        userId: user.id,
        taxonomyNodeIds: taxRes.taxonomy_node_ids,
        rawSkills: taxRes.raw_skills,
        evidence: taxRes.evidence as any,
      },
    });

    createdStudents.push({ ...user, profile: { ...s, university: org.name } });
  }

  console.log(`   ✅ Seeded ${createdStudents.length} Students with system-generated Taxonomies`);

  // =========================================================================
  // 4. SUB-ORGANIZERS (CLUBS & SOCIETIES) FOR ALL 4 UNIVERSITIES
  // =========================================================================
  console.log("\n🏛️ Creating 14 University Sub-Organizers (Clubs & Societies)...");

  const clubsData = [
    // --- TIET Clubs ---
    {
      name: "ACM TIET Student Chapter",
      slug: "acm-tiet",
      description: "Premier student chapter of the Association for Computing Machinery at TIET.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: createdStudents[0].id, // Aarav Sharma
      email: "acm@thapar.edu",
    },
    {
      name: "MLSC TIET",
      slug: "mlsc-tiet",
      description: "Microsoft Learn Student Chapter at TIET. Hosts Makeathon flagship hackathon series.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: createdStudents[1].id, // Riya Patel
      email: "mlsc@thapar.edu",
    },
    {
      name: "OWASP TIET Chapter",
      slug: "owasp-tiet",
      description: "Cybersecurity and open web application security community at Thapar Institute.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: createdStudents[5].id, // Sanya Verma
      email: "owasp@thapar.edu",
    },
    {
      name: "GDSC TIET",
      slug: "gdsc-tiet",
      description: "Google Developer Student Club at TIET. Accelerating student developer potential.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: createdStudents[3].id, // Ananya Gupta
      email: "gdsc@thapar.edu",
    },
    {
      name: "Creative Computing Society (CCS)",
      slug: "ccs-tiet",
      description: "The official computing and design society at Thapar. Organizers of HackTU.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      ownerId: createdStudents[2].id, // Kabir Mehta
      email: "ccs@thapar.edu",
    },

    // --- BITS Pilani Clubs ---
    {
      name: "IEEE BITS Pilani Chapter",
      slug: "ieee-bits-pilani",
      description: "Advancing technology for humanity at Birla Institute of Technology and Science, Pilani.",
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      ownerId: createdStudents[6].id, // Tanmay Gupta
      email: "ieee@pilani.bits-pilani.ac.in",
    },
    {
      name: "Coding Club BITS Pilani",
      slug: "coding-club-bits",
      description: "Algorithmic problem solving, systems development, and hackathons at BITS Pilani.",
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      ownerId: createdStudents[8].id, // Nihal Sen
      email: "codingclub@pilani.bits-pilani.ac.in",
    },
    {
      name: "APOGEE Technical Committee",
      slug: "apogee-bits",
      description: "Organizers of BITS Pilani's annual international technical festival.",
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      ownerId: createdStudents[7].id, // Shreya Iyer
      email: "apogee@pilani.bits-pilani.ac.in",
    },

    // --- VIT Vellore Clubs ---
    {
      name: "ACM VIT Student Chapter",
      slug: "acm-vit",
      description: "Premier collegiate chapter fostering technical excellence at VIT Vellore.",
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      ownerId: createdStudents[13].id, // Aditya Nair
      email: "acm@vit.ac.in",
    },
    {
      name: "CSI VIT",
      slug: "csi-vit",
      description: "Computer Society of India student branch at Vellore Institute of Technology.",
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      ownerId: createdStudents[12].id, // Kavya Subramanian
      email: "csi@vit.ac.in",
    },
    {
      name: "IEEE-CS VIT",
      slug: "ieee-cs-vit",
      description: "IEEE Computer Society student chapter at VIT Vellore.",
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      ownerId: createdStudents[14].id, // Harish Kumar
      email: "ieeecs@vit.ac.in",
    },

    // --- IIT Delhi Clubs ---
    {
      name: "DevClub IIT Delhi",
      slug: "devclub-iitd",
      description: "The official software development and open-source club of IIT Delhi.",
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      ownerId: createdStudents[20].id, // Kunal Aggarwal
      email: "devclub@iitd.ac.in",
    },
    {
      name: "ACM IIT Delhi",
      slug: "acm-iitd",
      description: "Association for Computing Machinery chapter at Indian Institute of Technology Delhi.",
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      ownerId: createdStudents[18].id, // Aditya Sharma
      email: "acm@iitd.ac.in",
    },
    {
      name: "Tryst Technical Committee",
      slug: "tryst-iitd",
      description: "Organizing team for North India's largest annual technical festival at IIT Delhi.",
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      ownerId: createdStudents[19].id, // Megha Sen
      email: "tryst@iitd.ac.in",
    },
  ];

  const clubMap: Record<string, any> = {};
  for (const c of clubsData) {
    const club = await prisma.organizer.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        orgId: c.orgId,
        organizationId: c.organizationId,
        ownerId: c.ownerId,
        email: c.email,
      },
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
    clubMap[c.slug] = club;
    console.log(`   ✅ Synced Club: ${club.name} (${c.slug})`);
  }

  // =========================================================================
  // 5. 20 COLLEGIATE & GLOBAL HACKATHONS (EVENTS)
  // =========================================================================
  console.log("\n📅 Creating 20 Collegiate & Global Hackathons...");

  const eventsData = [
    // --- 5 TIET Events ---
    {
      title: "Makeathon 7.0",
      description: "TIET's flagship 36-hour hackathon hosted by MLSC TIET. Build breakthrough software and hardware solutions with tracks in AI, FinTech, and IoT.",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      location: "Thapar Institute of Engineering & Technology, Patiala",
      organizerId: createdStudents[1].id,
      organizerProfileId: clubMap["mlsc-tiet"].id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "HackTU 6.0",
      description: "North India's premier collegiate hackathon organized by Creative Computing Society (CCS). High energy 24-hour innovation sprint.",
      date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      location: "TIET Main Auditorium, Patiala",
      organizerId: createdStudents[2].id,
      organizerProfileId: clubMap["ccs-tiet"].id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "CyberSurge 2026: TIET CTF & Security Sprint",
      description: "24-hour Capture-The-Flag and defensive cybersecurity challenge organized by OWASP TIET.",
      date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      location: "TIET Computer Labs, Patiala",
      organizerId: createdStudents[5].id,
      organizerProfileId: clubMap["owasp-tiet"].id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "DevSprint TIET: 24h FullStack Productathon",
      description: "A rapid product development sprint by GDSC TIET. Turn ideas into working web and mobile apps.",
      date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      location: "Library Hall, TIET, Patiala",
      organizerId: createdStudents[3].id,
      organizerProfileId: clubMap["gdsc-tiet"].id,
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      isGlobal: false,
    },
    {
      title: "CodeHers TIET 2026",
      description: "A vibrant women-in-tech hackathon organized by ACM TIET, fostering diversity and innovation.",
      date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
      location: "Niranjan Hall, TIET, Patiala",
      organizerId: createdStudents[0].id,
      organizerProfileId: clubMap["acm-tiet"].id,
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
      organizerId: createdStudents[7].id,
      organizerProfileId: clubMap["apogee-bits"].id,
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      isGlobal: false,
    },
    {
      title: "BITS ByteCraft 2026",
      description: "Systems programming and low-latency algorithmic engineering sprint by Coding Club BITS.",
      date: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
      location: "NAB Auditorium, BITS Pilani",
      organizerId: createdStudents[8].id,
      organizerProfileId: clubMap["coding-club-bits"].id,
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      isGlobal: false,
    },
    {
      title: "Pilani Web3 Build-a-thon",
      description: "Decentralized applications, smart contracts, and zero-knowledge crypto sprint by IEEE BITS.",
      date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      location: "BITS Pilani",
      organizerId: createdStudents[6].id,
      organizerProfileId: clubMap["ieee-bits-pilani"].id,
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
      organizerId: createdStudents[12].id,
      organizerProfileId: clubMap["csi-vit"].id,
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      isGlobal: false,
    },
    {
      title: "HackBattle 2026: ACM VIT",
      description: "36-hour continuous build challenge with tracks in AI Agents, FinTech, and Autonomous Systems.",
      date: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000),
      location: "Technology Tower, VIT Vellore",
      organizerId: createdStudents[13].id,
      organizerProfileId: clubMap["acm-vit"].id,
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      isGlobal: false,
    },
    {
      title: "DevSpace 2026",
      description: "Full-stack cloud and open-source sprint organized by IEEE-CS VIT.",
      date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      location: "SJT Hall, VIT Vellore",
      organizerId: createdStudents[14].id,
      organizerProfileId: clubMap["ieee-cs-vit"].id,
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
      organizerId: createdStudents[19].id,
      organizerProfileId: clubMap["tryst-iitd"].id,
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      isGlobal: false,
    },
    {
      title: "DevClub Productathon IITD",
      description: "24-hour rapid prototyping and devtooling sprint organized by DevClub IIT Delhi.",
      date: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
      location: "Bharti Building, IIT Delhi",
      organizerId: createdStudents[20].id,
      organizerProfileId: clubMap["devclub-iitd"].id,
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      isGlobal: false,
    },
    {
      title: "OpenHack IIT Delhi 2026",
      description: "Open source software development and infrastructure challenge by ACM IIT Delhi.",
      date: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
      location: "IIT Delhi Campus",
      organizerId: createdStudents[18].id,
      organizerProfileId: clubMap["acm-iitd"].id,
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      isGlobal: false,
    },

    // --- 6 Global / Inter-University Events (isGlobal = true) ---
    {
      title: "Indian Collegiate Hackathon League (ICHL 2026)",
      description: "Premier national inter-university hackathon bringing together top engineering talent across India.",
      date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
      location: "Hybrid (New Delhi & Virtual)",
      organizerId: presenterUser.id,
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
      organizerId: createdStudents[1].id,
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
      organizerId: presenterUser.id,
      organizationId: orgMap["stanford"]?.id,
      orgId: orgMap["stanford"]?.clerkOrgId,
      isGlobal: true,
    },
    {
      title: "Cal Hacks 12.0",
      description: "The world's largest collegiate hackathon hosted at the historic Palace of Fine Arts.",
      date: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000),
      location: "San Francisco, CA & Remote",
      organizerId: createdStudents[6].id,
      organizationId: orgMap["uc-berkeley"]?.id,
      orgId: orgMap["uc-berkeley"]?.clerkOrgId,
      isGlobal: true,
    },
    {
      title: "FinTech Frontier Hackathon 2026",
      description: "High-frequency trading engines, decentralized orderbooks, and predictive credit intelligence.",
      date: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000),
      location: "Mumbai, India & Virtual",
      organizerId: createdStudents[13].id,
      organizerProfileId: clubMap["csi-vit"]?.id,
      organizationId: vitOrg.id,
      orgId: vitOrg.clerkOrgId,
      isGlobal: true,
    },
    {
      title: "Open Source Founders Weekend 2026",
      description: "Turn your open-source developer tools into sustainable ventures with top devtool mentors.",
      date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      location: "Bangalore, India & Virtual",
      organizerId: createdStudents[20].id,
      organizerProfileId: clubMap["coding-club-bits"]?.id,
      organizationId: bitsOrg.id,
      orgId: bitsOrg.clerkOrgId,
      isGlobal: true,
    },
  ];

  // Clear existing events and teams to re-seed cleanly
  await prisma.teamApplication.deleteMany({});
  await prisma.teamInvite.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.teamRole.deleteMany({});
  await prisma.teamTaxonomy.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.event.deleteMany({});

  const createdEvents: any[] = [];
  for (const ev of eventsData) {
    const event = await prisma.event.create({
      data: ev,
    });
    createdEvents.push(event);
  }

  console.log(`   ✅ Seeded ${createdEvents.length} Events (14 Campus-Scoped + 6 Global)`);

  // =========================================================================
  // 6. 65+ TEAMS WITH SYSTEM-GENERATED TAXONOMIES (via TaxonomyService)
  // =========================================================================
  console.log("\n⚔️ Creating 65+ Teams with Structured Roles & System-Generated Taxonomies...");

  // Curated list of realistic team templates with diverse structured roles
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
  let presenterLeadTeam: any = null;
  let presenterMemberTeam: any = null;

  for (let eventIdx = 0; eventIdx < createdEvents.length; eventIdx++) {
    const currentEvent = createdEvents[eventIdx];
    const isGlobal = currentEvent.isGlobal;
    const teamsForThisEvent = isGlobal ? 4 : 3;

    for (let t = 0; t < teamsForThisEvent; t++) {
      const templateIdx = (eventIdx * 3 + t) % teamTemplates.length;
      const template = teamTemplates[templateIdx];

      // Determine leader and university affiliation
      let leader = createdStudents[(eventIdx * 2 + t) % createdStudents.length];
      let teamUni = leader.profile.university;

      if (!isGlobal && currentEvent.organizationId) {
        // Find a student from the same university
        const campusStudents = createdStudents.filter((s) => s.profile.university === currentEvent.organization?.name || s.orgSlug === (eventIdx < 5 ? "tiet" : eventIdx < 8 ? "bits-pilani" : eventIdx < 11 ? "vit-vellore" : "iit-delhi"));
        if (campusStudents.length > 0) {
          leader = campusStudents[t % campusStudents.length];
          teamUni = leader.profile.university;
        }
      }

      const teamName = isGlobal
        ? `${template.name} [${currentEvent.title.split(" ")[0]}]`
        : `${template.name} #${t + 1}`;

      const allReqs = [...new Set(template.roles.flatMap((r) => r.skills))];

      // System-calculated role taxonomies and aggregated requirements
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

      totalTeamsCreated++;

      // Track first event teams for presenter linkage
      if (eventIdx === 0 && t === 0) {
        presenterLeadTeam = team;
      } else if (eventIdx === 0 && t === 1) {
        presenterMemberTeam = team;
      }
    }
  }

  // =========================================================================
  // 7. INTERACTIVE DEMO STATE FOR PRESENTER (Swastik Nagpal)
  // =========================================================================
  console.log("\n🎭 Setting up Interactive Demo State for Presenter...");

  // 1. Assign Swastik as Leader of Makeathon Flagship Team ("NeuralSync AI Agents")
  if (presenterLeadTeam) {
    const presenterRoles = [
      { title: "AI Systems Lead", skills: ["Python", "PyTorch", "Generative AI"], spots: 1 },
      { title: "Backend API Specialist", skills: ["FastAPI", "Docker", "PostgreSQL", "Node.js"], spots: 1 },
      { title: "Frontend AI Interface", skills: ["React", "TypeScript", "Tailwind CSS"], spots: 1 },
    ];
    const presenterReqs = [...new Set(presenterRoles.flatMap((r) => r.skills))];
    const resolvedPresenterTax = TaxonomyService.resolveTeamRoles(presenterRoles);

    // Re-create presenter team roles
    await prisma.teamRole.deleteMany({ where: { teamId: presenterLeadTeam.id } });
    await prisma.teamRole.createMany({
      data: presenterRoles.map((r, idx) => ({
        teamId: presenterLeadTeam.id,
        title: r.title,
        skills: r.skills,
        spots: r.spots ?? 1,
        assignedToId: idx === 0 ? presenterUser.id : null,
      })),
    });

    // Update team name & set Swastik as Leader
    await prisma.team.update({
      where: { id: presenterLeadTeam.id },
      data: {
        name: "NeuralSync AI Agents",
        requirements: presenterReqs,
      },
    });

    // Remove old leader member & add Swastik
    await prisma.teamMember.deleteMany({ where: { teamId: presenterLeadTeam.id } });
    await prisma.teamMember.create({
      data: {
        teamId: presenterLeadTeam.id,
        userId: presenterUser.id,
        role: "Leader",
      },
    });

    // Save system-resolved taxonomy for presenter team
    await prisma.teamTaxonomy.upsert({
      where: { teamId: presenterLeadTeam.id },
      update: {
        requirementNodeIds: resolvedPresenterTax.requirementNodeIds,
        rawRequirements: presenterReqs,
        roleTaxonomies: resolvedPresenterTax.roleTaxonomies as any,
      },
      create: {
        teamId: presenterLeadTeam.id,
        requirementNodeIds: resolvedPresenterTax.requirementNodeIds,
        rawRequirements: presenterReqs,
        roleTaxonomies: resolvedPresenterTax.roleTaxonomies as any,
      },
    });

    // Create 2 Pending Applications from simulated TIET students for Swastik to review!
    await prisma.teamApplication.create({
      data: {
        teamId: presenterLeadTeam.id,
        userId: createdStudents[0].id, // Aarav Sharma
        message: "Hey Swastik! I'm a 3rd year COE student with strong Node.js & FastAPI backend experience. Would love to join NeuralSync for Makeathon 7.0!",
        status: "PENDING",
      },
    });

    await prisma.teamApplication.create({
      data: {
        teamId: presenterLeadTeam.id,
        userId: createdStudents[1].id, // Riya Patel
        message: "Hi! I won 1st place in Makeathon 6.0 working on PyTorch & Computer Vision. I'd love to lead the model architecture track in your squad.",
        status: "PENDING",
      },
    });

    console.log(`   ✅ Presenter Leader Team: "NeuralSync AI Agents" (with 3 structured roles & 2 pending candidate applications)`);
  }

  // 2. Add Swastik as an Accepted Member in a 2nd team
  if (presenterMemberTeam) {
    await prisma.teamMember.create({
      data: {
        teamId: presenterMemberTeam.id,
        userId: presenterUser.id,
        role: "Member",
      },
    });
    console.log(`   ✅ Presenter Member Team: "${presenterMemberTeam.name}"`);
  }

  // 3. Create a Pending Team Invite sent to Swastik from a BITS Pilani Global team
  const globalEventTeam = await prisma.team.findFirst({
    where: { event: { isGlobal: true } },
  });

  if (globalEventTeam) {
    await prisma.teamInvite.create({
      data: {
        teamId: globalEventTeam.id,
        senderId: createdStudents[6].id, // Tanmay Gupta from BITS
        email: presenterEmail,
        status: "PENDING",
      },
    });
    console.log(`   ✅ Presenter Squad Invite: Received invite for "${globalEventTeam.name}"`);
  }

  // =========================================================================
  // 8. FLUSH REDIS CACHE
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
      console.log("   ✅ Redis cache clean.");
    }
  } catch (err: any) {
    console.warn("   ⚠️ Redis flush warning (continuing):", err.message);
  }

  console.log("\n=========================================================");
  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log(`🏫 Organizations: 4 (TIET, BITS Pilani, VIT Vellore, IIT Delhi)`);
  console.log(`🏛️ Sub-Organizers: 14 Clubs/Societies across all campuses`);
  console.log(`👥 Students: 24 Simulated Students with System-Generated Taxonomies`);
  console.log(`📅 Events: ${createdEvents.length} (14 Campus-Scoped + 6 Global)`);
  console.log(`⚔️ Teams: ${totalTeamsCreated} (with system-resolved requirements)`);
  console.log(`👤 Presenter Demo: Ready for Swastik Nagpal (Lead of NeuralSync AI Agents)`);
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

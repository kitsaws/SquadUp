import { PrismaClient } from "@prisma/client";
import { TaxonomyService } from "../../src/taxonomy/taxonomy.service.js";

export interface SeededStudent {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  orgSlug: string;
  profile: {
    university: string;
    title: string;
    summary: string;
    skills: string[];
    projects?: any[];
    experience?: any[];
    achievements?: any[];
  };
}

export async function seedUsers(
  prisma: PrismaClient,
  orgMap: Record<string, any>
): Promise<SeededStudent[]> {
  console.log("\n👥 Seeding 24 Collegiate Students with Offline AI Taxonomies...");

  const rawStudents = [
    // --- TIET Students ---
    {
      clerkId: "seed_user_tiet_aarav_sharma",
      email: "aarav.sharma@thapar.edu",
      name: "Aarav Sharma",
      orgSlug: "tiet",
      title: "Full Stack & Distributed Systems Enthusiast",
      summary: "3rd year COE student at TIET. Passionate about building high-throughput backend APIs with Node.js and FastAPI.",
      skills: ["React", "Node.js", "FastAPI", "PostgreSQL", "Docker", "TypeScript"],
      projects: [{ name: "CloudStream", description: "Real-time streaming pipeline", technologies: ["Node.js", "FastAPI", "PostgreSQL"] }],
      experience: [{ company: "Startup Labs", role: "Backend Intern", duration: "6 mos", technologies: ["Node.js", "Docker"] }],
      achievements: [{ title: "Finalist - HackTU 5.0", organization: "CCS", award_tier: "Finalist", year: "2025" }],
    },
    {
      clerkId: "seed_user_tiet_riya_patel",
      email: "riya.patel@thapar.edu",
      name: "Riya Patel",
      orgSlug: "tiet",
      title: "AI/ML Researcher & Deep Learning Specialist",
      summary: "Working on LLM fine-tuning and Computer Vision pipelines. Winner of Makeathon 6.0.",
      skills: ["Python", "PyTorch", "TensorFlow", "Computer Vision", "FastAPI", "Generative AI"],
      projects: [{ name: "VisionGuard", description: "Edge camera object detection", technologies: ["Python", "PyTorch", "Computer Vision"] }],
      achievements: [{ title: "1st Place - Makeathon 6.0", organization: "MLSC TIET", award_tier: "1st Place", year: "2025" }],
    },
    {
      clerkId: "seed_user_tiet_kabir_mehta",
      email: "kabir.mehta@thapar.edu",
      name: "Kabir Mehta",
      orgSlug: "tiet",
      title: "Lead Frontend Engineer & UI/UX Designer",
      summary: "Crafting silky smooth micro-interactions and performant web apps in React, Next.js, and Figma.",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "UI/UX Design", "Figma"],
      projects: [{ name: "DesignFlow", description: "Figma plugin for Tailwind", technologies: ["React", "TypeScript", "Tailwind CSS"] }],
    },
    {
      clerkId: "seed_user_tiet_ananya_gupta",
      email: "ananya.gupta@thapar.edu",
      name: "Ananya Gupta",
      orgSlug: "tiet",
      title: "Cloud Native & DevOps Engineer",
      summary: "Kubernetes, Docker, Terraform, and CI/CD pipelines. Core team member at GDSC TIET.",
      skills: ["Docker", "Kubernetes", "AWS", "Go", "Linux", "DevOps"],
      projects: [{ name: "KubeDeploy", description: "GitOps continuous delivery tool", technologies: ["Docker", "Kubernetes", "Go"] }],
    },
    {
      clerkId: "seed_user_tiet_rohan_singh",
      email: "rohan.singh@thapar.edu",
      name: "Rohan Singh",
      orgSlug: "tiet",
      title: "Mobile App Developer & Flutter Specialist",
      summary: "Building cross-platform mobile apps for thousands of users. Active open source contributor.",
      skills: ["Flutter", "Dart", "Firebase", "Android", "REST APIs"],
      projects: [{ name: "CampusPulse", description: "Student community application", technologies: ["Flutter", "Dart", "Firebase"] }],
    },
    {
      clerkId: "seed_user_tiet_sanya_verma",
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
      clerkId: "seed_user_bits_tanmay_gupta",
      email: "tanmay.gupta@pilani.bits-pilani.ac.in",
      name: "Tanmay Gupta",
      orgSlug: "bits-pilani",
      title: "High Performance Systems & Rust Engineer",
      summary: "Building low-latency distributed databases and Raft consensus engines in Rust.",
      skills: ["Rust", "Go", "Distributed Systems", "PostgreSQL", "Docker", "C++"],
      projects: [{ name: "RaftKV", description: "Distributed consensus key-value store", technologies: ["Rust", "Distributed Systems"] }],
    },
    {
      clerkId: "seed_user_bits_shreya_iyer",
      email: "shreya.iyer@pilani.bits-pilani.ac.in",
      name: "Shreya Iyer",
      orgSlug: "bits-pilani",
      title: "Generative AI & LLM Systems Specialist",
      summary: "RAG pipelines, multi-agent frameworks, and vector search architectures.",
      skills: ["Python", "Generative AI", "PyTorch", "FastAPI", "Natural Language Processing"],
      projects: [{ name: "AgentForge", description: "Multi-agent coding assistant", technologies: ["Python", "Generative AI", "FastAPI"] }],
    },
    {
      clerkId: "seed_user_bits_nihal_sen",
      email: "nihal.sen@pilani.bits-pilani.ac.in",
      name: "Nihal Sen",
      orgSlug: "bits-pilani",
      title: "Frontend Architect & Vue/React Specialist",
      summary: "Passionate about web performance, WebSockets, and state synchronization.",
      skills: ["React", "Vue", "TypeScript", "Tailwind CSS", "Node.js", "Frontend Development"],
      projects: [{ name: "CollabCanvas", description: "Real-time collaborative whiteboard", technologies: ["React", "TypeScript", "Node.js"] }],
    },
    {
      clerkId: "seed_user_bits_pranav_joshi",
      email: "pranav.joshi@pilani.bits-pilani.ac.in",
      name: "Pranav Joshi",
      orgSlug: "bits-pilani",
      title: "Web3 & Blockchain Architect",
      summary: "Smart contract security, zero-knowledge proofs, and decentralized protocols.",
      skills: ["Blockchain", "Solidity", "Rust", "Ethereum", "TypeScript"],
      projects: [{ name: "ZK-Vault", description: "Privacy preserving vault", technologies: ["Blockchain", "Solidity", "Rust"] }],
    },
    {
      clerkId: "seed_user_bits_ishita_desai",
      email: "ishita.desai@pilani.bits-pilani.ac.in",
      name: "Ishita Desai",
      orgSlug: "bits-pilani",
      title: "Data Systems & Cloud Infrastructure Lead",
      summary: "Designing large-scale event pipelines with Kafka, ClickHouse, and Kubernetes.",
      skills: ["PostgreSQL", "Docker", "Kubernetes", "Python", "Backend Development", "Redis"],
      projects: [{ name: "MetricsHub", description: "High-throughput time-series engine", technologies: ["PostgreSQL", "Docker", "Python"] }],
    },
    {
      clerkId: "seed_user_bits_varun_bahl",
      email: "varun.bahl@pilani.bits-pilani.ac.in",
      name: "Varun Bahl",
      orgSlug: "bits-pilani",
      title: "DevOps & SRE Specialist",
      summary: "Automating cloud infrastructure, chaos engineering, and zero-downtime deployments.",
      skills: ["Docker", "Kubernetes", "AWS", "Linux", "Go", "Cloud Computing"],
      projects: [{ name: "ChaosBot", description: "Kubernetes pod disruptor", technologies: ["Kubernetes", "Go", "Docker"] }],
    },

    // --- VIT Vellore Students ---
    {
      clerkId: "seed_user_vit_kavya_subramanian",
      email: "kavya.subramanian@vit.ac.in",
      name: "Kavya Subramanian",
      orgSlug: "vit-vellore",
      title: "Computer Vision & Autonomous Robotics Lead",
      summary: "SLAM navigation, ROS2, and embedded vision systems for autonomous vehicles.",
      skills: ["Computer Vision", "Python", "C++", "PyTorch", "Linux"],
      projects: [{ name: "DroneVision", description: "Autonomous drone navigation", technologies: ["Computer Vision", "Python", "C++"] }],
    },
    {
      clerkId: "seed_user_vit_aditya_nair",
      email: "aditya.nair@vit.ac.in",
      name: "Aditya Nair",
      orgSlug: "vit-vellore",
      title: "Full Stack Engineer & React Specialist",
      summary: "President at ACM VIT. Building scalable web platforms with React, Node, and Postgres.",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "FastAPI"],
      projects: [{ name: "HackPortal", description: "Hackathon submission portal", technologies: ["React", "Node.js", "PostgreSQL"] }],
    },
    {
      clerkId: "seed_user_vit_harish_kumar",
      email: "harish.kumar@vit.ac.in",
      name: "Harish Kumar",
      orgSlug: "vit-vellore",
      title: "Android & Mobile Systems Developer",
      summary: "Kotlin coroutines, Jetpack Compose, and offline-first mobile applications.",
      skills: ["Android", "Mobile Development", "Kotlin", "Firebase", "REST APIs"],
      projects: [{ name: "VelloreTransit", description: "Campus bus tracking app", technologies: ["Android", "Kotlin", "Firebase"] }],
    },
    {
      clerkId: "seed_user_vit_pooja_reddy",
      email: "pooja.reddy@vit.ac.in",
      name: "Pooja Reddy",
      orgSlug: "vit-vellore",
      title: "Smart Contracts & Web3 Security Auditor",
      summary: "DeFi protocols, automated market makers, and EVM gas optimization.",
      skills: ["Blockchain", "Solidity", "TypeScript", "React", "Ethereum"],
      projects: [{ name: "DeFiSwap", description: "Decentralized liquidity pool", technologies: ["Blockchain", "Solidity", "TypeScript"] }],
    },
    {
      clerkId: "seed_user_vit_siddharth_rao",
      email: "siddharth.rao@vit.ac.in",
      name: "Siddharth Rao",
      orgSlug: "vit-vellore",
      title: "Backend Engineer & Distributed Systems",
      summary: "Go microservices, gRPC streams, and distributed caching with Redis.",
      skills: ["Go", "PostgreSQL", "Docker", "Backend Development", "Linux", "Redis"],
      projects: [{ name: "FastQueue", description: "Lightweight message broker in Go", technologies: ["Go", "Docker", "Linux"] }],
    },
    {
      clerkId: "seed_user_vit_divya_menon",
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
      clerkId: "seed_user_iitd_aditya_sharma",
      email: "aditya.sharma@iitd.ac.in",
      name: "Aditya Sharma",
      orgSlug: "iit-delhi",
      title: "High Performance Computing & C++ Systems",
      summary: "Low-latency algorithmic engines, GPU acceleration with CUDA, and distributed caching.",
      skills: ["C++", "Python", "Distributed Systems", "Linux", "Docker"],
      projects: [{ name: "CUDAMatrix", description: "GPU accelerated tensor math", technologies: ["C++", "Linux", "Docker"] }],
    },
    {
      clerkId: "seed_user_iitd_megha_sen",
      email: "megha.sen@iitd.ac.in",
      name: "Megha Sen",
      orgSlug: "iit-delhi",
      title: "LLM Fine-Tuning & Deep Learning Researcher",
      summary: "Parameter-efficient fine-tuning (LoRA, QLoRA) and RLHF for reasoning models.",
      skills: ["Python", "PyTorch", "Deep Learning", "Generative AI", "Machine Learning"],
      projects: [{ name: "ReasonLM", description: "Fine-tuned reasoning assistant", technologies: ["Python", "PyTorch", "Deep Learning"] }],
    },
    {
      clerkId: "seed_user_iitd_kunal_aggarwal",
      email: "kunal.aggarwal@iitd.ac.in",
      name: "Kunal Aggarwal",
      orgSlug: "iit-delhi",
      title: "Cloud Infrastructure & SRE Lead",
      summary: "Core team at DevClub IIT Delhi. Kubernetes operator development and eBPF observability.",
      skills: ["Docker", "Kubernetes", "Go", "Cloud Computing", "Linux"],
      projects: [{ name: "KubeProbe", description: "eBPF based network probe", technologies: ["Docker", "Kubernetes", "Go"] }],
    },
    {
      clerkId: "seed_user_iitd_tanya_kapoor",
      email: "tanya.kapoor@iitd.ac.in",
      name: "Tanya Kapoor",
      orgSlug: "iit-delhi",
      title: "Full Stack TypeScript & Product Engineer",
      summary: "Crafting beautiful, accessible web applications with Next.js, GraphQL, and Prisma.",
      skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Frontend Development"],
      projects: [{ name: "DevConnect", description: "Student mentorship platform", technologies: ["React", "TypeScript", "Node.js"] }],
    },
    {
      clerkId: "seed_user_iitd_yash_singhal",
      email: "yash.singhal@iitd.ac.in",
      name: "Yash Singhal",
      orgSlug: "iit-delhi",
      title: "Quantum Algorithms & Scientific Computing",
      summary: "Simulating quantum annealing and variational quantum eigensolvers in Qiskit.",
      skills: ["Python", "Software Development", "Linux", "Data Systems"],
      projects: [{ name: "QuantumSim", description: "Noisy intermediate quantum simulator", technologies: ["Python", "Linux"] }],
    },
    {
      clerkId: "seed_user_iitd_neha_bansal",
      email: "neha.bansal@iitd.ac.in",
      name: "Neha Bansal",
      orgSlug: "iit-delhi",
      title: "Cybersecurity & Binary Exploitation Researcher",
      summary: "Reverse engineering, cryptographic protocol auditing, and kernel security.",
      skills: ["Cybersecurity", "Network Security", "C++", "Python", "Linux"],
      projects: [{ name: "KernelGuard", description: "Linux kernel module monitor", technologies: ["C++", "Linux", "Cybersecurity"] }],
    },
  ];

  const createdStudents: SeededStudent[] = [];

  for (const s of rawStudents) {
    const org = orgMap[s.orgSlug];

    const user = await prisma.user.create({
      data: {
        clerkId: s.clerkId,
        email: s.email,
        name: s.name,
      },
    });

    // 1. Organization Membership
    await prisma.organizationMembership.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "org:member",
      },
    });

    // 2. Profile
    await prisma.profile.create({
      data: {
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

    // 3. User Preferences
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        themeMode: "system",
        palettePreset: "default",
      },
    });

    // 4. Resolve Deterministic User Taxonomy
    const taxRes = TaxonomyService.resolveUserTaxonomy(user.id, {
      skills: s.skills,
      projects: s.projects as any,
      experience: s.experience as any,
      achievements: s.achievements as any,
    });

    await prisma.userTaxonomy.create({
      data: {
        userId: user.id,
        taxonomyNodeIds: taxRes.taxonomy_node_ids,
        rawSkills: taxRes.raw_skills,
        evidence: taxRes.evidence as any,
      },
    });

    createdStudents.push({
      id: user.id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      orgSlug: s.orgSlug,
      profile: {
        ...s,
        university: org.name,
      },
    });
  }

  console.log(`   ✅ Seeded ${createdStudents.length} Students with full profiles & taxonomy nodes.`);
  return createdStudents;
}

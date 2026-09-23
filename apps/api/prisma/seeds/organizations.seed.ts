import { PrismaClient } from "@prisma/client";

export interface SeededOrganizationsResult {
  orgMap: Record<string, any>;
  clubMap: Record<string, any>;
}

export async function seedOrganizations(prisma: PrismaClient): Promise<SeededOrganizationsResult> {
  console.log("🏫 Seeding Verified University Organizations...");

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
    console.log(`   ✅ Synced Organization: ${org.name} (${org.slug})`);
  }

  const tietOrg = orgMap["tiet"];
  const bitsOrg = orgMap["bits-pilani"];
  const vitOrg = orgMap["vit-vellore"];
  const iitdOrg = orgMap["iit-delhi"];

  console.log("\n🏛️ Seeding University Sub-Organizers (Clubs & Societies)...");

  const clubsData = [
    // --- TIET Clubs ---
    {
      name: "ACM TIET Student Chapter",
      slug: "acm-tiet",
      description: "Premier student chapter of the Association for Computing Machinery at TIET.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      email: "acm@thapar.edu",
    },
    {
      name: "MLSC TIET",
      slug: "mlsc-tiet",
      description: "Microsoft Learn Student Chapter at TIET. Hosts Makeathon flagship hackathon series.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      email: "mlsc@thapar.edu",
    },
    {
      name: "OWASP TIET Chapter",
      slug: "owasp-tiet",
      description: "Cybersecurity and open web application security community at Thapar Institute.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      email: "owasp@thapar.edu",
    },
    {
      name: "GDSC TIET",
      slug: "gdsc-tiet",
      description: "Google Developer Student Club at TIET. Accelerating student developer potential.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      email: "gdsc@thapar.edu",
    },
    {
      name: "Creative Computing Society (CCS)",
      slug: "ccs-tiet",
      description: "The official computing and design society at Thapar. Organizers of HackTU.",
      orgId: tietOrg.clerkOrgId,
      organizationId: tietOrg.id,
      email: "ccs@thapar.edu",
    },

    // --- BITS Pilani Clubs ---
    {
      name: "IEEE BITS Pilani Chapter",
      slug: "ieee-bits-pilani",
      description: "Advancing technology for humanity at Birla Institute of Technology and Science, Pilani.",
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      email: "ieee@pilani.bits-pilani.ac.in",
    },
    {
      name: "Coding Club BITS Pilani",
      slug: "coding-club-bits",
      description: "Algorithmic problem solving, systems development, and hackathons at BITS Pilani.",
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      email: "codingclub@pilani.bits-pilani.ac.in",
    },
    {
      name: "APOGEE Technical Committee",
      slug: "apogee-bits",
      description: "Organizers of BITS Pilani's annual international technical festival.",
      orgId: bitsOrg.clerkOrgId,
      organizationId: bitsOrg.id,
      email: "apogee@pilani.bits-pilani.ac.in",
    },

    // --- VIT Vellore Clubs ---
    {
      name: "ACM VIT Student Chapter",
      slug: "acm-vit",
      description: "Premier collegiate chapter fostering technical excellence at VIT Vellore.",
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      email: "acm@vit.ac.in",
    },
    {
      name: "CSI VIT",
      slug: "csi-vit",
      description: "Computer Society of India student branch at Vellore Institute of Technology.",
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      email: "csi@vit.ac.in",
    },
    {
      name: "IEEE-CS VIT",
      slug: "ieee-cs-vit",
      description: "IEEE Computer Society student chapter at VIT Vellore.",
      orgId: vitOrg.clerkOrgId,
      organizationId: vitOrg.id,
      email: "ieeecs@vit.ac.in",
    },

    // --- IIT Delhi Clubs ---
    {
      name: "DevClub IIT Delhi",
      slug: "devclub-iitd",
      description: "The official software development and open-source club of IIT Delhi.",
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      email: "devclub@iitd.ac.in",
    },
    {
      name: "ACM IIT Delhi",
      slug: "acm-iitd",
      description: "Association for Computing Machinery chapter at Indian Institute of Technology Delhi.",
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
      email: "acm@iitd.ac.in",
    },
    {
      name: "Tryst Technical Committee",
      slug: "tryst-iitd",
      description: "Organizing team for North India's largest annual technical festival at IIT Delhi.",
      orgId: iitdOrg.clerkOrgId,
      organizationId: iitdOrg.id,
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
        email: c.email,
      },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        orgId: c.orgId,
        organizationId: c.organizationId,
        email: c.email,
      },
    });
    clubMap[c.slug] = club;
    console.log(`   ✅ Synced Club: ${club.name} (${c.slug})`);
  }

  return { orgMap, clubMap };
}

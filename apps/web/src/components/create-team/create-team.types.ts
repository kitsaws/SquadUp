import React from "react";
import { Code2, Brain, Smartphone, Wrench } from "lucide-react";

export interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (teamId: string) => void;
  initialEventId?: string;
  initialEvent?: {
    id: string;
    title: string;
    dateStr?: string;
    location?: string | null;
    isGlobal?: boolean;
    orgId?: string | null;
  };
}

export interface RoleDraft {
  id: string; // temporary client ID
  title: string;
  skills: string[];
  spots: number;
}

export interface InviteDraft {
  id: string;
  email: string;
  roleIndex: number; // index in roles array, or -1 for unassigned
}

export interface PresetTemplate {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  roles: {
    id: string;
    title: string;
    skills: string[];
    spots: number;
  }[];
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "fullstack",
    name: "Full-Stack Web App",
    icon: Code2,
    description: "Frontend + Backend + UI/UX architecture",
    roles: [
      {
        id: "role-1",
        title: "Frontend Architect",
        skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
        spots: 1,
      },
      {
        id: "role-2",
        title: "Backend Engineer",
        skills: ["Node.js", "PostgreSQL", "FastAPI", "Docker"],
        spots: 1,
      },
      {
        id: "role-3",
        title: "UI/UX Designer",
        skills: ["Figma", "UI Design", "Prototyping"],
        spots: 1,
      },
    ],
  },
  {
    id: "aiml",
    name: "AI / ML Product",
    icon: Brain,
    description: "Machine Learning + Full Stack integration",
    roles: [
      {
        id: "role-1",
        title: "AI / ML Specialist",
        skills: ["Python", "PyTorch", "LLMs", "FastAPI"],
        spots: 1,
      },
      {
        id: "role-2",
        title: "Full-Stack Integrator",
        skills: ["React", "TypeScript", "Docker", "Node.js"],
        spots: 1,
      },
      {
        id: "role-3",
        title: "Product & Data Lead",
        skills: ["Data Analysis", "Product Management", "Python"],
        spots: 1,
      },
    ],
  },
  {
    id: "mobile",
    name: "Mobile App Squad",
    icon: Smartphone,
    description: "Cross-platform mobile & cloud backend",
    roles: [
      {
        id: "role-1",
        title: "Mobile Developer",
        skills: ["React Native", "TypeScript", "Tailwind CSS"],
        spots: 1,
      },
      {
        id: "role-2",
        title: "Cloud & API Lead",
        skills: ["Node.js", "PostgreSQL", "AWS", "FastAPI"],
        spots: 1,
      },
      {
        id: "role-3",
        title: "UI Designer",
        skills: ["Figma", "Mobile UI", "Prototyping"],
        spots: 1,
      },
    ],
  },
  {
    id: "custom",
    name: "Custom Squad",
    icon: Wrench,
    description: "Define positions from scratch",
    roles: [
      {
        id: "role-1",
        title: "Lead Developer",
        skills: ["React", "TypeScript"],
        spots: 1,
      },
    ],
  },
];

export const POPULAR_SKILL_SUGGESTIONS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "Next.js",
  "FastAPI",
  "PostgreSQL",
  "Docker",
  "Tailwind CSS",
  "PyTorch",
  "Figma",
  "MongoDB",
  "GraphQL",
  "AWS",
  "Flutter",
  "React Native",
];

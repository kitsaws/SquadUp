import React, { useState } from "react";
import { useJobContext } from "../contexts/JobContext";
import { useUser, Show, UserProfile } from "@clerk/react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  FileText,
  Building,
  GraduationCap,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Settings,
  ArrowUpRight,
  Upload,
  CheckCircle2,
  Users,
  ArrowRight,
  Crown,
  Clock,
  Plus,
  MapPin,
} from "lucide-react";
import { SkillTag } from "../components/Badges";

interface UserSquad {
  id: string;
  name: string;
  eventId: string;
  eventTitle: string;
  role: string;
  isLeader: boolean;
  isMember: boolean;
  memberCount: number;
  maxCapacity: number;
  pendingApplicationsCount?: number;
  description: string;
}

const USER_SQUADS: UserSquad[] = [
  {
    id: "t-neurovision",
    name: "NeuroVision Health",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    role: "Team Leader & Architect",
    isLeader: true,
    isMember: true,
    memberCount: 2,
    maxCapacity: 4,
    pendingApplicationsCount: 2,
    description: "Real-time EEG telemetry and seizure classification platform for clinical hospital beds.",
  },
  {
    id: "t-farmbot",
    name: "Autonomous FarmBot",
    eventId: "e3",
    eventTitle: "Stanford AgTech Fair",
    role: "Full Stack Dev",
    isLeader: false,
    isMember: true,
    memberCount: 3,
    maxCapacity: 4,
    description: "Automated crop monitoring robotics for university test beds.",
  },
  {
    id: "t1",
    name: "AI Agents Guild",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    role: "Applicant (Not a member)",
    isLeader: false,
    isMember: false,
    memberCount: 3,
    maxCapacity: 4,
    description: "Autonomous task orchestrator with self-healing tools & local LLM reasoning. Submitted application pending review.",
  },
];

export function ProfileSplit() {
  const { jobId, isUploading, status, profileData } = useJobContext();
  const { user } = useUser();
  const navigate = useNavigate();
  const [showClerkSettings, setShowClerkSettings] = useState(false);

  // Fallback demo profile
  const defaultProfile = {
    name: user?.fullName || "Swastik Nagpal",
    title: "Full-Stack Engineer & Autonomous Systems Builder",
    university: "Stanford University",
    department: "Computer Science (BS '26)",
    location: "Stanford, California, United States",
    summary:
      "Passionate about distributed backend architectures, vector search systems, and high-performance developer tools. Previously built real-time streaming telemetry and LLM agent harnesses. Actively seeking teammates for TreeHacks 2026.",
    skills: [
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "Python",
      "FastAPI",
      "Docker",
      "Redis",
      "Tailwind CSS",
      "Vector Embeddings",
    ],
    education: [
      {
        college: "Stanford University",
        degree: "B.S. in Computer Science (Artificial Intelligence Track)",
        year: "2022 – 2026",
      },
    ],
    experience: [
      {
        role: "Software Engineering Fellow",
        company: "Stanford Distributed Systems Lab",
        duration: "Jun 2025 – Present",
        bullet_points: [
          "Engineered distributed consensus benchmarking suite for Raft-based distributed key-value stores.",
          "Optimized sub-millisecond gRPC streaming between worker nodes under artificial network partition simulations.",
        ],
      },
      {
        role: "Backend Engineering Intern",
        company: "Scale AI",
        duration: "Jun 2024 – Aug 2024",
        bullet_points: [
          "Developed high-throughput data pipelines indexing 5M+ multimodal synthetic samples daily.",
          "Reduced Postgres cold query latency by 42% through targeted composite indexing and Redis cache invalidation.",
        ],
      },
    ],
    projects: [
      {
        name: "SquadUp Autonomous Formation",
        description: "Intelligent team matching engine using taxonomy graph alignment and skill compatibility vectors.",
        bullet_points: [
          "Built asynchronous resume parsing engine with PDF extraction and Redis queue workers.",
          "Designed polymorphic match scoring tiered by campus eligibility and domain strengths.",
        ],
      },
    ],
  };

  const activeData = {
    name: profileData?.name || defaultProfile.name,
    title: profileData?.title || defaultProfile.title,
    university: profileData?.university || defaultProfile.university,
    department: "Computer Science (BS '26)",
    location: "Stanford, California, United States",
    summary: profileData?.summary || defaultProfile.summary,
    skills: profileData?.skills && profileData.skills.length > 0 ? profileData.skills : defaultProfile.skills,
    education: profileData?.education && profileData.education.length > 0 ? profileData.education : defaultProfile.education,
    experience: profileData?.experience && profileData.experience.length > 0 ? profileData.experience : defaultProfile.experience,
    projects: profileData?.projects && profileData.projects.length > 0 ? profileData.projects : defaultProfile.projects,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Clerk User Management Modal */}
      {showClerkSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowClerkSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm bg-slate-100 p-2 rounded-full cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-black text-slate-900 mb-4 font-heading">
              Clerk Account & Authentication Settings
            </h3>
            <UserProfile routing="hash" />
          </div>
        </div>
      )}

      {/* Uploading Status Banner */}
      {jobId && isUploading && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin shrink-0" />
          <div>
            <h3 className="text-sm font-black text-blue-950">Ingesting Resume & Synthesizing Profile...</h3>
            <p className="text-xs text-blue-800 mt-0.5">{status || "Extracting semantic competencies..."}</p>
          </div>
        </div>
      )}

      {/* 2-PART RADICAL SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT SIDE (5 COLS): IDENTITY & BIO ================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identity Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Banner */}
            <div className="h-32 w-full bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_50%)]" />
            </div>

            {/* Avatar & Personal Info */}
            <div className="p-6 pt-0 space-y-4">
              {/* Avatar Hanging Over Banner - square with heavily rounded corners */}
              <div className="flex items-end justify-between -mt-12 mb-2 relative z-10">
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md bg-white overflow-hidden shrink-0">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={activeData.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center text-3xl font-black font-heading rounded-xl">
                      {activeData.name ? activeData.name[0] : "S"}
                    </div>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Student
                </span>
              </div>

              {/* Name & Headline */}
              <div>
                <h1 className="text-2xl font-black text-slate-900 font-heading">
                  {activeData.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-snug">
                  {activeData.title}
                </p>
              </div>

              {/* Affiliation & Resume links */}
              <div className="space-y-1.5 text-xs text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>{activeData.university}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{activeData.department}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeData.location}</span>
                </div>
                <div className="pt-1">
                  <a
                    href="#resume"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Opening verified resume PDF preview.");
                    }}
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Resume PDF <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Action Buttons: Account Settings & Update Resume */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowClerkSettings(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Account</span>
                </button>

                <Link
                  to="/resume-upload"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Update Profile</span>
                </Link>
              </div>

              {/* About Section */}
              <div className="pt-4 border-t border-slate-100 space-y-1">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  About
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {activeData.summary}
                </p>
              </div>
            </div>
          </div>

          {/* Education Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 font-heading uppercase tracking-wider">
              Academic Background
            </h3>
            <div className="space-y-3">
              {activeData.education.map((edu: any, i: number) => (
                <div key={i} className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">{edu.college}</h4>
                  <p className="text-xs text-slate-600 font-medium">{edu.degree}</p>
                  {edu.year && <p className="text-[11px] text-slate-400 font-medium">{edu.year}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE (7 COLS): SQUADS, SKILLS, EXP ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: "Teams / Squads" (Scrollable List as requested) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> My Squads
                </h2>
                <p className="text-xs text-slate-500">
                  Teams you are participating in or currently leading.
                </p>
              </div>

              <Link
                to="/teams"
                className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Explore More Squads <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Scrollable Squads Container */}
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
              {USER_SQUADS.map((squad) => (
                <div
                  key={squad.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    squad.isLeader
                      ? "bg-blue-50/30 border-blue-200 hover:border-blue-300"
                      : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-blue-600">
                          {squad.eventTitle}
                        </span>
                        {squad.isLeader ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                            <Crown className="w-3 h-3 text-blue-600" /> Squad Leader
                          </span>
                        ) : squad.isMember ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Member
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Application Pending
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 font-heading">
                        {squad.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {squad.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800 block">
                        {squad.memberCount} / {squad.maxCapacity} Spots
                      </span>
                      {squad.pendingApplicationsCount && squad.pendingApplicationsCount > 0 && (
                        <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {squad.pendingApplicationsCount} Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs">
                    <span className="text-slate-500 font-medium">
                      Status: <strong className="text-slate-800">{squad.role}</strong>
                    </span>

                    {squad.isLeader ? (
                      /* Manage Team Button for squads created by user */
                      <Link
                        to={`/team/${squad.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>Manage Team</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : squad.isMember ? (
                      /* View Team Button for joined squads */
                      <Link
                        to={`/team/${squad.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <span>View Team</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      /* Dedicated separate team page for team not a part of */
                      <Link
                        to={`/team/${squad.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                      >
                        <span>View Team Page</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Verified Skills */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 font-heading uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" /> Verified Skills
              </h3>
              <span className="text-xs text-slate-400">Derived from Resume</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeData.skills.map((skill: string, i: number) => (
                <SkillTag key={i} skill={skill} isMatched={["PostgreSQL", "React", "Python"].includes(skill)} />
              ))}
            </div>
          </div>

          {/* Section 3: Experience */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-900 font-heading uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-600" /> Experience
            </h3>

            <div className="space-y-5">
              {activeData.experience.map((exp: any, i: number) => (
                <div key={i} className="space-y-1.5 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {exp.role} <span className="text-blue-600 font-semibold">@ {exp.company}</span>
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">{exp.duration}</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    {exp.bullet_points?.map((bp: string, j: number) => (
                      <li key={j} className="leading-relaxed">
                        {bp}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Projects */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-900 font-heading uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" /> Projects
            </h3>

            <div className="space-y-5">
              {activeData.projects.map((proj: any, i: number) => (
                <div key={i} className="space-y-1.5 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <h4 className="text-sm font-bold text-slate-900">{proj.name}</h4>
                  <p className="text-xs text-slate-600">{proj.description}</p>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    {proj.bullet_points?.map((bp: string, j: number) => (
                      <li key={j} className="leading-relaxed">
                        {bp}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

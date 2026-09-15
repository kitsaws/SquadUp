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
  Columns,
  MapPin,
  Mail,
} from "lucide-react";
import { SkillTag } from "../components/Badges";

export function Profile() {
  const { jobId, isUploading, status, profileData } = useJobContext();
  const { user } = useUser();
  const navigate = useNavigate();
  const [showClerkSettings, setShowClerkSettings] = useState(false);

  // Fallback demo profile for preview/design demonstration
  const defaultProfile = {
    name: user?.fullName || "Swastik Nagpal",
    title: "Full-Stack Engineer & Autonomous Systems Builder | Distributed Backend Architecture",
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Switcher Banner: Compare Classic LinkedIn vs Split View */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Columns className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs text-blue-950 font-medium">
            Viewing <strong>Classic LinkedIn Profile View</strong>. Try the radical 2-column layout with embedded squads!
          </span>
        </div>
        <Link
          to="/profile-split"
          className="text-xs font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-xl shadow-2xs transition-all"
        >
          Switch to Split View →
        </Link>
      </div>

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
            <h3 className="text-lg font-bold text-slate-900 mb-4 font-heading">
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
            <h3 className="text-sm font-bold text-blue-950">Ingesting Resume & Synthesizing Profile...</h3>
            <p className="text-xs text-blue-800 mt-0.5">{status || "Extracting semantic competencies..."}</p>
          </div>
        </div>
      )}

      {/* LinkedIn-Style Hero Card: Separate Banner, Avatar & Flowed Content */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Full Clean Banner */}
        <div className="h-44 sm:h-52 w-full bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_50%)]" />
        </div>

        {/* Card Body with Avatar Hanging and All Text Cleanly Below */}
        <div className="px-6 sm:px-8 pb-8 pt-0">
          {/* Top Avatar Row + Right-Aligned Action Buttons */}
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Square with heavily rounded corners */}
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl border-4 border-white shadow-md bg-white overflow-hidden shrink-0">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={activeData.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center text-4xl font-black font-heading rounded-xl">
                  {activeData.name ? activeData.name[0] : "S"}
                </div>
              )}
            </div>

            {/* Action Buttons (Cleanly positioned on the right, below the banner) */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClerkSettings(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </button>

              <Link
                to="/resume-upload"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Update Resume</span>
              </Link>
            </div>
          </div>

          {/* Textual Information: Full Name, Verification, Headline, Education */}
          <div className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                  {activeData.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Student
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-700 font-medium mt-1 max-w-3xl leading-snug">
                {activeData.title}
              </p>
            </div>

            {/* Sub-meta: Campus, Location & Resume PDF */}
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500 font-medium pt-1">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                {activeData.university}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                {activeData.department}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {activeData.location}
              </span>
              <span>•</span>
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

            {/* Quick Status Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                Open to TreeHacks 2026 Squads
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Fall 2026 Recruiting
              </span>
            </div>
          </div>

          {/* About Section */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About</h3>
            <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
              {activeData.summary}
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Content Grid: Left Skills/Education + Right Experience/Projects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Skills & Education */}
        <div className="space-y-6">
          {/* Verified Skills */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-heading uppercase tracking-wider">
                Verified Skills
              </h3>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>

            <div className="flex flex-wrap gap-2">
              {activeData.skills.map((skill: string, i: number) => (
                <SkillTag key={i} skill={skill} isMatched={["PostgreSQL", "React", "Python"].includes(skill)} />
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              * Green tags denote verified skills matched with active hackathon team vacancies.
            </p>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-heading uppercase tracking-wider">
              Education
            </h3>
            <div className="space-y-4">
              {activeData.education.map((edu: any, i: number) => (
                <div key={i} className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{edu.college}</h4>
                  <p className="text-xs text-slate-600">{edu.degree}</p>
                  {edu.year && <p className="text-[11px] text-slate-400 font-medium">{edu.year}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Experience & Projects */}
        <div className="md:col-span-2 space-y-6">
          {/* Work & Research Experience */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-heading uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-600" /> Experience
              </h3>
              <span className="text-xs text-slate-400">Extracted from Resume</span>
            </div>

            <div className="space-y-6">
              {activeData.experience.map((exp: any, i: number) => (
                <div key={i} className="space-y-2 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {exp.role} <span className="text-blue-600 font-medium">@ {exp.company}</span>
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">{exp.duration}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
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

          {/* Project Highlights */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-heading uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-600" /> Projects
              </h3>
            </div>

            <div className="space-y-6">
              {activeData.projects.map((proj: any, i: number) => (
                <div key={i} className="space-y-2 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                  <h4 className="text-sm font-bold text-slate-900">{proj.name}</h4>
                  <p className="text-xs text-slate-600">{proj.description}</p>
                  <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
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

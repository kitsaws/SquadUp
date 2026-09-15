import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Shield,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Crown,
} from "lucide-react";
import { TeamCardData } from "../components/TeamCard";
import { RecommendationBadge, SkillTag } from "../components/Badges";
import { SmartRecommendationPanel } from "../components/SmartRecommendationPanel";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
} from "../components/CandidateApplicationTile";

interface ExtendedTeamData extends TeamCardData {
  isUserLeader?: boolean;
  isUserMember?: boolean;
}

const ALL_TEAMS_DATA: ExtendedTeamData[] = [
  {
    id: "t-neurovision",
    name: "NeuroVision Health",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "Stanford University",
    requirements: ["PostgreSQL", "FastAPI", "React", "Distributed Systems"],
    neededRequirement: "PostgreSQL",
    taxonomyScore: 0.98,
    category: "BEST",
    description: "Real-time EEG telemetry and seizure classification platform for clinical hospital beds.",
    members: [
      { id: "m-swastik", name: "Swastik Nagpal", role: "Team Leader" },
      { id: "m-sofia", name: "Sofia Rodriguez", role: "ML Engineer" },
    ],
    maxCapacity: 4,
    isUserLeader: true,
  },
  {
    id: "t1",
    name: "AI Agents Guild",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "Stanford University",
    requirements: ["React", "FastAPI", "PostgreSQL"],
    neededRequirement: "PostgreSQL",
    taxonomyScore: 0.94,
    category: "BEST",
    description: "Autonomous task orchestrator with self-healing tools & local LLM reasoning.",
    members: [
      { id: "m1", name: "Jane Doe" },
      { id: "m2", name: "Marcus Chen" },
      { id: "m3", name: "Sofia Rodriguez" },
    ],
    maxCapacity: 4,
  },
  {
    id: "t2",
    name: "CloudScale Engine",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "UC Berkeley (Global Event Eligible)",
    requirements: ["Docker", "Python", "Kubernetes"],
    neededRequirement: "Kubernetes",
    taxonomyScore: 0.85,
    category: "GOOD_DIFFERENT_UNIVERSITY",
    description: "Distributed telemetry backend and edge cluster orchestrator for IoT fleets.",
    members: [
      { id: "m4", name: "Liam Vance" },
      { id: "m5", name: "Maya Lin" },
    ],
    maxCapacity: 4,
  },
  {
    id: "t3",
    name: "Campus Rover Robotics",
    eventId: "e3",
    eventTitle: "Stanford Robotics Fair",
    university: "Stanford University",
    requirements: ["C++", "ROS", "Python"],
    neededRequirement: "C++",
    taxonomyScore: 0.65,
    category: "SAME_UNIVERSITY_LOWER_SCORE",
    description: "Indoor delivery autonomous ground vehicle targeting campus dining corridors.",
    members: [
      { id: "m6", name: "Ethan Hunt" },
      { id: "m7", name: "Chloe Bennett" },
      { id: "m8", name: "Zack Taylor" },
    ],
    maxCapacity: 5,
  },
  {
    id: "t4",
    name: "ZeroKnowledge Identity",
    eventId: "e2",
    eventTitle: "CalHacks 12.0",
    university: "UC Berkeley",
    requirements: ["Solidity", "TypeScript", "Rust"],
    neededRequirement: "Rust",
    taxonomyScore: 0.88,
    category: "GOOD_DIFFERENT_UNIVERSITY",
    description: "Privacy-preserving zero-knowledge collegiate credential verification protocol.",
    members: [
      { id: "m9", name: "Aria Thorne" },
      { id: "m10", name: "Derek Zhao" },
    ],
    maxCapacity: 4,
  },
  {
    id: "t5",
    name: "PulseMed Analytics",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "Stanford University",
    requirements: ["PyTorch", "FastAPI", "Next.js"],
    neededRequirement: "Next.js",
    taxonomyScore: 0.92,
    category: "BEST",
    description: "High-throughput ICU vital telemetry analyzer using lightweight edge vision transformers.",
    members: [
      { id: "m11", name: "Dr. Alicia Keys" },
      { id: "m12", name: "Kenji Sato" },
      { id: "m13", name: "Amara Okonjo" },
    ],
    maxCapacity: 4,
  },
  {
    id: "t-farmbot",
    name: "Autonomous FarmBot",
    eventId: "e3",
    eventTitle: "Stanford AgTech Fair",
    university: "Stanford University",
    requirements: ["Embedded C", "Circuit Design", "Python", "React"],
    neededRequirement: "Embedded C",
    taxonomyScore: 0.78,
    category: "SAME_UNIVERSITY_LOWER_SCORE",
    description: "Automated crop monitoring robotics for university test beds.",
    members: [
      { id: "m-user-2", name: "Swastik Nagpal", role: "Full Stack Dev" },
      { id: "m14", name: "Tara West", role: "Lead" },
      { id: "m15", name: "Nikhil Rao", role: "Hardware Engineer" },
    ],
    maxCapacity: 4,
    isUserMember: true,
  },
  {
    id: "t6",
    name: "OpenLLM Benchmark Suite",
    eventId: "e2",
    eventTitle: "CalHacks 12.0",
    university: "UC Berkeley",
    requirements: ["PyTorch", "CUDA", "C++"],
    neededRequirement: "CUDA",
    description: "Standardized evaluation harness and quantization benchmarks for open-weights LLMs.",
    members: [
      { id: "m16", name: "Chen Wei" },
      { id: "m17", name: "Sarah Jenkins" },
    ],
    maxCapacity: 4,
  },
  {
    id: "t7",
    name: "FinTech Algorithmic Ledger",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "Harvard University (Global Event Eligible)",
    requirements: ["Solidity", "Go", "Rust"],
    neededRequirement: "Solidity",
    description: "High-frequency decentralized order book and atomic cross-chain settlement engine.",
    members: [
      { id: "m18", name: "David Kim" },
      { id: "m19", name: "Elena Rostova" },
    ],
    maxCapacity: 4,
  },
];

const INITIAL_APPLICATIONS: CandidateApplicationData[] = [
  {
    id: "app-1",
    candidateId: "cand-101",
    name: "Alex Rivera",
    university: "Stanford University",
    year: "CS Junior",
    appliedRole: "PostgreSQL & Distributed Lead",
    matchScore: 0.94,
    isCampusMatch: true,
    appliedTimeAgo: "2 hours ago",
    coverNote:
      "Hey Swastik! I saw NeuroVision Health on the TreeHacks board. I spent last summer optimizing time-series ingestion pipelines at Datadog with TimescaleDB & PostgreSQL. Would love to own your telemetry storage layer!",
    skills: [
      { name: "PostgreSQL", provenance: "Resume: Datadog Internship", score: 0.96 },
      { name: "Distributed Systems", provenance: "Course: CS 244B", score: 0.92 },
      { name: "Go / Python", provenance: "GitHub: @alex-rivera", score: 0.88 },
    ],
    status: "PENDING",
  },
  {
    id: "app-2",
    candidateId: "cand-102",
    name: "Priya Sharma",
    university: "UC Berkeley (Global Eligible)",
    year: "EECS Senior",
    appliedRole: "FastAPI Backend Specialist",
    matchScore: 0.86,
    isCampusMatch: false,
    appliedTimeAgo: "5 hours ago",
    coverNote:
      "Hi! I build async python microservices for the Berkeley AI Research Lab. I saw your autonomous task routing requirements and have built similar event loops with Celery and Redis.",
    skills: [
      { name: "FastAPI", provenance: "BAIR Research Repo", score: 0.91 },
      { name: "Redis", provenance: "CalHacks 11 Winning Project", score: 0.84 },
      { name: "Docker", provenance: "Production Deployments", score: 0.82 },
    ],
    status: "PENDING",
  },
  {
    id: "app-3",
    candidateId: "cand-103",
    name: "Devon Clark",
    university: "Stanford University",
    year: "Symbolic Systems '26",
    appliedRole: "UI/UX & Frontend Architect",
    matchScore: 0.89,
    isCampusMatch: true,
    appliedTimeAgo: "1 day ago",
    coverNote:
      "Excited about building high-fidelity human-in-the-loop interfaces for real-time EEG telemetry. I have built design systems in React and Tailwind v4.",
    skills: [
      { name: "React", provenance: "Stanford Daily Web Lead", score: 0.95 },
      { name: "Tailwind CSS", provenance: "Design Systems Portfolio", score: 0.94 },
      { name: "WebSockets", provenance: "Interactive Telemetry Demo", score: 0.79 },
    ],
    status: "ACCEPTED",
  },
];

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const team = ALL_TEAMS_DATA.find((t) => t.id === id) || ALL_TEAMS_DATA[0];

  const [applications, setApplications] = useState<CandidateApplicationData[]>(INITIAL_APPLICATIONS);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const userVerifiedSkills = ["PostgreSQL", "React", "Python", "TypeScript", "FastAPI", "Docker"];

  const handleApplySuccess = () => {
    setApplied(true);
    setIsApplyModalOpen(false);
    setToastMessage("Application submitted! Squad leaders have received your dossier.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAcceptApplicant = (appId: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: "ACCEPTED" } : a))
    );
    const candidate = applications.find((a) => a.id === appId);
    setToastMessage(`✓ ${candidate?.name || "Candidate"} accepted to your squad!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeclineApplicant = (appId: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: "REJECTED" } : a))
    );
    const candidate = applications.find((a) => a.id === appId);
    setToastMessage(`Application from ${candidate?.name || "Candidate"} declined.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <Link
          to="/teams"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Teams Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          {team.isUserLeader && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              👑 You are Squad Leader
            </span>
          )}
        </div>
      </div>

      {/* Conditional Layout: Leader Management Dashboard vs Standard Squad Dossier */}
      {team.isUserLeader ? (
        /* ================= LEADER MANAGEMENT DASHBOARD ================= */
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    Squad Leader Dashboard
                  </span>
                  <span className="text-xs text-slate-400">• {team.eventTitle}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
                  {team.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                  {team.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Active Formation
                </span>
              </div>
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span>Squad Roster</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-black text-slate-900 font-heading">
                  {team.members.length + applications.filter((a) => a.status === "ACCEPTED").length} / {team.maxCapacity || 4} Spots
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Target: Finalized before kickoff
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span>Candidate Applications</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl font-black text-slate-900 font-heading">
                  {applications.filter((a) => a.status === "PENDING").length} Pending
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {applications.length} total candidate submissions
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span>Primary Role Vacancy</span>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl font-black text-slate-900 font-heading">
                  {team.neededRequirement}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Core capability seeking specialist
                </p>
              </div>
            </div>
          </div>

          {/* Incoming Applications List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading">
                  Incoming Applications & Candidate Review
                </h2>
                <p className="text-xs text-slate-500">
                  Tiles are collapsed by default. Click any candidate to view their note, verified skills, and direct profile link.
                </p>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {applications.length} Candidates
              </span>
            </div>

            <div className="space-y-3">
              {applications.map((app) => (
                <CandidateApplicationTile
                  key={app.id}
                  application={app}
                  defaultExpanded={false}
                  onAccept={handleAcceptApplicant}
                  onDecline={handleDeclineApplicant}
                />
              ))}
            </div>
          </div>

          {/* Current Roster */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-lg font-black text-slate-900 font-heading">
              Current Squad Members
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.members.map((member, idx) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm">
                    {member.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {member.name}
                      </h4>
                      {member.id === "m-swastik" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          Leader (You)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{member.role || "Core Contributor"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ================= STANDARD SQUAD DOSSIER ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {team.category ? (
                      <RecommendationBadge category={team.category} score={team.taxonomyScore} />
                    ) : (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        General Squad
                      </span>
                    )}
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      {team.eventTitle}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
                    {team.name}
                  </h1>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    Affiliation: {team.university}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                    Roster Capacity
                  </span>
                  <span className="text-xl font-bold text-slate-900">
                    {team.members.length} / {team.maxCapacity || 4} Members
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Squad Mission & Objectives
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {team.description}
                </p>
              </div>

              {/* Tech Stack */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Required Tech Stack & Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {team.requirements.map((req) => (
                    <SkillTag
                      key={req}
                      skill={req}
                      isMatched={userVerifiedSkills.includes(req)}
                    />
                  ))}
                </div>
              </div>

              {/* Open Role Highlight */}
              {team.neededRequirement && (
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-950">
                      Actively Recruiting: {team.neededRequirement} Specialist
                    </h4>
                    <p className="text-xs text-blue-800 mt-1">
                      Our architecture relies on real-time indexing and low-latency transactional guarantees.
                      Candidates with verified practical experience will receive immediate priority review.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Squad Roster */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-heading">
                    Current Squad Roster
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified team members currently committed to this project.
                  </p>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {team.maxCapacity ? team.maxCapacity - team.members.length : 1} Spot Remaining
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {team.members.map((member, idx) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {member.name}
                        </h4>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {idx === 0 ? "Squad Founder & Architect" : "Core Contributor"}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="p-3.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-dashed border-blue-400 bg-white flex items-center justify-center text-blue-600 text-sm">
                    <Plus className="w-4 h-4" />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-blue-900">
                      Open Slot ({team.neededRequirement})
                    </h4>
                    <p className="text-xs text-blue-700">Awaiting your application</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Smart Recommendation Panel */}
          <div className="space-y-6">
            <SmartRecommendationPanel
              recommendation={{
                teamId: team.id,
                teamName: team.name,
                category: team.category,
                taxonomyScore: team.taxonomyScore,
                fulfilledRequirements: team.requirements.filter((r) =>
                  userVerifiedSkills.includes(r)
                ).length,
                totalRequirements: team.requirements.length,
                teamLeadName: team.members[0]?.name || "Team Lead",
                teamLeadUniversity: team.university,
                sameUniversity: (team.university || "").toLowerCase().includes("stanford"),
                requirements: team.requirements,
                userVerifiedSkills: userVerifiedSkills,
              }}
              isRecommended={Boolean(team.category && team.taxonomyScore !== undefined)}
              onApply={() => setIsApplyModalOpen(true)}
              hasApplied={applied}
            />
          </div>
        </div>
      )}

      {/* Apply Team Modal */}
      {!team.isUserLeader && (
        <ApplyTeamModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          team={team}
          onSubmit={handleApplySuccess}
        />
      )}
    </div>
  );
}

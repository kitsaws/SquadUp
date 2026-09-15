import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Users,
  Shield,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  Check,
  X,
  ExternalLink,
  Crown,
} from "lucide-react";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { CategoryLegend } from "../components/CategoryLegend";
import { SmartRecommendationPanel } from "../components/SmartRecommendationPanel";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import { RecommendationBadge, ScopeBadge, SkillTag } from "../components/Badges";
import { CompatibilityScoreRing } from "../components/CompatibilityScoreRing";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
} from "../components/CandidateApplicationTile";

export interface ExtendedTeamData extends TeamCardData {
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

type SortOption = "FIT_DESC" | "FIT_ASC" | "SPOTS_DESC" | "NAME_ASC";

export function TeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get("id");

  // Dynamic state: inspected team (split view drawer) vs full page view
  const [inspectedTeam, setInspectedTeam] = useState<ExtendedTeamData | null>(null);
  const [selectedTeamFull, setSelectedTeamFull] = useState<ExtendedTeamData | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [appliedTeamIds, setAppliedTeamIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toggle inspection: If the same team is clicked twice, hide the drawer and return to 3-col grid.
  // When making active, scroll the whole page so selected team is at the top.
  const handleInspectToggle = (team: ExtendedTeamData) => {
    if (inspectedTeam?.id === team.id) {
      setInspectedTeam(null);
    } else {
      setInspectedTeam(team);
      setTimeout(() => {
        const el = document.getElementById(`team-card-${team.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
    }
  };

  // Filter & Sort State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [filterCampus, setFilterCampus] = useState<string>("ALL");
  const [filterOpenSpotsOnly, setFilterOpenSpotsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>("FIT_DESC"); // Default sort: FitScore

  // Candidate applications for leader view
  const [applications, setApplications] = useState<CandidateApplicationData[]>(INITIAL_APPLICATIONS);

  // User verified skills for requirement alignment
  const userVerifiedSkills = ["PostgreSQL", "React", "Python", "TypeScript", "FastAPI", "Docker"];

  // Sync with URL query param if present
  useEffect(() => {
    if (teamIdParam) {
      const match = ALL_TEAMS_DATA.find((t) => t.id === teamIdParam);
      if (match) {
        if (match.isUserLeader) {
          setSelectedTeamFull(match);
        } else {
          setInspectedTeam(match);
        }
      }
    }
  }, [teamIdParam]);

  // Filtering & Sorting
  const filteredTeams = ALL_TEAMS_DATA.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      team.requirements.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter by tier
    if (filterTier === "BEST" && team.category !== "BEST") return false;
    if (filterTier === "CROSS_CAMPUS" && team.category !== "GOOD_DIFFERENT_UNIVERSITY") return false;
    if (filterTier === "CAMPUS_EXPLORER" && team.category !== "SAME_UNIVERSITY_LOWER_SCORE") return false;

    // Filter by campus
    if (filterCampus === "STANFORD" && !team.university?.toLowerCase().includes("stanford")) return false;
    if (filterCampus === "GLOBAL" && !team.university?.toLowerCase().includes("global")) return false;

    // Filter open spots
    if (filterOpenSpotsOnly) {
      const spotsLeft = (team.maxCapacity || 4) - team.members.length;
      if (spotsLeft <= 0) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === "FIT_DESC") {
      return (b.taxonomyScore || 0) - (a.taxonomyScore || 0);
    }
    if (sortBy === "FIT_ASC") {
      return (a.taxonomyScore || 0) - (b.taxonomyScore || 0);
    }
    if (sortBy === "SPOTS_DESC") {
      const aSpots = (a.maxCapacity || 4) - a.members.length;
      const bSpots = (b.maxCapacity || 4) - b.members.length;
      return bSpots - aSpots;
    }
    if (sortBy === "NAME_ASC") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const activeFilterCount =
    (filterTier !== "ALL" ? 1 : 0) +
    (filterCampus !== "ALL" ? 1 : 0) +
    (filterOpenSpotsOnly ? 1 : 0);

  const handleApplySuccess = (teamId: string) => {
    setAppliedTeamIds((prev) => [...prev, teamId]);
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

  const sortLabels: Record<SortOption, string> = {
    FIT_DESC: "Fit Score (Highest)",
    FIT_ASC: "Fit Score (Lowest)",
    SPOTS_DESC: "Open Spots (Most)",
    NAME_ASC: "Squad Name (A-Z)",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FULL PAGE VIEW: Used for Full Squad Leader Dashboard or Full Dossier */}
      {selectedTeamFull ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Header navigation bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <button
              onClick={() => {
                setSelectedTeamFull(null);
                setSearchParams({});
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Teams Directory</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Viewing Squad:</span>
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                {selectedTeamFull.name}
              </span>
              {selectedTeamFull.isUserLeader && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  👑 You are Squad Leader
                </span>
              )}
            </div>
          </div>

          {/* Leader Management View */}
          {selectedTeamFull.isUserLeader ? (
            <div className="space-y-8">
              {/* Leader Squad Summary Header */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        Squad Leader Dashboard
                      </span>
                      <span className="text-xs text-slate-400">• {selectedTeamFull.eventTitle}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
                      {selectedTeamFull.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                      {selectedTeamFull.description}
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
                      {selectedTeamFull.members.length + applications.filter((a) => a.status === "ACCEPTED").length} / {selectedTeamFull.maxCapacity || 4} Spots
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
                      {applications.length} total submissions received
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                      <span>Primary Need</span>
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-black text-slate-900 font-heading">
                      {selectedTeamFull.neededRequirement}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Core capability seeking lead
                    </p>
                  </div>
                </div>
              </div>

              {/* Embedded Candidate Applications List */}
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

              {/* Roster & Squad Members */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Current Squad Members
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedTeamFull.members.map((member, idx) => (
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
            /* Full view for non-leader squads */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <RecommendationBadge category={selectedTeamFull.category || "BEST"} score={selectedTeamFull.taxonomyScore} />
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                          {selectedTeamFull.eventTitle}
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
                        {selectedTeamFull.name}
                      </h1>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <Shield className="w-3.5 h-3.5 text-blue-600" />
                        Affiliation: {selectedTeamFull.university}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                        Roster Capacity
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {selectedTeamFull.members.length} / {selectedTeamFull.maxCapacity || 4} Members
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    {selectedTeamFull.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Required Tech Stack & Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeamFull.requirements.map((req) => (
                        <SkillTag
                          key={req}
                          skill={req}
                          isMatched={userVerifiedSkills.includes(req)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <SmartRecommendationPanel
                  recommendation={{
                    teamId: selectedTeamFull.id,
                    teamName: selectedTeamFull.name,
                    category: selectedTeamFull.category || "BEST",
                    taxonomyScore: selectedTeamFull.taxonomyScore || 0.9,
                    fulfilledRequirements: 2,
                    totalRequirements: selectedTeamFull.requirements.length,
                    teamLeadName: selectedTeamFull.members[0]?.name || "Team Lead",
                    teamLeadUniversity: selectedTeamFull.university,
                    sameUniversity: selectedTeamFull.category === "BEST",
                    breakdown: [
                      {
                        requirementName: selectedTeamFull.neededRequirement || selectedTeamFull.requirements[0],
                        score: 0.95,
                        isDirectMatch: true,
                        provenanceSource: "Verified Resume Skill",
                        snippet: "Demonstrated direct capability in production / hackathon projects.",
                        explanation: `Your verified experience directly matches this squad's open slot.`,
                      },
                      {
                        requirementName: selectedTeamFull.requirements[0],
                        score: 0.88,
                        isDirectMatch: true,
                        provenanceSource: "Coursework / Lab",
                        explanation: "Complementary strengths aligned with current codebase requirements.",
                      },
                    ],
                  }}
                  onApply={() => setIsApplyModalOpen(true)}
                  hasApplied={appliedTeamIds.includes(selectedTeamFull.id)}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* DIRECTORY VIEW: Either 3-col grid OR dynamic 1-col + sticky inspection panel */
        <div className="space-y-6">
          {/* Header Title & CTA */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
                Squads & Teams Directory
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Discover active squads formed for upcoming hackathons, ranked by capability fit.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => alert("Create Squad wizard will open here.")}
                className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Squad
              </button>
            </div>
          </div>

          {/* Unified Coherent Search Bar + Legend Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-3">
            {/* Search Input + Filter & Sort Buttons */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search squads by name, tech stack, or mission..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Filter Button with left-aligned popup */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsFilterOpen(!isFilterOpen);
                    setIsSortOpen(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${activeFilterCount > 0
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Filter Pop-up: Starts at parent button left and extends to the right */}
                {isFilterOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-30 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Filter Squads
                      </h4>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={() => {
                            setFilterTier("ALL");
                            setFilterCampus("ALL");
                            setFilterOpenSpotsOnly(false);
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Recommendation Tier Filter - No balls! Text colored by accent, on hover takes accent bg and white text */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block">
                        Match Recommendation
                      </label>
                      <div className="space-y-1 text-xs">
                        {/* All Tiers */}
                        <button
                          type="button"
                          onClick={() => setFilterTier("ALL")}
                          className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${filterTier === "ALL"
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                          All Tiers
                        </button>

                        {/* Best Fit: text-emerald-600, hover:bg-emerald-500 hover:text-white */}
                        <button
                          type="button"
                          onClick={() => setFilterTier("BEST")}
                          className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${filterTier === "BEST"
                              ? "bg-emerald-600 text-white"
                              : "text-[#059669] hover:bg-[#10b981] hover:text-white"
                            }`}
                        >
                          Best Fit
                        </button>

                        {/* Cross-Campus: text-indigo-600, hover:bg-indigo-500 hover:text-white */}
                        <button
                          type="button"
                          onClick={() => setFilterTier("CROSS_CAMPUS")}
                          className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${filterTier === "CROSS_CAMPUS"
                              ? "bg-indigo-600 text-white"
                              : "text-[#4f46e5] hover:bg-[#6366F1] hover:text-white"
                            }`}
                        >
                          Cross-Campus
                        </button>

                        {/* Same Campus: text-amber-600, hover takes accent bg and text goes white */}
                        <button
                          type="button"
                          onClick={() => setFilterTier("CAMPUS_EXPLORER")}
                          className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${filterTier === "CAMPUS_EXPLORER"
                              ? "bg-amber-500 text-white"
                              : "text-[#d97706] hover:bg-[#d97706] hover:text-white"
                            }`}
                        >
                          Same Campus
                        </button>
                      </div>
                    </div>

                    {/* Campus Filter */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <label className="text-xs font-black text-slate-700 block">
                        Campus Scope
                      </label>
                      <div className="space-y-1 text-xs">
                        {[
                          { id: "ALL", label: "All Campuses" },
                          { id: "STANFORD", label: "Stanford University Only" },
                          { id: "GLOBAL", label: "Cross-Campus / Global" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFilterCampus(opt.id)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${filterCampus === opt.id
                                ? "bg-slate-900 text-white font-bold"
                                : "text-slate-700 hover:bg-slate-100"
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Open Spots Only Toggle */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterOpenSpotsOnly}
                          onChange={(e) => setFilterOpenSpotsOnly(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Hide Full Squads (Open Spots Only)</span>
                      </label>
                    </div>

                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Apply Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Sort Button with left-aligned popup */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsSortOpen(!isSortOpen);
                    setIsFilterOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sort:</span>
                  <span className="font-bold text-slate-900">{sortLabels[sortBy]}</span>
                </button>

                {/* Sort Pop-up: Starts at parent button left and extends to the right */}
                {isSortOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-2 py-1">
                      Sort Squads By
                    </div>
                    {(
                      [
                        { id: "FIT_DESC", label: "Fit Score (Highest)" },
                        { id: "FIT_ASC", label: "Fit Score (Lowest)" },
                        { id: "SPOTS_DESC", label: "Open Spots (Most)" },
                        { id: "NAME_ASC", label: "Squad Name (A-Z)" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSortBy(opt.id);
                          setIsSortOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${sortBy === opt.id
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        <span>{opt.label}</span>
                        {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subtle top border separating legend within the cohesive search card */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 px-1">
              <CategoryLegend />
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Showing {filteredTeams.length} of {ALL_TEAMS_DATA.length} squads
              </span>
            </div>
          </div>

          {/* DYNAMIC VIEW: Unified container with stable card width and smooth drawer slide-in */}
          <div className="flex flex-col lg:flex-row items-start gap-6 relative">
            {/* Cards Column: Keeps stable card size (original size) without flex-1 warping */}
            <div
              className={`w-full ${inspectedTeam ? "lg:w-[390px] xl:w-[420px] shrink-0" : ""
                }`}
            >
              {inspectedTeam && (
                <div className="flex items-center justify-between px-1 mb-3 text-xs text-slate-500 font-medium animate-in fade-in duration-200">
                  <span>Select a squad to inspect:</span>
                  <button
                    onClick={() => setInspectedTeam(null)}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              )}

              <div
                className={`grid gap-6 ${inspectedTeam
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  }`}
              >
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    id={`team-card-${team.id}`}
                    className="h-full scroll-mt-24"
                  >
                    <TeamCard
                      team={team}
                      isSelected={inspectedTeam?.id === team.id}
                      hasApplied={appliedTeamIds.includes(team.id)}
                      onInspect={() => handleInspectToggle(team)}
                      onApply={() => {
                        handleInspectToggle(team);
                        if (!team.isUserLeader) {
                          setIsApplyModalOpen(true);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Sticky Inspection Panel with smooth slide-in, compact sizing, and hover-only scrollbar */}
            {inspectedTeam && (
              <div
                key={inspectedTeam.id}
                className="w-full lg:flex-1 min-w-0 lg:sticky lg:top-20 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden hover:[scrollbar-width:thin] hover:[&::-webkit-scrollbar]:block hover:[&::-webkit-scrollbar]:w-1.5 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:rounded-full animate-in fade-in slide-in-from-right-8 duration-300 ease-out"
              >
                {/* Header & Close Button */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {inspectedTeam.category ? (
                        <RecommendationBadge
                          category={inspectedTeam.category}
                          score={inspectedTeam.taxonomyScore}
                        />
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          General Squad
                        </span>
                      )}
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {inspectedTeam.eventTitle}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                      {inspectedTeam.name}
                    </h2>

                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      {inspectedTeam.university}
                    </p>
                  </div>

                  <button
                    onClick={() => setInspectedTeam(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Close preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Team Mission */}
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Squad Mission
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {inspectedTeam.description}
                  </p>
                </div>

                {/* Skill & Requirement Alignment (Theme dynamically adapts to category & university) */}
                <div
                  className={`p-3.5 rounded-xl border space-y-3 ${inspectedTeam.category === "BEST"
                      ? "bg-emerald-50/60 border-emerald-200/90"
                      : inspectedTeam.category === "GOOD_DIFFERENT_UNIVERSITY"
                        ? "bg-indigo-50/60 border-indigo-200/90"
                        : inspectedTeam.category === "SAME_UNIVERSITY_LOWER_SCORE"
                          ? "bg-amber-50/60 border-amber-200/90"
                          : "bg-slate-50 border-slate-200/80"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      {inspectedTeam.category ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Skill Compatibility Fit
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-slate-400" /> Technical Alignment
                        </>
                      )}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {inspectedTeam.taxonomyScore !== undefined
                        ? `${Math.round(inspectedTeam.taxonomyScore * 100)}% Match`
                        : "Unranked Match"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <CompatibilityScoreRing
                      score={inspectedTeam.taxonomyScore}
                      category={inspectedTeam.category || "UNRATED"}
                      isUnrated={!inspectedTeam.category}
                      size={52}
                      strokeWidth={4.5}
                    />
                    <div className="space-y-0.5 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">
                        {inspectedTeam.neededRequirement
                          ? `Actively seeking ${inspectedTeam.neededRequirement} lead`
                          : inspectedTeam.category
                            ? "Matching your core technical competencies"
                            : "General technical vacancy"}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {inspectedTeam.category
                          ? "Your verified resume skills align with the squad's target architecture."
                          : "Compare required skills against your verified profile competencies below."}
                      </p>
                    </div>
                  </div>

                  {/* Requirements Alignment Pills */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Needs/Requirements:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectedTeam.requirements.map((req) => (
                        <SkillTag
                          key={req}
                          skill={req}
                          isMatched={userVerifiedSkills.includes(req)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Current Roster Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black uppercase tracking-wider text-slate-400">
                      Current Roster
                    </span>
                    <span className="text-slate-500 font-medium">
                      {inspectedTeam.members.length} / {inspectedTeam.maxCapacity || 4} spots filled
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {inspectedTeam.members.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="p-2 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                          {m.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {idx === 0 ? "Squad Lead" : "Contributor"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  {inspectedTeam.isUserLeader ? (
                    <Link
                      to={`/team/${inspectedTeam.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Crown className="w-4 h-4" /> Manage Applications & Roster →
                    </Link>
                  ) : appliedTeamIds.includes(inspectedTeam.id) ? (
                    <div className="w-full text-center py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                      ⏳ Application submitted • Pending leader review
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsApplyModalOpen(true)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Request to Join Squad <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Separate Team Page Route */}
                      <Link
                        to={`/team/${inspectedTeam.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Full Dossier ↗
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>


          {filteredTeams.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No matching squads found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try clearing your active filters or changing your search query.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterTier("ALL");
                  setFilterCampus("ALL");
                  setFilterOpenSpotsOnly(false);
                }}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Apply Team Modal */}
      {(inspectedTeam || selectedTeamFull) && (
        <ApplyTeamModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          team={inspectedTeam || selectedTeamFull!}
          onSubmit={handleApplySuccess}
        />
      )}
    </div>
  );
}

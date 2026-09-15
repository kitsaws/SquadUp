import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  ArrowRight,
  Shield,
  Sparkles,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
} from "../components/CandidateApplicationTile";

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

export function ApplicationsPage() {
  const [applications, setApplications] = useState<CandidateApplicationData[]>(INITIAL_APPLICATIONS);
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "ACCEPTED" | "REJECTED">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute stats
  const acceptedCount = applications.filter((a) => a.status === "ACCEPTED").length;
  const currentRosterCount = 2 + acceptedCount; // Initial 2 core members + accepted applicants
  const maxCapacity = 4;
  const isFull = currentRosterCount >= maxCapacity;

  const handleAccept = (id: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: "ACCEPTED" } : app))
    );
    const candidate = applications.find((a) => a.id === id);
    setToastMessage(`✓ ${candidate?.name || "Candidate"} accepted to your squad roster!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDecline = (id: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: "REJECTED" } : app))
    );
    const candidate = applications.find((a) => a.id === id);
    setToastMessage(`Application from ${candidate?.name || "Candidate"} declined.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredApplications = applications.filter((app) => {
    if (filterTab === "ALL") return true;
    return app.status === filterTab;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                Squad Leader Dashboard
              </span>
              <span className="text-xs text-slate-400">• TreeHacks 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              NeuroVision Health
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage incoming candidate applications and finalize your hackathon squad roster.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/teams"
              className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              View Squad Public Page
            </Link>
          </div>
        </div>

        {/* Telemetry Roster Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {/* Roster Capacity */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Squad Roster</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-heading">
              {currentRosterCount} / {maxCapacity} Spots
            </div>
            <p className="text-[11px] font-medium mt-1 text-slate-500">
              {isFull ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Roster Complete!
                </span>
              ) : (
                `${maxCapacity - currentRosterCount} spot remaining for recruitment`
              )}
            </p>
          </div>

          {/* Pending Applications */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-slate-900 font-heading">
              {applications.filter((a) => a.status === "PENDING").length} Candidates
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Awaiting your interview decision
            </p>
          </div>

          {/* Match Quality */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Avg. Compatibility</span>
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-emerald-700 font-heading">
              90% Fit
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              High alignment with database & systems needs
            </p>
          </div>
        </div>
      </div>

      {/* Applications List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Candidate Applications
            </h2>
            <p className="text-xs text-slate-500">
              Click any candidate row to view their detailed dossier, note, and profile link.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "PENDING", label: "Pending" },
                { id: "ACCEPTED", label: "Accepted" },
                { id: "REJECTED", label: "Declined" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterTab === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tiles list (collapsed by default) */}
        <div className="space-y-3">
          {filteredApplications.map((app) => (
            <CandidateApplicationTile
              key={app.id}
              application={app}
              defaultExpanded={false}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ))}

          {filteredApplications.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                No applications in this view
              </h4>
              <p className="text-xs text-slate-500">
                Switch to "All" to inspect candidates across all stages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

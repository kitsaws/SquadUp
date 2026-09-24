import React, { useState, useEffect } from "react";
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
  Loader2,
  Trash2,
  ExternalLink,
  Crown,
  FileText,
} from "lucide-react";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
  cleanProvenanceText,
} from "../components/CandidateApplicationTile";
import { RecommendationTier } from "../components/Badges";
import {
  applicationsApi,
  profileApi,
  IncomingApplicationItem,
  CandidateApplicationItem,
  UserProfileResponse,
} from "../services/api";

export function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<"INCOMING" | "SUBMITTED">("INCOMING");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "REJECTED">("ALL");

  const [incomingApplications, setIncomingApplications] = useState<CandidateApplicationData[]>([]);
  const [myApplications, setMyApplications] = useState<CandidateApplicationItem[]>([]);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load incoming & candidate applications
  useEffect(() => {
    let isMounted = true;

    async function loadApplicationsData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch profile to check if user leads teams
        let userProfile: UserProfileResponse | null = null;
        try {
          userProfile = await profileApi.getProfile();
          if (isMounted) setProfile(userProfile);
        } catch {
          // unauthenticated
        }

        // 2. Fetch incoming applications (for squad leaders)
        try {
          const incomingRes = await applicationsApi.getIncomingApplications();
          if (isMounted) {
            const mapped: CandidateApplicationData[] = (incomingRes.applications || []).map((app: IncomingApplicationItem) => {
              let category: RecommendationTier | undefined;
              const score = app.matchScore || 0;
              if (app.isCampusMatch && score >= 0.7) {
                category = "BEST";
              } else if (!app.isCampusMatch && score >= 0.65) {
                category = "GOOD_DIFFERENT_UNIVERSITY";
              } else if (app.isCampusMatch) {
                category = "SAME_UNIVERSITY_LOWER_SCORE";
              }

              return {
                id: app.id,
                candidateId: app.candidateId,
                name: app.name,
                avatarUrl: app.avatarUrl || undefined,
                university: app.university,
                year: app.year || "Student",
                appliedRole: `${app.appliedRole} • ${app.teamName}`,
                matchScore: score,
                isCampusMatch: app.isCampusMatch,
                appliedTimeAgo: app.appliedTimeAgo || "Recently",
                coverNote: app.coverNote || "Applied to join your squad.",
                skills: (app.skills || []).map((s) => ({
                  name: s.name,
                  provenance: cleanProvenanceText(s.provenance, s.name, s.score),
                  score: s.score,
                })),
                status: app.status,
                category,
              };
            });
            setIncomingApplications(mapped);
          }
        } catch (e) {
          console.warn("[ApplicationsPage] Error loading incoming applications:", e);
        }

        // 3. Fetch candidate's own submitted applications
        try {
          const myAppsRes = await applicationsApi.getMyApplications();
          if (isMounted) {
            setMyApplications(myAppsRes.applications || []);
            // If user has no incoming applications but has submitted applications, default to SUBMITTED tab
            if (incomingApplications.length === 0 && (myAppsRes.applications || []).length > 0) {
              setActiveTab("SUBMITTED");
            }
          }
        } catch (e) {
          console.warn("[ApplicationsPage] Error loading candidate applications:", e);
        }
      } catch (err: any) {
        console.error("[ApplicationsPage] Failed to load applications:", err);
        if (isMounted) setError(err.message || "Failed to load applications from server.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadApplicationsData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await applicationsApi.acceptApplication(id);
      setIncomingApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: "ACCEPTED" } : app))
      );
      const candidate = incomingApplications.find((a) => a.id === id);
      setToastMessage(`✓ ${candidate?.name || "Candidate"} accepted to your squad roster!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to accept application.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await applicationsApi.rejectApplication(id);
      setIncomingApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: "REJECTED" } : app))
      );
      const candidate = incomingApplications.find((a) => a.id === id);
      setToastMessage(`Application from ${candidate?.name || "Candidate"} declined.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to decline application.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleWithdraw = async (teamId: string, appId: string) => {
    if (!confirm("Are you sure you want to withdraw this application?")) return;
    try {
      await applicationsApi.withdrawApplication(teamId);
      setMyApplications((prev) => prev.filter((a) => a.id !== appId));
      setToastMessage("Application withdrawn.");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to withdraw application.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const filteredIncoming = incomingApplications.filter((app) => {
    if (statusFilter === "ALL") return true;
    return app.status === statusFilter;
  });

  const pendingCount = incomingApplications.filter((a) => a.status === "PENDING").length;
  const acceptedCount = incomingApplications.filter((a) => a.status === "ACCEPTED").length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-primary-action animate-spin" />
        <p className="text-sm font-semibold text-text-muted">Loading squad applications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface text-text-main border border-border-main px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-light text-primary-action border border-primary-border">
                Application Center
              </span>
              <span className="text-xs text-text-muted">• Real-Time Roster Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight font-heading">
              Squad Applications & Recruitment
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Review candidate applications for squads you lead, or track join requests you submitted to other teams.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/teams"
              className="text-xs font-bold text-text-main bg-surface-dim hover:bg-surface border border-border-main px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Browse All Teams
            </Link>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border-main">
          <div className="p-4 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
            <div className="flex items-center justify-between text-xs text-text-muted font-semibold mb-1">
              <span>Incoming Candidates</span>
              <Users className="w-4 h-4 text-primary-action" />
            </div>
            <div className="text-xl font-black text-text-main font-heading">
              {incomingApplications.length} Submissions
            </div>
            <p className="text-[11px] font-medium mt-1 text-text-muted">
              Across all squads you currently lead
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
            <div className="flex items-center justify-between text-xs text-text-muted font-semibold mb-1">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-text-main font-heading">
              {pendingCount} Candidates
            </div>
            <p className="text-[11px] text-text-muted font-medium mt-1">
              Awaiting your admission decision
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
            <div className="flex items-center justify-between text-xs text-text-muted font-semibold mb-1">
              <span>My Sent Requests</span>
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-text-main font-heading">
              {myApplications.length} Active
            </div>
            <p className="text-[11px] text-text-muted font-medium mt-1">
              Applications you sent to peer squads
            </p>
          </div>
        </div>
      </div>

      {/* Main View Mode Selector (Incoming vs My Applications) */}
      <div className="flex items-center gap-3 border-b border-border-main pb-2">
        <button
          onClick={() => setActiveTab("INCOMING")}
          className={`px-4 py-2 text-sm font-bold border-b-2 -mb-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "INCOMING"
              ? "border-primary-action text-primary-action"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Incoming Candidates (Leader Review)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-dim text-text-muted border border-border-main">
            {incomingApplications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("SUBMITTED")}
          className={`px-4 py-2 text-sm font-bold border-b-2 -mb-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "SUBMITTED"
              ? "border-primary-action text-primary-action"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>My Sent Applications (Candidate View)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-dim text-text-muted border border-border-main">
            {myApplications.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: INCOMING CANDIDATES */}
      {activeTab === "INCOMING" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-main font-heading">
                Candidate Applications for Your Squads
              </h2>
              <p className="text-xs text-text-muted">
                Click any candidate row to view their detailed dossier, cover note, and verified competencies.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-surface-dim border border-border-main p-1 rounded-xl">
              {(
                [
                  { id: "ALL", label: `All (${incomingApplications.length})` },
                  { id: "PENDING", label: `Pending (${pendingCount})` },
                  { id: "ACCEPTED", label: `Accepted (${acceptedCount})` },
                  { id: "REJECTED", label: `Declined` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-surface text-text-main shadow-xs border border-border-main"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tiles list */}
          <div className="space-y-3">
            {filteredIncoming.map((app) => (
              <CandidateApplicationTile
                key={app.id}
                application={app}
                defaultExpanded={false}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))}

            {filteredIncoming.length === 0 && (
              <div className="bg-surface rounded-2xl border border-border-main p-12 text-center space-y-2">
                <UserCheck className="w-10 h-10 text-text-muted mx-auto opacity-50" />
                <h4 className="text-sm font-bold text-text-main">
                  No applications in this view
                </h4>
                <p className="text-xs text-text-muted">
                  When candidates apply to squads where you are the leader, their live applications appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MY SUBMITTED APPLICATIONS */}
      {activeTab === "SUBMITTED" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-text-main font-heading">
              Applications You Submitted
            </h2>
            <p className="text-xs text-text-muted">
              Track the status of your join requests across all hackathon squads.
            </p>
          </div>

          {myApplications.length > 0 ? (
            <div className="space-y-3">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="bg-surface rounded-xl border border-border-main p-5 shadow-xs hover:border-primary-action/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-primary-action bg-primary-light px-2 py-0.5 rounded-md">
                        {app.eventTitle || "Hackathon"}
                      </span>
                      {app.status === "PENDING" && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> Pending Review
                        </span>
                      )}
                      {app.status === "ACCEPTED" && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Accepted to Roster
                        </span>
                      )}
                      {app.status === "REJECTED" && (
                        <span className="text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-500" /> Declined
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-text-main font-heading">
                        {app.teamName}
                      </h3>
                      {app.roleTitle && (
                        <span className="text-xs font-semibold text-primary-action bg-primary-light border border-primary-border px-2 py-0.5 rounded-md">
                          Role: {app.roleTitle}
                        </span>
                      )}
                    </div>

                    {app.message && (
                      <p className="text-xs text-text-muted italic line-clamp-2">
                        "{app.message}"
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(app.requirements || []).map((req) => (
                        <span
                          key={req}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-dim text-text-muted border border-border-main"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-main">
                    <Link
                      to={`/team/${app.teamId}`}
                      className="px-3.5 py-2 text-xs font-bold text-text-main bg-surface-dim hover:bg-surface border border-border-main rounded-xl transition-colors cursor-pointer"
                    >
                      View Squad
                    </Link>

                    {app.status === "PENDING" && (
                      <button
                        onClick={() => handleWithdraw(app.teamId, app.id)}
                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Withdraw
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-border-main p-12 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-text-muted mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-text-main">No sent applications</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Explore squads looking for your technical competencies and submit join requests.
              </p>
              <Link
                to="/teams"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-action text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors"
              >
                Find Teams <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

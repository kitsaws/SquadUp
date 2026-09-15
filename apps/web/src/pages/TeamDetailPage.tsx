import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { SignInButton } from "@clerk/react";
import {
  ArrowLeft,
  Users,
  Shield,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Crown,
  Loader2,
  AlertCircle,
  Mail,
  LogOut,
  UserMinus,
  Send,
  ArrowRight,
} from "lucide-react";
import { useUserContext } from "../contexts/UserContext";
import {
  teamsApi,
  profileApi,
  applicationsApi,
  recommendationsApi,
  invitesApi,
  TeamItem,
  UserProfileResponse,
  IncomingApplicationItem,
  RecommendationItem,
} from "../services/api";
import { RecommendationBadge, SkillTag } from "../components/Badges";
import { SmartRecommendationPanel } from "../components/SmartRecommendationPanel";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
} from "../components/CandidateApplicationTile";

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSignedIn, userVerifiedSkills, profile: contextProfile } = useUserContext();

  const [team, setTeam] = useState<TeamItem | null>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [applications, setApplications] = useState<CandidateApplicationData[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Load Team, User Profile, Applications (if leader), and Recommendations (if candidate)
  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch live Team data (public)
        const teamData = await teamsApi.getTeam(id!);
        if (!isMounted) return;
        setTeam(teamData);
        if (teamData.hasApplied) {
          setApplied(true);
        }

        // If not signed in, do not call protected APIs
        if (!isSignedIn) {
          setProfile(null);
          setApplications([]);
          setRecommendation(null);
          return;
        }

        // 2. Fetch User Profile
        let userProfile: UserProfileResponse | null = contextProfile;
        if (!userProfile) {
          try {
            userProfile = await profileApi.getProfile();
            if (isMounted) setProfile(userProfile);
          } catch {
            // Unauthenticated or profile not created yet
          }
        } else {
          setProfile(userProfile);
        }

        const isUserLeader = Boolean(
          teamData.isLeader ||
          (userProfile && teamData.members.some((m) => m.userId === userProfile.id && m.role === "Leader"))
        );

        // 3. If Leader, fetch incoming applications for this squad
        if (isUserLeader) {
          try {
            const appsRes = await applicationsApi.getIncomingApplications({ teamId: teamData.id });
            if (isMounted) {
              const mappedApps: CandidateApplicationData[] = (appsRes.applications || []).map((app: IncomingApplicationItem) => ({
                id: app.id,
                candidateId: app.candidateId,
                name: app.name,
                avatarUrl: app.avatarUrl || undefined,
                university: app.university,
                year: app.year || "Student",
                appliedRole: app.appliedRole,
                matchScore: app.matchScore,
                isCampusMatch: app.isCampusMatch,
                appliedTimeAgo: app.appliedTimeAgo || "Recently",
                coverNote: app.coverNote || "Interested in joining your team.",
                skills: app.skills || [],
                status: app.status,
              }));
              setApplications(mappedApps);
            }
          } catch (e) {
            console.warn("[TeamDetailPage] Could not load applications for team:", e);
          }
        } else {
          // 4. Candidate view: check if user already applied
          try {
            const myApps = await applicationsApi.getMyApplications();
            if (isMounted && myApps.applications.some((a) => a.teamId === teamData.id && a.status === "PENDING")) {
              setApplied(true);
            }
          } catch {
            // ignore
          }

          // 5. Try fetching real recommendations for this event to check match score
          try {
            const recsRes = await recommendationsApi.getRecommendations({
              eventId: teamData.eventId,
              topK: 25,
            });
            if (isMounted) {
              const match = recsRes.recommendations.find((r) => r.teamId === teamData.id);
              if (match) {
                setRecommendation(match);
              }
            }
          } catch {
            // User might not have resume yet; show standard unrated team
          }
        }
      } catch (err: any) {
        console.error("[TeamDetailPage] Error fetching team details:", err);
        if (isMounted) setError(err.message || "Failed to load squad details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id, isSignedIn, contextProfile]);

  const isUserLeader = Boolean(
    team?.isLeader ||
    (profile && team?.members.some((m) => m.userId === profile.id && m.role === "Leader"))
  );
  const isUserMember = Boolean(
    team?.isMember ||
    (profile && team?.members.some((m) => m.userId === profile.id))
  );

  const handleApplySuccess = async (teamId: string, role: string, message: string) => {
    try {
      await applicationsApi.applyToTeam(teamId, message);
      setApplied(true);
      setIsApplyModalOpen(false);
      setToastMessage("Application submitted! Squad leaders have received your dossier.");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to submit application.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleAcceptApplicant = async (appId: string) => {
    try {
      await applicationsApi.acceptApplication(appId);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "ACCEPTED" } : a))
      );
      const candidate = applications.find((a) => a.id === appId);
      setToastMessage(`✓ ${candidate?.name || "Candidate"} accepted to your squad!`);
      setTimeout(() => setToastMessage(null), 4000);
      // Refresh team data to show updated member in roster
      if (id) {
        const refreshed = await teamsApi.getTeam(id);
        setTeam(refreshed);
      }
    } catch (err: any) {
      setToastMessage(err.message || "Failed to accept application.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDeclineApplicant = async (appId: string) => {
    try {
      await applicationsApi.rejectApplication(appId);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "REJECTED" } : a))
      );
      const candidate = applications.find((a) => a.id === appId);
      setToastMessage(`Application from ${candidate?.name || "Candidate"} declined.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to decline application.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team || !confirm("Are you sure you want to leave this squad?")) return;
    try {
      await teamsApi.leaveTeam(team.id);
      setToastMessage("You have left the squad.");
      setTimeout(() => navigate("/teams"), 1500);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to leave squad.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!team || !confirm(`Remove ${memberName} from this squad?`)) return;
    try {
      await teamsApi.removeMember(team.id, memberUserId);
      setToastMessage(`✓ ${memberName} removed from squad roster.`);
      setTimeout(() => setToastMessage(null), 4000);
      const refreshed = await teamsApi.getTeam(team.id);
      setTeam(refreshed);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to remove member.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await invitesApi.sendInvites(team.id, [inviteEmail.trim()]);
      setToastMessage(`✓ Invitation sent to ${inviteEmail.trim()}!`);
      setInviteEmail("");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to send invitation.");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsInviting(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!team || !confirm("Are you sure you want to withdraw your application?")) return;
    try {
      await applicationsApi.withdrawApplication(team.id);
      setApplied(false);
      setToastMessage("Application withdrawn.");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to withdraw application.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading squad dossier...</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 font-heading">Squad Not Found</h2>
          <p className="text-xs text-slate-500">{error || "The squad you requested does not exist or may have disbanded."}</p>
          <Link
            to="/teams"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Teams Directory
          </Link>
        </div>
      </div>
    );
  }

  // Derive primary open requirement (if any)
  const openRequirement = team.requirements.find((r) => !userVerifiedSkills.includes(r)) || team.requirements[0] || "Specialist";
  const category = recommendation?.recommendationCategory;
  const taxonomyScore = recommendation?.taxonomyScore;
  const fulfilledCount = team.requirements.filter((r) => userVerifiedSkills.includes(r)).length;
  const totalSpots = team.maxCapacity || 4;
  const isRestrictedEvent = Boolean(
    team.event && !team.event.isGlobal && profile?.university && team.university &&
    profile.university.toLowerCase() !== team.university.toLowerCase()
  );

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
          {isUserLeader && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              👑 You are Squad Leader
            </span>
          )}
          {isUserMember && !isUserLeader && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Active Squad Member
            </span>
          )}
          {isUserMember && (
            <button
              onClick={handleLeaveTeam}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              title="Leave this squad"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Squad</span>
            </button>
          )}
        </div>
      </div>

      {/* Conditional Layout: Leader Management Dashboard vs Standard Squad Dossier */}
      {isUserLeader ? (
        /* ================= LEADER MANAGEMENT DASHBOARD ================= */
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    Squad Leader Dashboard
                  </span>
                  <span className="text-xs text-slate-400">• {team.event?.title || "Upcoming Event"}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
                  {team.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                  {team.description || `Formed for ${team.event?.title || "hackathon"}. Recruiting verified candidates.`}
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
                  {team.members.length} / {totalSpots} Spots
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {totalSpots - team.members.length > 0
                    ? `${totalSpots - team.members.length} spot(s) remaining for recruitment`
                    : "Roster complete"}
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
                  {openRequirement}
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

            {applications.length > 0 ? (
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
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">No applications received yet</p>
                <p className="text-xs text-slate-500">Candidates applying to your squad will appear here with live skill compatibility scores.</p>
              </div>
            )}
          </div>

          {/* Current Roster & Invites */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Current Squad Members
                </h3>
                <p className="text-xs text-slate-500">
                  Manage active teammates or invite colleagues via university email.
                </p>
              </div>

              {/* Email Invite Input */}
              <form onSubmit={handleSendInvite} className="flex items-center gap-2">
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Teammate email..."
                    className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 w-52"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isInviting ? "Inviting..." : "Invite"}</span>
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
                      {(member.name || "U")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {member.name || "Teammate"}
                        </h4>
                        {member.role === "Leader" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            Leader
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{member.title || member.role || "Member"}</p>
                      {member.university && (
                        <p className="text-[11px] text-slate-400 truncate">{member.university}</p>
                      )}
                    </div>
                  </div>

                  {member.userId !== profile?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.userId, member.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title={`Remove ${member.name} from squad`}
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ================= STANDARD SQUAD DOSSIER (CANDIDATE VIEW) ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isSignedIn && category ? (
                      <RecommendationBadge category={category} score={taxonomyScore} />
                    ) : (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        General Squad
                      </span>
                    )}
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      {team.event?.title || "Hackathon"}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
                    {team.name}
                  </h1>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    Affiliation: {team.university || "Collegiate Squad"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                    Roster Capacity
                  </span>
                  <span className="text-xl font-bold text-slate-900">
                    {team.members.length} / {totalSpots} Members
                  </span>
                </div>
              </div>

              {isRestrictedEvent && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-amber-800 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This squad belongs to an institution-restricted event ({team.university || "Campus-only"}). Cross-campus applications may be rejected by the server.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Squad Mission & Objectives
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {team.description || `Recruiting driven builders for ${team.event?.title || "the upcoming hackathon"}. Apply with your profile to join forces.`}
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
                      isMatched={
                        isSignedIn &&
                        userVerifiedSkills.some(
                          (s) => s.trim().toLowerCase() === req.trim().toLowerCase()
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Open Role Highlight */}
              {openRequirement && (
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-950">
                      Actively Recruiting: {openRequirement} Specialist
                    </h4>
                    <p className="text-xs text-blue-800 mt-1">
                      Our architecture relies on verified hands-on execution. Candidates with experience matching this requirement will receive immediate review.
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
                  {Math.max(0, totalSpots - team.members.length)} Spot{totalSpots - team.members.length === 1 ? "" : "s"} Remaining
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
                      {(member.name || "U")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {member.name || "Teammate"}
                        </h4>
                        {member.role === "Leader" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            Leader
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {member.title || member.role || "Member"}
                      </p>
                      {member.university && (
                        <p className="text-[11px] text-slate-400 truncate">{member.university}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Smart Recommendation Panel or Logged-Out CTA */}
          <div className="space-y-6">
            {!isSignedIn ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto shadow-2xs">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                    Want to join this squad?
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Sign in with your university account to verify your skills, see compatibility scores, and apply to open roles.
                  </p>
                </div>
                {team.members.length >= totalSpots ? (
                  <span className="w-full block py-2.5 text-center text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl border border-slate-200">
                    Squad Full • No Open Spots Left
                  </span>
                ) : (
                  <SignInButton mode="modal">
                    <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer">
                      Sign In to Apply <ArrowRight className="w-4 h-4" />
                    </button>
                  </SignInButton>
                )}
              </div>
            ) : (
              <SmartRecommendationPanel
                recommendation={{
                  teamId: team.id,
                  teamName: team.name,
                  category: category,
                  taxonomyScore: taxonomyScore,
                  fulfilledRequirements: fulfilledCount,
                  totalRequirements: team.requirements.length,
                  teamLeadName: team.members.find((m) => m.role === "Leader")?.name || team.members[0]?.name || "Team Lead",
                  teamLeadUniversity: team.university,
                  sameUniversity: Boolean(
                    profile?.university &&
                    team.university &&
                    profile.university.toLowerCase() === team.university.toLowerCase()
                  ),
                  requirements: team.requirements,
                  userVerifiedSkills: userVerifiedSkills,
                  breakdown: recommendation?.requirementBreakdown?.map((item) => ({
                    requirementName: item.requirementName,
                    score: item.score,
                    isDirectMatch: item.score >= 0.8,
                    provenanceSource: item.bestUserSkillName ? `Skill: ${item.bestUserSkillName}` : "Taxonomy Alignment",
                    explanation: item.explanationText,
                  })),
                }}
                isRecommended={Boolean(category && taxonomyScore !== undefined)}
                isFull={team.members.length >= totalSpots}
                onApply={() => setIsApplyModalOpen(true)}
                onWithdraw={handleWithdrawApplication}
                hasApplied={applied}
              />
            )}
          </div>
        </div>
      )}

      {/* Apply Team Modal */}
      {!isUserLeader && isSignedIn && team.members.length < totalSpots && (
        <ApplyTeamModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          team={{
            id: team.id,
            name: team.name,
            eventId: team.eventId,
            eventTitle: team.event?.title || "Hackathon",
            requirements: team.requirements,
            university: team.university,
            members: team.members.map((m) => ({ id: m.id, name: m.name, role: m.role })),
          }}
          onSubmit={handleApplySuccess}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
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
  Lock,
  User,
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
import { RecommendationBadge, RecommendationTier, SkillTag } from "../components/Badges";
import { SmartRecommendationPanel } from "../components/SmartRecommendationPanel";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
} from "../components/CandidateApplicationTile";

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { fromEventId?: string; fromEventTitle?: string; from?: string } | null;
  const fromEventId = locationState?.fromEventId;
  const fromEventTitle = locationState?.fromEventTitle;
  const { isSignedIn, userVerifiedSkills, profile: contextProfile, userUniversity } = useUserContext();

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
              const mappedApps: CandidateApplicationData[] = (appsRes.applications || [])
                .filter((app: IncomingApplicationItem) => !app.status || app.status === "PENDING")
                .map((app: IncomingApplicationItem) => {
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
                    appliedRole: app.appliedRole,
                    matchScore: score,
                    isCampusMatch: app.isCampusMatch,
                    appliedTimeAgo: app.appliedTimeAgo || "Recently",
                    coverNote: app.coverNote || "Interested in joining your team.",
                    skills: app.skills || [],
                    status: app.status || "PENDING",
                    category,
                  };
                })
                .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
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
      const candidate = applications.find((a) => a.id === appId);
      setApplications((prev) => prev.filter((a) => a.id !== appId));
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
      const candidate = applications.find((a) => a.id === appId);
      setApplications((prev) => prev.filter((a) => a.id !== appId));
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
        <Loader2 className="w-8 h-8 text-primary-action animate-spin" />
        <p className="text-sm font-semibold text-text-muted">Loading squad dossier...</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-md mx-auto bg-surface rounded-2xl border border-border-main p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-text-main font-heading">Squad Not Found</h2>
          <p className="text-xs text-text-muted">{error || "The squad you requested does not exist or may have disbanded."}</p>
          <Link
            to={fromEventId ? `/event/${fromEventId}` : "/teams"}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-action hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {fromEventId ? `Back to ${fromEventTitle || "Event"}` : "Back to Teams Directory"}
          </Link>
        </div>
      </div>
    );
  }

  // Derive primary open requirement (if any)
  const openRequirement = team.requirements.find((r) => !userVerifiedSkills.includes(r)) || team.requirements[0] || "Specialist";
  const category = recommendation?.recommendationCategory ?? team.category;
  const taxonomyScore = recommendation?.taxonomyScore ?? team.taxonomyScore;
  const rawBreakdown = recommendation?.requirementBreakdown || (team as any).requirementBreakdown || [];
  const activeBreakdown = rawBreakdown.map((item: any) => ({
    requirementName: item.requirementName,
    score: item.score,
    isDirectMatch: item.score >= 0.8,
    provenanceSource: item.bestUserSkillName ? `Skill: ${item.bestUserSkillName}` : "Taxonomy Alignment",
    explanation: item.explanationText || "",
  }));
  const fulfilledCount = activeBreakdown.length > 0
    ? activeBreakdown.filter((b: any) => b.score >= 0.8).length
    : team.requirements.filter((r) => userVerifiedSkills.includes(r)).length;
  const totalSpots = team.maxCapacity || 4;
  const userUni = profile?.university || contextProfile?.university || userUniversity || "";
  const teamUni = team.university || team.event?.university || team.event?.location || "";
  const isRestrictedEvent = Boolean(
    team.event &&
    !team.event.isGlobal &&
    (!userUni || !teamUni || userUni.toLowerCase().trim() !== teamUni.toLowerCase().trim())
  );

  // Sort squad members so Leader is always the first person in the roster
  const sortedMembers = [...(team.members || [])].sort((a, b) => {
    const isALeader = a.role === "Leader" || a.role?.toLowerCase() === "leader";
    const isBLeader = b.role === "Leader" || b.role?.toLowerCase() === "leader";
    if (isALeader && !isBLeader) return -1;
    if (!isALeader && isBLeader) return 1;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface text-text-main border border-border-main px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-main">
        {fromEventId ? (
          <Link
            to={`/event/${fromEventId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-main transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {fromEventTitle || "Event"}</span>
          </Link>
        ) : (
          <Link
            to="/teams"
            className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-main transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Teams Directory</span>
          </Link>
        )}

        <div className="flex items-center gap-2">
          {isUserLeader && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-primary-light text-primary-action border border-primary-border">
              👑 You are Squad Leader
            </span>
          )}
          {isUserMember && !isUserLeader && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              ✓ Active Squad Member
            </span>
          )}
          {isUserMember && (
            <button
              onClick={handleLeaveTeam}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
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
          <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-light text-primary-action border border-primary-border">
                    Squad Leader Dashboard
                  </span>
                  <span className="text-xs text-text-muted">• {team.event?.title || "Upcoming Event"}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight font-heading">
                  {team.name}
                </h1>
                <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl">
                  {team.description || `Formed for ${team.event?.title || "hackathon"}. Recruiting verified candidates.`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Active Formation
                </span>
              </div>
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border-main">
              <div className="p-4 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
                <div className="flex items-center justify-between text-xs text-text-muted font-semibold mb-1">
                  <span>Squad Roster</span>
                  <Users className="w-4 h-4 text-primary-action" />
                </div>
                <div className="text-xl font-black text-text-main font-heading">
                  {team.members.length} / {totalSpots} Spots
                </div>
                <p className="text-[11px] text-text-muted font-medium mt-1">
                  {totalSpots - team.members.length > 0
                    ? `${totalSpots - team.members.length} spot(s) remaining for recruitment`
                    : "Roster complete"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
                <div className="flex items-center justify-between text-xs text-text-muted font-semibold mb-1">
                  <span>Candidate Applications</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl font-black text-text-main font-heading">
                  {applications.filter((a) => a.status === "PENDING").length} Pending
                </div>
                <p className="text-[11px] text-text-muted font-medium mt-1">
                  {applications.length} total candidate submissions
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
                <div className="flex items-center justify-between text-xs text-text-muted font-semibold mb-1">
                  <span>Primary Role Vacancy</span>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl font-black text-text-main font-heading">
                  {openRequirement}
                </div>
                <p className="text-[11px] text-text-muted font-medium mt-1">
                  Core capability seeking specialist
                </p>
              </div>
            </div>
          </div>

          {/* Incoming Applications List */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-text-main font-heading">
                  Incoming Applications & Candidate Review
                </h2>
                <p className="text-xs text-text-muted">
                  Tiles are collapsed by default. Click any candidate to view their note, verified skills, and direct profile link.
                </p>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-dim text-text-muted border border-border-main self-start sm:self-auto shrink-0">
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
              <div className="bg-surface-dim rounded-xl border border-border-main p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                <p className="text-sm font-bold text-text-main">No applications received yet</p>
                <p className="text-xs text-text-muted">Candidates applying to your squad will appear here with live skill compatibility scores.</p>
              </div>
            )}
          </div>

          {/* Current Roster & Invites */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-text-main font-heading">
                  Current Squad Members
                </h3>
                <p className="text-xs text-text-muted">
                  Manage active teammates or invite colleagues via university email.
                </p>
              </div>

              {/* Email Invite Input */}
              <form onSubmit={handleSendInvite} className="flex items-center gap-2">
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Teammate email..."
                    className="text-xs pl-8 pr-3 py-2 border border-border-main bg-surface-dim text-text-main placeholder:text-text-muted rounded-xl outline-hidden focus:border-primary-action focus:ring-1 focus:ring-primary-action w-52"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-3 py-2 bg-primary-action hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isInviting ? "Inviting..." : "Invite"}</span>
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedMembers.map((member) => {
                const isCurrentMember = member.userId === profile?.id || member.id === profile?.id;
                return (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-xl border border-border-main bg-surface-dim flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-action to-cross-campus text-white font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          (member.name || "U")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-text-main truncate">
                            {member.name || "Teammate"}
                          </h4>
                          {member.role === "Leader" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-light text-primary-action shrink-0">
                              Leader
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate">{member.title || member.role || "Member"}</p>
                        {member.university && (
                          <p className="text-[11px] text-text-muted truncate">{member.university}</p>
                        )}
                      </div>
                    </div>

                    {/* Leader View: View Profile and Kick/Remove or Leave stacked (flex-col) */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Link
                        to={member.userId ? `/profile/${member.userId}` : `/profile`}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold text-primary-action hover:text-white bg-primary-light hover:bg-primary-action border border-primary-border rounded-lg transition-all cursor-pointer w-full text-center"
                        title={`View ${member.name}'s profile`}
                      >
                        <User className="w-3 h-3" />
                        <span>View Profile</span>
                      </Link>

                      {isCurrentMember ? (
                        <button
                          onClick={handleLeaveTeam}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-all cursor-pointer w-full"
                          title="Leave this squad"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Leave</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemoveMember(member.userId || member.id, member.name)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-all cursor-pointer w-full"
                          title={`Remove ${member.name} from squad`}
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Kick/Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ================= STANDARD SQUAD DOSSIER (CANDIDATE VIEW) ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isSignedIn && category ? (
                      <RecommendationBadge category={category} score={taxonomyScore} />
                    ) : (
                      <span className="text-xs font-semibold text-text-muted bg-surface-dim border border-border-main px-2.5 py-0.5 rounded-full">
                        General Squad
                      </span>
                    )}
                    <span className="text-xs font-semibold text-primary-action bg-primary-light border border-primary-border px-2.5 py-0.5 rounded-full">
                      {team.event?.title || "Hackathon"}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight font-heading">
                    {team.name}
                  </h1>
                  <p className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
                    <Shield className="w-3.5 h-3.5 text-primary-action" />
                    Affiliation: {team.university || "Collegiate Squad"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-text-muted block uppercase tracking-wider">
                    Roster Capacity
                  </span>
                  <span className="text-xl font-bold text-text-main">
                    {team.members.length} / {totalSpots} Members
                  </span>
                </div>
              </div>

              {isRestrictedEvent && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-amber-600 font-medium">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This squad belongs to an institution-restricted event ({team.university || "Campus-only"}). Applications are restricted to students of this institution.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-muted">
                  Squad Mission & Objectives
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {team.description || `Recruiting driven builders for ${team.event?.title || "the upcoming hackathon"}. Apply with your profile to join forces.`}
                </p>
              </div>

              {/* Tech Stack */}
              <div className="space-y-2 pt-2 border-t border-border-main">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-muted">
                  Required Tech Stack & Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {team.requirements.map((req) => (
                    <SkillTag
                      key={req}
                      skill={req}
                      breakdown={recommendation?.requirementBreakdown || (team as any).requirementBreakdown}
                      userSkills={isSignedIn ? userVerifiedSkills : undefined}
                    />
                  ))}
                </div>
              </div>

              {/* Open Role Highlight */}
              {openRequirement && (
                <div className="p-4 rounded-xl bg-primary-light border border-primary-border flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary-action shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-primary-action">
                      Actively Recruiting: {openRequirement} Specialist
                    </h4>
                    <p className="text-xs text-text-muted mt-1">
                      Our architecture relies on verified hands-on execution. Candidates with experience matching this requirement will receive immediate review.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Squad Roster */}
            <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-text-main font-heading">
                    Current Squad Roster
                  </h3>
                  <p className="text-xs text-text-muted">
                    Verified team members currently committed to this project.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {Math.max(0, totalSpots - team.members.length)} Spot{totalSpots - team.members.length === 1 ? "" : "s"} Remaining
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedMembers.map((member) => {
                  const isCurrentMember = member.userId === profile?.id || member.id === profile?.id;
                  return (
                    <div
                      key={member.id}
                      className="p-3.5 rounded-xl border border-border-main bg-surface-dim flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-action to-cross-campus text-white font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            (member.name || "U")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-text-main truncate">
                              {member.name || "Teammate"}
                            </h4>
                            {member.role === "Leader" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-light text-primary-action shrink-0">
                                Leader
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted truncate">
                            {member.title || member.role || "Member"}
                          </p>
                          {member.university && (
                            <p className="text-[11px] text-text-muted truncate">{member.university}</p>
                          )}
                        </div>
                      </div>

                      {/* General / Candidate View Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                        <Link
                          to={member.userId ? `/profile/${member.userId}` : `/profile`}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-action hover:text-white bg-primary-light hover:bg-primary-action border border-primary-border rounded-xl transition-all cursor-pointer shrink-0"
                          title={`View ${member.name}'s profile`}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </Link>

                        {isCurrentMember && (
                          <button
                            onClick={handleLeaveTeam}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-xl transition-all cursor-pointer shrink-0"
                            title="Leave this squad"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Leave</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Smart Recommendation Panel or Logged-Out CTA */}
          <div className="space-y-6">
            {!isSignedIn ? (
              <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary-light border border-primary-border flex items-center justify-center text-primary-action mx-auto shadow-2xs">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-text-main font-heading">
                    Want to join this squad?
                  </h3>
                  <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                    Sign in with your university account to verify your skills, see compatibility scores, and apply to open roles.
                  </p>
                </div>
                {team.members.length >= totalSpots ? (
                  <span className="w-full block py-2.5 text-center text-xs font-semibold text-text-muted bg-surface-dim rounded-xl border border-border-main">
                    Squad Full • No Open Spots Left
                  </span>
                ) : isRestrictedEvent ? (
                  <div className="w-full py-2.5 px-3 text-center text-xs font-semibold text-text-muted bg-surface-dim rounded-xl border border-border-main flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-text-muted" />
                    <span>Campus Restricted • {team.university || "Campus-only"}</span>
                  </div>
                ) : (
                  <SignInButton mode="modal">
                    <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-action hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors cursor-pointer">
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
                    userUni &&
                    teamUni &&
                    userUni.toLowerCase().trim() === teamUni.toLowerCase().trim()
                  ),
                  requirements: team.requirements,
                  userVerifiedSkills: userVerifiedSkills,
                  breakdown: activeBreakdown.length > 0 ? activeBreakdown : undefined,
                }}
                isRecommended={Boolean(category && taxonomyScore !== undefined)}
                isFull={team.members.length >= totalSpots}
                isRestricted={isRestrictedEvent}
                onApply={() => {
                  if (!isRestrictedEvent) {
                    setIsApplyModalOpen(true);
                  }
                }}
                onWithdraw={handleWithdrawApplication}
                hasApplied={applied}
              />
            )}
          </div>
        </div>
      )}

      {/* Apply Team Modal */}
      {!isUserLeader && !isRestrictedEvent && isSignedIn && team.members.length < totalSpots && (
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

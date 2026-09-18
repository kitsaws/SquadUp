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
  Layers,
  Target,
  Briefcase,
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
import { RecommendationBadge, RecommendationTier, SkillTag, getSkillMatchType } from "../components/Badges";
import { SmartRecommendationPanel } from "../components/SmartRecommendationPanel";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import { TeamInviteModal } from "../components/TeamInviteModal";
import { RoleSelectDropdown } from "../components/RoleSelectDropdown";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
} from "../components/CandidateApplicationTile";
import type { TeamInviteItem } from "../services/api";

function formatTimeAgo(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

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
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isInviting, setIsInviting] = useState(false);

  // Invite states for viewing candidate
  const [pendingInvite, setPendingInvite] = useState<TeamInviteItem | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);

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

        const currentUid = userProfile?.userId || userProfile?.id;
        const currentEmail = userProfile?.email?.toLowerCase();

        const isUserLeader = Boolean(
          teamData.isLeader ||
          (userProfile && teamData.members.some((m) =>
            (m.userId === currentUid || (currentEmail && m.email && m.email.toLowerCase() === currentEmail)) &&
            (m.role === "Leader" || m.role?.toLowerCase() === "leader")
          ))
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
          // 4. Candidate view: check if user already applied or has a pending invite
          try {
            const [myApps, myInvitesRes] = await Promise.all([
              applicationsApi.getMyApplications().catch(() => ({ total: 0, applications: [] })),
              invitesApi.getMyInvites().catch(() => ({ totalInvites: 0, invites: [] })),
            ]);

            if (isMounted && myApps.applications?.some((a) => a.teamId === teamData.id && a.status === "PENDING")) {
              setApplied(true);
            }

            if (isMounted) {
              const inviteMatch = (myInvitesRes.invites || []).find((inv) => inv.teamId === teamData.id);
              if (inviteMatch) {
                setPendingInvite(inviteMatch);
                const searchParams = new URLSearchParams(location.search);
                if (searchParams.get("inviteId") === inviteMatch.id || searchParams.has("inviteId")) {
                  setIsInviteModalOpen(true);
                }
              }
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

  const currentUserId = profile?.userId || profile?.id;
  const currentUserEmail = profile?.email?.toLowerCase();

  const isUserLeader = Boolean(
    team?.isLeader ||
    (profile && team?.members.some((m) =>
      (m.userId === currentUserId || (currentUserEmail && m.email && m.email.toLowerCase() === currentUserEmail)) &&
      (m.role === "Leader" || m.role?.toLowerCase() === "leader")
    ))
  );
  const isUserMember = Boolean(
    team?.isMember ||
    (profile && team?.members.some((m) =>
      m.userId === currentUserId || (currentUserEmail && m.email && m.email.toLowerCase() === currentUserEmail)
    ))
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
      const targetRole = team.roles?.find((r) => r.id === selectedRoleId);
      const res = await invitesApi.sendInvites(team.id, {
        invites: [
          {
            email: inviteEmail.trim(),
            roleId: targetRole?.id,
            roleTitle: targetRole?.title,
            roleSkills: targetRole?.skills,
          },
        ],
      });

      if (res.failed && res.failed.length > 0) {
        setToastMessage(`⚠️ ${res.failed[0].reason}`);
      } else {
        setToastMessage(
          `✓ Role invite sent to ${inviteEmail.trim()}${targetRole ? ` for ${targetRole.title}` : ""}!`
        );
        setInviteEmail("");
        setSelectedRoleId("");
      }
      setTimeout(() => setToastMessage(null), 5000);
      const refreshed = await teamsApi.getTeam(team.id);
      setTeam(refreshed);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to send invitation.");
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsInviting(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await invitesApi.acceptInvite(inviteId);
      setPendingInvite(null);
      setIsInviteModalOpen(false);
      setToastMessage("🎉 Congratulations! You have joined the squad roster.");
      setTimeout(() => setToastMessage(null), 4000);
      if (id) {
        const refreshed = await teamsApi.getTeam(id);
        setTeam(refreshed);
      }
    } catch (err: any) {
      setToastMessage(err.message || "Failed to accept invitation.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await invitesApi.declineInvite(inviteId);
      setPendingInvite(null);
      setIsInviteModalOpen(false);
      setToastMessage("Invitation declined.");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to decline invitation.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    if (!team || !confirm(`Cancel pending invite sent to ${email}?`)) return;
    try {
      await invitesApi.cancelInvite(team.id, inviteId);
      setToastMessage(`✓ Invitation to ${email} cancelled.`);
      setTimeout(() => setToastMessage(null), 4000);
      const refreshed = await teamsApi.getTeam(team.id);
      setTeam(refreshed);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to cancel invite.");
      setTimeout(() => setToastMessage(null), 4000);
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-action hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {fromEventId ? `Back to ${fromEventTitle || "Event"}` : "Back to Teams Directory"}
          </Link>
        </div>
      </div>
    );
  }

  const category = recommendation?.recommendationCategory ?? team.category;
  const taxonomyScore = recommendation?.taxonomyScore ?? team.taxonomyScore;
  const rawBreakdown = recommendation?.requirementBreakdown || (team as any).requirementBreakdown || [];
  const activeBreakdown = rawBreakdown.map((item: any) => ({
    requirementNodeId: item.requirementNodeId,
    requirementName: item.requirementName,
    requirementDepth: item.requirementDepth,
    bestUserSkillId: item.bestUserSkillId,
    bestUserSkillName: item.bestUserSkillName,
    bestUserSkillDepth: item.bestUserSkillDepth,
    lcaNodeId: item.lcaNodeId,
    lcaNodeName: item.lcaNodeName,
    lcaDepth: item.lcaDepth,
    graphDistance: item.graphDistance,
    matchType: item.matchType,
    score: item.score,
    isDirectMatch: item.score >= 0.8,
    provenanceSource: item.bestUserSkillName ? `Verified Skill: ${item.bestUserSkillName}` : "Taxonomy Alignment",
    explanation: item.explanationText || item.explanation || "",
    explanationText: item.explanationText || item.explanation || "",
  }));

  const fulfilledCount = activeBreakdown.length > 0
    ? activeBreakdown.filter((b: any) => b.score >= 0.8).length
    : team.requirements.filter((r) => userVerifiedSkills.includes(r)).length;
  const totalSpots =
    team.maxCapacity ||
    (team.roles && team.roles.length > 0
      ? team.members.length + team.roles.reduce((acc, r) => acc + (r.spots ?? 0), 0)
      : team.requirements && team.requirements.length > 0
      ? Math.max(team.members.length, team.requirements.length)
      : Math.max(team.members.length, 4));
  const userUni = profile?.university || contextProfile?.university || userUniversity || "";
  const teamUni = team.university || team.event?.university || team.event?.location || "";
  const isRestrictedEvent = Boolean(
    team.event &&
    !team.event.isGlobal &&
    (!userUni || !teamUni || userUni.toLowerCase().trim() !== teamUni.toLowerCase().trim())
  );

  const checkSkillMatch = (skill: string) => {
    if (!isSignedIn) return false;
    const sLower = skill.toLowerCase().trim();

    // 1. Direct match in userVerifiedSkills
    const direct = userVerifiedSkills.some((us) => {
      const uLower = us.toLowerCase().trim();
      if (uLower === sLower) return true;
      if (sLower.includes(uLower) || uLower.includes(sLower)) return true;
      if (
        (sLower.includes("react") && uLower.includes("react")) ||
        (sLower.includes("frontend") && uLower.includes("frontend")) ||
        (sLower.includes("backend") && uLower.includes("backend")) ||
        (sLower.includes("python") && uLower.includes("python")) ||
        (sLower.includes("javascript") && uLower.includes("javascript")) ||
        (sLower.includes("typescript") && uLower.includes("typescript")) ||
        (sLower.includes("design") && uLower.includes("design")) ||
        (sLower.includes("css") && uLower.includes("css")) ||
        (sLower.includes("node") && uLower.includes("node"))
      ) {
        return true;
      }
      return false;
    });
    if (direct) return true;

    // 2. Check activeBreakdown
    if (activeBreakdown && activeBreakdown.length > 0) {
      const match = activeBreakdown.find((b: any) => {
        const bName = (b.requirementName || "").toLowerCase().trim();
        return bName === sLower || bName.includes(sLower) || sLower.includes(bName);
      });
      if (match && match.score >= 0.6) return true;
    }

    // 3. Fallback to getSkillMatchType
    const badgeType = getSkillMatchType(skill, userVerifiedSkills);
    return badgeType === "perfect" || badgeType === "partial";
  };

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-main">
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
            </div>
          </div>

          {/* Leader: Role : Technologies Needed Section */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-text-main font-heading flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-action" />
                  <span>Role : Technologies Needed</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Structured capability vacancies, required tech stacks, and spot allocations for your squad.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-dim text-text-muted border border-border-main self-start sm:self-auto shrink-0">
                {team.roles?.length || team.requirements.length} Configured Roles
              </span>
            </div>

            {team.roles && team.roles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.roles.map((role) => {
                  const assignedMember = team.members.find(
                    (m) => m.userId === role.assignedToId || m.id === role.assignedToId
                  );
                  const isAssignedToMe = Boolean(
                    profile && (role.assignedToId === profile.id || role.assignedToId === profile.userId)
                  );

                  const isFilled = (role.spots ?? 1) === 0;

                  return (
                    <div
                      key={role.id || role.title}
                      className={`p-4 rounded-xl border transition-all space-y-3 shadow-2xs ${
                        isFilled
                          ? "bg-surface border-border-main"
                          : "bg-surface-dim border-border-main/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-text-main font-heading truncate">
                            {role.title}
                          </h4>
                          <p className="text-[11px] text-text-muted mt-0.5 truncate">
                            {isFilled ? (
                              <span>
                                Filled by{" "}
                                <strong className="font-semibold text-text-main">
                                  {isAssignedToMe
                                    ? "You (Squad Leader)"
                                    : assignedMember?.name
                                    ? `${assignedMember.name}${assignedMember.role === "Leader" ? " (Squad Leader)" : ""}`
                                    : "Active Teammate"}
                                </strong>
                              </span>
                            ) : (
                              <span>
                                {role.spots || 1} spot{(role.spots || 1) > 1 ? "s" : ""} open
                                {isAssignedToMe ? " • 1 claimed by you" : ""}
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            isFilled
                              ? "bg-primary-action/10 text-primary-action border border-primary-action/20"
                              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          }`}
                        >
                          {isFilled ? (isAssignedToMe ? "Your Role" : "Filled") : "Recruiting"}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1 border-t border-border-main/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                          Technologies Needed:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {role.skills.map((skill) => (
                            <span
                              key={skill}
                              className="text-xs font-medium px-2 py-0.5 rounded-md bg-surface-dim text-text-main border border-border-main"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border-main bg-surface-dim space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                  Technologies Needed:
                </span>
                <div className="flex flex-wrap gap-2">
                  {team.requirements.map((req) => (
                    <span
                      key={req}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface text-text-main border border-border-main"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

              {/* Role-Specific Invite Input with custom dropdown */}
              <form onSubmit={handleSendInvite} className="flex flex-wrap items-center gap-2">
                {team.roles && team.roles.length > 0 && (
                  <RoleSelectDropdown
                    roles={team.roles}
                    selectedRoleId={selectedRoleId}
                    onChange={setSelectedRoleId}
                  />
                )}

                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Teammate email..."
                    className="text-xs pl-8 pr-3 py-2 border border-border-main bg-surface-dim text-text-main placeholder:text-text-muted rounded-xl outline-hidden focus:border-primary-action focus:ring-1 focus:ring-primary-action w-44 sm:w-48"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-3 py-2 bg-primary-action hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isInviting ? "Inviting..." : "Send Invite"}</span>
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedMembers.map((member) => {
                const isCurrentMember =
                  member.userId === currentUserId ||
                  member.id === currentUserId ||
                  (currentUserEmail && member.email && member.email.toLowerCase() === currentUserEmail);
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

                    {/* Leader View: View Profile and Kick/Remove or Leave */}
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

            {/* Pending Outgoing Invites Table / List */}
            {team.invites && team.invites.filter((inv) => inv.status === "PENDING").length > 0 && (
              <div className="pt-4 border-t border-border-main space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary-action" />
                    <span>Pending Outgoing Invitations</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary-action border border-primary-border">
                    {team.invites.filter((inv) => inv.status === "PENDING").length} Pending
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {team.invites
                    .filter((inv) => inv.status === "PENDING")
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-xl border border-border-main/70 bg-surface-dim/50 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-surface border border-border-main flex items-center justify-center text-text-muted text-xs font-bold shrink-0">
                            @
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-text-main truncate block">
                              {inv.email}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                              {inv.roleTitle ? (
                                <span className="text-primary-action font-semibold truncate">
                                  {inv.roleTitle}
                                </span>
                              ) : (
                                <span>General Role</span>
                              )}
                              <span>• {formatTimeAgo(new Date(inv.createdAt))}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCancelInvite(inv.id, inv.email)}
                          className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-all cursor-pointer shrink-0"
                          title="Cancel invitation"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
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

              {pendingInvite && !isUserMember && (
                <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-emerald-500 uppercase tracking-wider block">
                        You Have an Active Invitation!
                      </span>
                      <p className="text-xs text-text-main font-semibold">
                        Designated Role: <span className="text-primary-action font-extrabold">{pendingInvite.roleTitle || "Squad Contributor"}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <span>Review Invitation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
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

              {/* Role : Technologies Needed Section */}
              <div className="space-y-4 pt-4 border-t border-border-main">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-text-main flex items-center gap-2 font-heading">
                      <Layers className="w-4 h-4 text-primary-action" />
                      <span>Role : Technologies Needed</span>
                    </h3>
                    <p className="text-xs text-text-muted">
                      Required competencies and open vacancies structured by role.
                    </p>
                  </div>
                  {team.roles && team.roles.length > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-dim text-text-muted border border-border-main self-start sm:self-auto">
                      {team.roles.length} Defined Roles
                    </span>
                  )}
                </div>

                {team.roles && team.roles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {team.roles
                      .filter((r) => (r.spots ?? 1) > 0)
                      .map((role) => {
                      const isOptimalRole = (team.bestMatchingRole?.roleTitle || recommendation?.bestMatchingRole?.roleTitle) === role.title;
                      const matchingSkillsCount = role.skills.filter((s) => checkSkillMatch(s)).length;

                      return (
                        <div
                          key={role.id || role.title}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 shadow-2xs ${
                            isOptimalRole
                              ? "bg-gradient-to-br from-primary-action/10 via-surface to-surface border-primary-action/40 shadow-xs"
                              : "bg-surface-dim/50 border-border-main"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm sm:text-base font-bold text-text-main font-heading truncate">
                                  {role.title}
                                </h4>
                                {isOptimalRole && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-primary-action text-white shadow-2xs">
                                    ⭐ Best Match
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-medium block mt-0.5">
                                {isOptimalRole ? (
                                  <span className="text-primary-action font-bold">Recommended Role</span>
                                ) : (
                                  <span className="text-text-muted">{role.spots || 1} Open Spot{(role.spots || 1) > 1 ? "s" : ""}</span>
                                )}
                              </span>
                            </div>

                            {isSignedIn && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                                  matchingSkillsCount > 0
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-surface text-text-muted border-border-main"
                                }`}
                              >
                                {matchingSkillsCount}/{role.skills.length} Skills Match
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 pt-1 border-t border-border-main/50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                              Technologies Needed:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {role.skills.map((skill) => {
                                const isMatched = checkSkillMatch(skill);
                                return (
                                  <span
                                    key={skill}
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                      isMatched && isSignedIn
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                        : "bg-surface text-text-muted border-border-main"
                                    }`}
                                  >
                                    {isMatched && isSignedIn && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                                    <span>{skill}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Fallback if no structured roles yet */
                  <div className="p-4 sm:p-5 rounded-2xl border border-border-main bg-surface-dim/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-text-main font-heading">
                        Core Squad Contributor
                      </h4>
                      <span className="text-xs text-text-muted font-medium">
                        Open Technical Requirements
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        Technologies Needed:
                      </span>
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
                  </div>
                )}
              </div>
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
                  const isCurrentMember =
                    member.userId === currentUserId ||
                    member.id === currentUserId ||
                    (currentUserEmail && member.email && member.email.toLowerCase() === currentUserEmail);
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
                  bestMatchingRole: team.bestMatchingRole || recommendation?.bestMatchingRole,
                  roles: team.roles,
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
                isMember={isUserMember || isUserLeader}
                onApply={() => {
                  if (!isRestrictedEvent && !isUserMember && !isUserLeader) {
                    setIsApplyModalOpen(true);
                  }
                }}
                onWithdraw={handleWithdrawApplication}
                onLeave={handleLeaveTeam}
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
            roles: team.roles,
            bestMatchingRole: team.bestMatchingRole || recommendation?.bestMatchingRole,
            university: team.university,
            members: team.members.map((m) => ({ id: m.id, name: m.name, role: m.role })),
          }}
          onSubmit={handleApplySuccess}
        />
      )}

      {/* Team Role-Based Invite Modal */}
      {pendingInvite && (
        <TeamInviteModal
          isOpen={isInviteModalOpen}
          invite={pendingInvite}
          teamName={team.name}
          eventTitle={team.event?.title}
          university={team.university || undefined}
          onClose={() => setIsInviteModalOpen(false)}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useUser, useAuth } from "@clerk/react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Loader2,
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
  TeamInviteItem,
} from "../services/api";
import { RecommendationTier, getSkillMatchType } from "../components/Badges";
import { SmartRecommendationPanel } from "../components/SmartRecommendationPanel";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import { TeamInviteModal } from "../components/TeamInviteModal";
import { CandidateApplicationData } from "../components/CandidateApplicationTile";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  TeamHero,
  TeamRolesGrid,
  TeamRosterList,
  TeamInviteForm,
  TeamInvitesSection,
  TeamApplicationsSection,
  TeamCandidateDossier,
} from "../components/team-detail";

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { fromEventId?: string; fromEventTitle?: string; from?: string } | null;
  const fromEventId = locationState?.fromEventId;
  const fromEventTitle = locationState?.fromEventTitle;
  const {
    isSignedIn,
    userVerifiedSkills,
    profile: contextProfile,
    userUniversity,
    refreshProfile,
  } = useUserContext();
  const { orgId } = useAuth();
  const { user } = useUser();
  const userOrgIds = useMemo(() => {
    return (user?.organizationMemberships || []).map((m) => m.organization.id);
  }, [user]);

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

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "primary";
    iconType?: "leave" | "remove" | "delete" | "warning";
    isLoading?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: null,
    onConfirm: async () => {},
  });

  // Load Team, User Profile, Applications (if leader), and Recommendations (if candidate)
  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const teamData = await teamsApi.getTeam(id!);
        if (!isMounted) return;
        setTeam(teamData);
        if (teamData.hasApplied) {
          setApplied(true);
        }

        if (!isSignedIn) {
          setProfile(null);
          setApplications([]);
          setRecommendation(null);
          return;
        }

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
        const isUserMember = Boolean(
          teamData.isMember ||
          (userProfile && teamData.members.some((m) =>
            m.userId === currentUid || (currentEmail && m.email && m.email.toLowerCase() === currentEmail)
          ))
        );
        const isUserInTeam = isUserLeader || isUserMember;

        if (isUserInTeam) {
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

          try {
            const recsRes = await recommendationsApi.getRecommendations({
              eventId: teamData.eventId,
              topK: 25,
            });
            if (isMounted) {
              const match = recsRes.recommendations.find((r: RecommendationItem) => r.teamId === teamData.id);
              if (match) {
                setRecommendation(match);
              }
            }
          } catch {
            // User might not have resume yet
          }
        }
      } catch (err: any) {
        console.error("[TeamDetailPage] Error fetching team details:", err);
        if (isMounted) setError(err.message || "Failed to load squad dossier.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id, isSignedIn, location.search, contextProfile]);

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

  const isUserInTeam = isUserLeader || isUserMember;

  const activeBestMatchingRole = useMemo(() => {
    const rawRole = recommendation?.bestMatchingRole || (team as any)?.bestMatchingRole;
    if (!rawRole) return null;
    if (!team?.roles || team.roles.length === 0) return rawRole;
    const targetRoleInTeam = team.roles.find(
      (r) => (r.id && r.id === rawRole.roleId) || r.title?.toLowerCase() === rawRole.roleTitle?.toLowerCase()
    );
    if (!targetRoleInTeam) return rawRole;
    const isRoleFilled = Boolean(targetRoleInTeam.assignedToId) || (targetRoleInTeam.spots !== undefined && targetRoleInTeam.spots <= 0);
    return isRoleFilled ? null : rawRole;
  }, [recommendation, team]);

  const handleApplySuccess = () => {
    setApplied(true);
    setIsApplyModalOpen(false);
    setToastMessage("✓ Application submitted successfully! The squad leader has been notified.");
    setTimeout(() => setToastMessage(null), 4000);
    if (id) {
      teamsApi.getTeam(id).then(setTeam).catch(() => {});
    }
  };

  const handleAcceptApplicant = (applicationId: string, candidateName?: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Accept Teammate into Squad",
      iconType: "warning",
      variant: "primary",
      confirmText: "Accept Candidate",
      description: (
        <span>
          Are you sure you want to accept <strong className="text-text-main font-semibold">{candidateName || "this candidate"}</strong> into your squad? They will immediately be added to the team roster.
        </span>
      ),
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await applicationsApi.acceptApplication(applicationId);
          await refreshProfile(true);
          setApplications((prev) => prev.filter((a) => a.id !== applicationId));
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          setToastMessage(`🎉 ${candidateName || "Candidate"} joined your squad!`);
          setTimeout(() => setToastMessage(null), 4000);
          if (id) {
            const refreshed = await teamsApi.getTeam(id);
            setTeam(refreshed);
          }
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          setToastMessage(err.message || "Failed to accept application.");
          setTimeout(() => setToastMessage(null), 4000);
        }
      },
    });
  };

  const handleDeclineApplicant = (applicationId: string, candidateName?: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Decline Application",
      iconType: "warning",
      variant: "danger",
      confirmText: "Decline",
      description: (
        <span>
          Are you sure you want to decline the application from <strong className="text-text-main font-semibold">{candidateName || "this candidate"}</strong>?
        </span>
      ),
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await applicationsApi.rejectApplication(applicationId);
          setApplications((prev) => prev.filter((a) => a.id !== applicationId));
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          setToastMessage("Application declined.");
          setTimeout(() => setToastMessage(null), 4000);
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          setToastMessage(err.message || "Failed to decline application.");
          setTimeout(() => setToastMessage(null), 4000);
        }
      },
    });
  };

  const handleLeaveTeam = () => {
    if (!team) return;
    setConfirmModal({
      isOpen: true,
      title: isUserLeader ? "Relinquish Leadership & Leave Squad" : "Leave Squad",
      iconType: "leave",
      variant: "danger",
      confirmText: "Leave Squad",
      description: (
        <span>
          Are you sure you want to leave <strong className="text-text-main font-semibold">{team.name}</strong>?
          {isUserLeader && (
            <span className="block mt-2 text-rose-500 font-medium text-xs">
              ⚠️ You are the Squad Leader. Leadership will be transferred to the next member in the roster.
            </span>
          )}
        </span>
      ),
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await teamsApi.leaveTeam(team.id);
          await refreshProfile(true);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          setToastMessage("You have left the squad.");
          navigate("/teams");
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          setToastMessage(err.message || "Failed to leave squad.");
          setTimeout(() => setToastMessage(null), 4000);
        }
      },
    });
  };

  const handleRemoveMember = (memberUserId: string, memberName?: string) => {
    if (!team) return;
    setConfirmModal({
      isOpen: true,
      title: "Remove Teammate",
      iconType: "remove",
      variant: "danger",
      confirmText: "Remove Member",
      description: (
        <span>
          Are you sure you want to remove <strong className="text-text-main font-semibold">{memberName || "this teammate"}</strong> from the squad roster? Their slot will be opened back up.
        </span>
      ),
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await teamsApi.removeMember(team.id, memberUserId);
          await refreshProfile(true);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          setToastMessage(`✓ ${memberName} removed from squad roster.`);
          setTimeout(() => setToastMessage(null), 4000);
          const refreshed = await teamsApi.getTeam(team.id);
          setTeam(refreshed);
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          setToastMessage(err.message || "Failed to remove member.");
          setTimeout(() => setToastMessage(null), 4000);
        }
      },
    });
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
      await refreshProfile(true);
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

  const handleCancelInvite = (inviteId: string, email: string) => {
    if (!team) return;
    setConfirmModal({
      isOpen: true,
      title: "Cancel Invitation",
      iconType: "warning",
      variant: "warning",
      confirmText: "Cancel Invite",
      description: (
        <span>
          Are you sure you want to cancel the pending invitation sent to <strong className="text-text-main font-semibold">{email}</strong>?
        </span>
      ),
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await invitesApi.cancelInvite(team.id, inviteId);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          setToastMessage(`✓ Invitation to ${email} cancelled.`);
          setTimeout(() => setToastMessage(null), 4000);
          const refreshed = await teamsApi.getTeam(team.id);
          setTeam(refreshed);
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          setToastMessage(err.message || "Failed to cancel invitation.");
          setTimeout(() => setToastMessage(null), 4000);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
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

  const category = (recommendation?.recommendationCategory ?? team.category) as RecommendationTier | undefined;
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
  const targetOrgId = team.orgId || (team.event as any)?.orgId;
  const isRestrictedEvent = Boolean(
    team.event &&
    !team.event.isGlobal &&
    (!targetOrgId || (orgId !== targetOrgId && !userOrgIds.includes(targetOrgId)))
  );

  const checkSkillMatch = (skill: string) => {
    if (!isSignedIn) return false;
    const sLower = skill.toLowerCase().trim();

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

    if (activeBreakdown && activeBreakdown.length > 0) {
      const match = activeBreakdown.find((b: any) => {
        const bName = (b.requirementName || "").toLowerCase().trim();
        return bName === sLower || bName.includes(sLower) || sLower.includes(bName);
      });
      if (match && match.score >= 0.6) return true;
    }

    const badgeType = getSkillMatchType(skill, userVerifiedSkills);
    return badgeType === "perfect" || badgeType === "partial";
  };

  const pendingAppsCount = applications.filter((a) => a.status === "PENDING").length;

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

      {/* Conditional Layout: Squad Management Dashboard (Leader & Members) vs Standard Squad Dossier (Non-Members) */}
      {isUserInTeam ? (
        <div className="space-y-8">
          <TeamHero
            team={team}
            isUserLeader={isUserLeader}
            totalSpots={totalSpots}
            pendingApplicationsCount={pendingAppsCount}
            totalApplicationsCount={applications.length}
          />

          <TeamRolesGrid
            roles={team.roles}
            requirements={team.requirements}
            members={team.members}
            profile={profile}
          />

          <TeamApplicationsSection
            applications={applications}
            isUserLeader={isUserLeader}
            onAccept={handleAcceptApplicant}
            onDecline={handleDeclineApplicant}
          />

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

              <TeamInviteForm
                team={team}
                isUserLeader={isUserLeader}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                selectedRoleId={selectedRoleId}
                setSelectedRoleId={setSelectedRoleId}
                isInviting={isInviting}
                onSendInvite={handleSendInvite}
              />
            </div>

            <TeamRosterList
              members={team.members}
              isUserLeader={isUserLeader}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              onLeaveTeam={handleLeaveTeam}
              onRemoveMember={handleRemoveMember}
            />

            <TeamInvitesSection
              team={team}
              isUserLeader={isUserLeader}
              onCancelInvite={handleCancelInvite}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <TeamCandidateDossier
              team={team}
              isSignedIn={isSignedIn}
              category={category}
              taxonomyScore={taxonomyScore}
              totalSpots={totalSpots}
              isRestrictedEvent={isRestrictedEvent}
              pendingInvite={pendingInvite}
              isUserMember={isUserMember}
              activeBestMatchingRole={activeBestMatchingRole}
              checkSkillMatch={checkSkillMatch}
              userVerifiedSkills={userVerifiedSkills}
              recommendation={recommendation}
              onOpenInviteModal={() => setIsInviteModalOpen(true)}
            />
          </div>

          <div className="space-y-6">
            <SmartRecommendationPanel
              recommendation={{
                teamId: team.id,
                teamName: team.name,
                category,
                taxonomyScore,
                fulfilledRequirements: fulfilledCount,
                totalRequirements: team.requirements.length,
                bestMatchingRole: activeBestMatchingRole || undefined,
                roles: team.roles,
                breakdown: activeBreakdown,
                teamLeadName: team.members.find((m) => m.role === "Leader")?.name || "Squad Lead",
                teamLeadUniversity: team.university || undefined,
                sameUniversity: Boolean(
                  userUni && teamUni && userUni.toLowerCase().trim() === teamUni.toLowerCase().trim()
                ),
                requirements: team.requirements,
                userVerifiedSkills,
              }}
              hasApplied={applied}
              isMember={isUserMember}
              isRestricted={isRestrictedEvent}
              onApply={() => setIsApplyModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <ApplyTeamModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        team={team as any}
        onSubmit={async (teamId, _role, message) => {
          try {
            await applicationsApi.applyToTeam(teamId, message);
            handleApplySuccess();
          } catch (err: any) {
            setToastMessage(err.message || "Failed to submit application.");
            setTimeout(() => setToastMessage(null), 4000);
          }
        }}
      />

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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        iconType={confirmModal.iconType}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))}
      />
    </div>
  );
}
export default TeamDetailPage;

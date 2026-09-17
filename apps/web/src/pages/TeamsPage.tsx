import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SignInButton } from "@clerk/react";
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Lock,
  Layers,
} from "lucide-react";
import { useUserContext } from "../contexts/UserContext";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { TeamTile } from "../components/TeamTile";
import { CategoryLegend } from "../components/CategoryLegend";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import { RecommendationBadge, ScopeBadge, SkillTag } from "../components/Badges";
import { CompatibilityScoreRing } from "../components/CompatibilityScoreRing";
import { ViewModeToggle, ViewMode } from "../components/ViewModeToggle";
import {
  teamsApi,
  organizersApi,
  applicationsApi,
  TeamItem,
  OrganizationItem,
} from "../services/api";
import { CacheService } from "../services/cache.service";

type SortOption = "FIT_DESC" | "FIT_ASC" | "SPOTS_DESC" | "NAME_ASC";

export function TeamsPage() {
  const { isSignedIn, userVerifiedSkills, profile: userProfile, userUniversity } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get("id");

  // Live teams state & pagination
  const [teams, setTeams] = useState<TeamCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Available universities for dynamic campus filtering
  const [universities, setUniversities] = useState<OrganizationItem[]>([]);
  const [campusSearch, setCampusSearch] = useState("");

  const myCampus = userUniversity || userProfile?.university || null;

  const filteredUniversities = useMemo(() => {
    const query = campusSearch.trim().toLowerCase();
    if (!query) return [];

    const queryTokens = query.split(/\s+/).filter(Boolean);

    return universities.filter((u) => {
      const uniName = u.name.toLowerCase();
      const uniSlug = (u.slug || "").toLowerCase();

      // 1. Direct substring in name or slug
      if (uniName.includes(query) || uniSlug.includes(query)) return true;

      // 2. All tokens present in name
      if (queryTokens.every((token) => uniName.includes(token))) return true;

      // 3. Acronym match (e.g. "iitd" or "ucb")
      const acronym = uniName
        .split(/\s+/)
        .map((w) => w[0])
        .join("");
      if (acronym.includes(query)) return true;

      return false;
    });
  }, [campusSearch, universities]);

  // Inspected team (split view drawer)
  const [inspectedTeam, setInspectedTeam] = useState<TeamCardData | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Active (committed) filters
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [filterCampus, setFilterCampus] = useState<string>("ALL");
  const [filterOpenSpotsOnly, setFilterOpenSpotsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>(isSignedIn ? "FIT_DESC" : "SPOTS_DESC");

  // Staged filter state (in popover until "Apply Filters" is clicked)
  const [stagedTier, setStagedTier] = useState<string>("ALL");
  const [stagedCampus, setStagedCampus] = useState<string>("ALL");
  const [stagedOpenSpotsOnly, setStagedOpenSpotsOnly] = useState<boolean>(false);

  // View Mode: Cards vs Tiles
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Load universities dynamically on mount
  useEffect(() => {
    organizersApi
      .getUniversities()
      .then((data) => {
        if (data && data.length > 0) setUniversities(data);
      })
      .catch((err) => console.warn("[TeamsPage] Could not load universities:", err));
  }, []);

  // Keep sort valid if signed out
  useEffect(() => {
    if (!isSignedIn && (sortBy === "FIT_DESC" || sortBy === "FIT_ASC")) {
      setSortBy("SPOTS_DESC");
    }
  }, [isSignedIn, sortBy]);

  // Sync staged filters when opening popover
  const handleOpenFilterPopover = () => {
    setStagedTier(filterTier);
    setStagedCampus(filterCampus);
    setStagedOpenSpotsOnly(filterOpenSpotsOnly);
    setCampusSearch("");
    setIsFilterOpen((prev) => !prev);
    setIsSortOpen(false);
  };

  // Commit staged filters
  const handleApplyFilters = () => {
    setFilterTier(stagedTier);
    setFilterCampus(stagedCampus);
    setFilterOpenSpotsOnly(stagedOpenSpotsOnly);
    setPage(1);
    setIsFilterOpen(false);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setStagedTier("ALL");
    setStagedCampus("ALL");
    setStagedOpenSpotsOnly(false);
    setCampusSearch("");
    setFilterTier("ALL");
    setFilterCampus("ALL");
    setFilterOpenSpotsOnly(false);
    setPage(1);
    setIsFilterOpen(false);
  };

  // Application feedback state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [appliedTeamIds, setAppliedTeamIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch teams with server-side filtering & recommendation sorting
  const loadTeams = useCallback(async (bypassCache = false) => {
    const userScope = userProfile?.userId || "anon";
    const cacheKey = `sq:teams:list:${JSON.stringify({
      page,
      debouncedSearch,
      filterTier,
      filterCampus,
      filterOpenSpotsOnly,
      sortBy,
      userScope,
    })}`;

    // SWR: Instant paint from client session cache if available
    if (!bypassCache) {
      const cached = CacheService.get<{ data: TeamCardData[]; totalPages: number; totalCount: number }>(
        cacheKey,
        "session"
      );
      if (cached) {
        setTeams(cached.data.data);
        setTotalPages(cached.data.totalPages);
        setTotalCount(cached.data.totalCount);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }

    try {
      const sortParam =
        sortBy === "FIT_DESC"
          ? "fit_desc"
          : sortBy === "FIT_ASC"
          ? "fit_asc"
          : sortBy === "SPOTS_DESC"
          ? "spots_desc"
          : sortBy === "NAME_ASC"
          ? "name_asc"
          : "created_at";

      const teamsRes = await teamsApi.getTeams({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        campus: filterCampus !== "ALL" ? filterCampus : undefined,
        tier: filterTier !== "ALL" ? filterTier : undefined,
        openSpotsOnly: filterOpenSpotsOnly,
        sort: sortParam,
      });

      const mapped: TeamCardData[] = (teamsRes.data || []).map((t: TeamItem) => ({
        id: t.id,
        name: t.name,
        eventId: t.eventId,
        eventTitle: t.event?.title || "Collegiate Hackathon",
        university: t.university || t.event?.university || t.event?.location || "External Campus",
        isGlobal: t.event?.isGlobal ?? (t as any).isGlobal ?? true,
        requirements: t.requirements || [],
        requirementBreakdown: t.requirementBreakdown,
        roles: t.roles,
        bestMatchingRole: t.bestMatchingRole,
        neededRequirement: t.requirements?.[0],
        taxonomyScore: t.taxonomyScore,
        category: t.category,
        description: t.description || t.event?.description || "",
        members: (t.members || []).map((m: any) => ({
          id: m.id || m.userId,
          name: m.name || "Member",
          role: m.role || "Member",
          avatarUrl: m.avatarUrl || m.profilePicture,
          profilePicture: m.profilePicture || m.avatarUrl,
        })),
        maxCapacity: t.maxCapacity || 4,
        isUserLeader: t.isLeader || false,
        isUserMember: t.isMember || false,
      }));

      setTeams(mapped);
      setTotalPages(teamsRes.pagination?.totalPages || 1);
      setTotalCount(teamsRes.pagination?.total || mapped.length);

      // Cache page payload in session storage
      CacheService.set(
        cacheKey,
        {
          data: mapped,
          totalPages: teamsRes.pagination?.totalPages || 1,
          totalCount: teamsRes.pagination?.total || mapped.length,
        },
        1000 * 60 * 2, // 2 minutes TTL
        "session"
      );

      // Auto-select if URL param present
      if (teamIdParam) {
        const match = mapped.find((m) => m.id === teamIdParam);
        if (match) setInspectedTeam(match);
      }
    } catch (err) {
      console.error("[TeamsPage] Error loading teams:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filterTier, filterCampus, filterOpenSpotsOnly, sortBy, userProfile?.userId, teamIdParam]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Toggle inspection: If the same team is clicked twice, hide the drawer.
  const handleInspectToggle = (team: TeamCardData) => {
    if (inspectedTeam?.id === team.id) {
      setInspectedTeam(null);
    } else {
      setInspectedTeam(team);
      setTimeout(() => {
        const id = viewMode === "cards" ? `team-card-${team.id}` : `team-tile-${team.id}`;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
    }
  };

  const activeFilterCount =
    (filterTier !== "ALL" ? 1 : 0) +
    (filterCampus !== "ALL" ? 1 : 0) +
    (filterOpenSpotsOnly ? 1 : 0);

  const handleApplySuccess = async (teamId: string, message?: string) => {
    try {
      await applicationsApi.applyToTeam(teamId, message);
      setAppliedTeamIds((prev) => [...prev, teamId]);
      setIsApplyModalOpen(false);
      setToastMessage("✓ Application submitted! Squad leaders have received your dossier.");
      loadTeams(true);
    } catch (err: any) {
      setToastMessage(err?.message || "Failed to submit application.");
      setIsApplyModalOpen(false);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const sortLabels: Record<SortOption, string> = {
    FIT_DESC: "Fit Score (Highest)",
    FIT_ASC: "Fit Score (Lowest)",
    SPOTS_DESC: "Open Spots (Most)",
    NAME_ASC: "Squad Name (A-Z)",
  };

  // Helper to check if a specific skill matches user's verified competencies or requirement breakdown
  const checkSkillMatch = (skill: string, team: TeamCardData): boolean => {
    if (!isSignedIn || !userVerifiedSkills || userVerifiedSkills.length === 0) return false;
    const sLower = skill.toLowerCase().trim();
    const direct = userVerifiedSkills.some((us) => {
      const uLower = us.toLowerCase().trim();
      return (
        uLower === sLower ||
        sLower.includes(uLower) ||
        uLower.includes(sLower) ||
        (sLower.includes("react") && uLower.includes("react")) ||
        (sLower.includes("frontend") && uLower.includes("frontend")) ||
        (sLower.includes("backend") && uLower.includes("backend")) ||
        (sLower.includes("python") && uLower.includes("python")) ||
        (sLower.includes("javascript") && uLower.includes("javascript")) ||
        (sLower.includes("typescript") && uLower.includes("typescript")) ||
        (sLower.includes("design") && uLower.includes("design")) ||
        (sLower.includes("css") && uLower.includes("css")) ||
        (sLower.includes("node") && uLower.includes("node"))
      );
    });
    if (direct) return true;
    if (team.requirementBreakdown) {
      const rb = team.requirementBreakdown.find((b) => {
        const bName = (b.requirementName || "").toLowerCase().trim();
        return bName === sLower || bName.includes(sLower) || sLower.includes(bName);
      });
      if (rb && (rb.score >= 0.6 || rb.isStrong)) return true;
    }
    return false;
  };

  // Helper to determine 3-tier role match status (perfect, partial, none)
  const getRoleMatchStatus = (
    role: { title: string; skills?: string[] },
    team: TeamCardData
  ): "perfect" | "partial" | "none" => {
    if (!isSignedIn || !userVerifiedSkills || userVerifiedSkills.length === 0) return "none";

    // 1. Check if bestMatchingRole matches this role
    if (team.bestMatchingRole && team.bestMatchingRole.roleTitle.toLowerCase().trim() === role.title.toLowerCase().trim()) {
      if (team.bestMatchingRole.score >= 0.85) return "perfect";
      if (team.bestMatchingRole.score >= 0.40) return "partial";
    }

    const skills = role.skills || [];
    if (skills.length === 0) return "none";

    let matchedCount = 0;
    for (const skill of skills) {
      if (checkSkillMatch(skill, team)) {
        matchedCount++;
      }
    }

    if (matchedCount === skills.length && matchedCount > 0) return "perfect";
    if (matchedCount > 0) return "partial";
    return "none";
  };

  // Reusable inspection details panel (used inline in Tiles view, and right-column in Cards view)
  const renderInspectionPanel = (team: TeamCardData, isInline = false) => {
    const isCampusRestricted = Boolean(
      team.isGlobal === false &&
      (!myCampus || !team.university || myCampus.toLowerCase().trim() !== team.university.toLowerCase().trim())
    );

    const rolesList =
      team.roles && team.roles.length > 0
        ? team.roles
        : team.requirements.length > 0
        ? team.requirements.map((req) => ({ title: req, skills: [req], spots: 1 }))
        : [{ title: "Core Contributor", skills: [], spots: 1 }];

    return (
      <div
        key={team.id}
        className={`w-full bg-surface rounded-2xl border border-border-main p-5 sm:p-6 shadow-xs space-y-4 ${
          isInline
            ? "mt-3 mb-2 animate-in fade-in slide-in-from-top-2 duration-200"
            : "lg:flex-1 min-w-0 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden hover:[scrollbar-width:thin] hover:[&::-webkit-scrollbar]:block hover:[&::-webkit-scrollbar]:w-1.5 hover:[&::-webkit-scrollbar-thumb]:bg-border-main hover:[&::-webkit-scrollbar-thumb]:rounded-full animate-in fade-in slide-from-right-8 duration-300 ease-out"
        }`}
      >
        {/* Header & Close Button */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-main">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {isSignedIn && team.category ? (
                <RecommendationBadge
                  category={team.category}
                  score={team.taxonomyScore}
                />
              ) : (
                <span className="text-xs font-semibold text-text-muted bg-surface-dim border border-border-main px-2.5 py-0.5 rounded-full">
                  General Squad
                </span>
              )}
              <span className="text-xs font-semibold text-primary-action bg-primary-light border border-primary-border px-2 py-0.5 rounded-full">
                {team.eventTitle}
              </span>

              {team.isUserLeader && (
                <span className="text-xs font-bold text-primary-action bg-primary-light border border-primary-border px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3 text-primary-action" /> Squad Leader
                </span>
              )}
              {team.isUserMember && !team.isUserLeader && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" /> Member
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-text-main font-heading">
              {team.name}
            </h2>

            {team.university && (
              <p className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-primary-action" />
                {team.university}
              </p>
            )}
          </div>

          <button
            onClick={() => setInspectedTeam(null)}
            className="p-1.5 rounded-lg hover:bg-surface-dim text-text-muted hover:text-text-main transition-colors cursor-pointer"
            title="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Mission */}
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">
            Squad Mission
          </h4>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-3">
            {team.description || "Active squad participating in the project sprint."}
          </p>
        </div>

        {/* Skill & Requirement Alignment */}
        {isSignedIn ? (
          <div
            className={`p-3.5 rounded-xl border space-y-3.5 ${
              team.category === "BEST"
                ? "bg-best-fit-light border-best-fit"
                : team.category === "GOOD_DIFFERENT_UNIVERSITY"
                  ? "bg-cross-campus-light border-cross-campus"
                  : team.category === "SAME_UNIVERSITY_LOWER_SCORE"
                    ? "bg-campus-explorer-light border-campus-explorer"
                    : "bg-surface-dim border-border-main"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
                {team.category ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-primary-action" /> Skill Compatibility Fit
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5 text-text-muted" /> Technical Alignment
                  </>
                )}
              </span>
              <span className="text-xs font-bold text-text-main">
                {team.taxonomyScore !== undefined
                  ? `${Math.round(team.taxonomyScore * 100)}% Match`
                  : "Unranked Match"}
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <CompatibilityScoreRing
                score={team.taxonomyScore}
                category={team.category || "UNRATED"}
                isUnrated={!team.category}
                size={52}
                strokeWidth={4.5}
              />
              <div className="space-y-0.5 text-xs text-text-muted min-w-0 flex-1">
                <p className="font-semibold text-text-main truncate">
                  {team.bestMatchingRole ? (
                    <span>
                      Optimal Role: <strong className="text-primary-action font-bold">{team.bestMatchingRole.roleTitle}</strong>
                    </span>
                  ) : team.neededRequirement ? (
                    `Actively seeking ${team.neededRequirement} lead`
                  ) : team.category ? (
                    "Matching your core technical competencies"
                  ) : (
                    "General technical vacancy"
                  )}
                </p>
                <p className="text-[11px] text-text-muted leading-snug">
                  {team.bestMatchingRole
                    ? `Matching ${team.bestMatchingRole.fulfilledCount} of ${team.bestMatchingRole.totalCount} required role competencies.`
                    : team.category
                    ? "Your verified resume skills align with the squad's target architecture."
                    : "Compare required skills against your verified profile competencies below."}
                </p>
              </div>
            </div>

            {/* Role : Technologies Needed Section */}
            <div className="space-y-2.5 pt-2.5 border-t border-border-main/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary-action" />
                  <span>Role : Technologies Needed</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border-main">
                  {rolesList.length} Role{rolesList.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2">
                {rolesList.map((role, idx) => {
                  const matchStatus = getRoleMatchStatus(role, team);
                  const isOptimalRole =
                    team.bestMatchingRole?.roleTitle?.toLowerCase().trim() === role.title.toLowerCase().trim();
                  const roleSkills = role.skills || [];
                  const matchedCount = roleSkills.filter((s) => checkSkillMatch(s, team)).length;

                  return (
                    <div
                      key={(role as any).id || role.title || idx}
                      className={`p-3 rounded-xl border transition-all space-y-2 ${
                        isOptimalRole
                          ? "bg-gradient-to-br from-primary-action/10 via-surface to-surface border-primary-action/40 shadow-2xs"
                          : matchStatus === "perfect"
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : matchStatus === "partial"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-surface border-border-main"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-xs font-bold text-text-main truncate font-heading">
                            {role.title}
                          </span>
                          {isOptimalRole && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary-action text-white shadow-2xs">
                              ⭐ Recommended
                            </span>
                          )}
                          {role.spots && (
                            <span className="text-[10px] text-text-muted font-medium">
                              • {role.spots} spot{role.spots > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            matchStatus === "perfect"
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                              : matchStatus === "partial"
                              ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                              : "bg-surface-dim text-text-muted border-border-main"
                          }`}
                        >
                          {roleSkills.length > 0 ? `${matchedCount}/${roleSkills.length} Skills Match` : "Open"}
                        </span>
                      </div>

                      {roleSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-border-main/40">
                          {roleSkills.map((req) => (
                            <SkillTag
                              key={req}
                              skill={req}
                              breakdown={team.requirementBreakdown}
                              userSkills={userVerifiedSkills}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-border-main bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-text-muted" /> Technical Requirements
              </span>
              <span className="text-xs font-medium text-text-muted">Sign in for compatibility</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Review required roles and team composition below. Sign in to view your personalized compatibility score.
            </p>
            <div className="space-y-2 pt-2 border-t border-border-main/60">
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-text-muted" /> Open Roles:
              </div>
              <div className="space-y-2">
                {rolesList.map((role, idx) => (
                  <div key={(role as any).id || role.title || idx} className="p-2.5 rounded-xl border border-border-main bg-surface-dim/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-main">{role.title}</span>
                      {role.spots && (
                        <span className="text-[10px] text-text-muted">{role.spots} Open Spot{role.spots > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {role.skills && role.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {role.skills.map((req) => (
                          <SkillTag key={req} skill={req} isMatched={false} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Current Roster Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black uppercase tracking-wider text-text-muted">
              Current Roster
            </span>
            <span className="text-text-muted font-medium">
              {team.members.length} / {team.maxCapacity || 4} spots filled
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {team.members.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-2 rounded-lg border border-border-main bg-surface-dim flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-primary-action text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  {(m.name || "M").split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "M"}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-main block truncate">
                    {m.name}
                  </span>
                  <span className="text-[10px] text-text-muted block truncate">
                    {m.role || (idx === 0 ? "Squad Lead" : "Contributor")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-border-main flex items-center gap-3">
          {team.members.length >= (team.maxCapacity || 4) ? (
            <>
              <span className="flex-1 py-2.5 text-center text-xs font-semibold text-text-muted bg-surface-dim rounded-xl border border-border-main">
                Squad Full • No Open Spots
              </span>
              <Link
                to={`/team/${team.id}`}
                state={{ from: "teams" }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Dossier ↗
              </Link>
            </>
          ) : team.isUserLeader ? (
            <Link
              to={`/team/${team.id}`}
              state={{ from: "teams" }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Crown className="w-4 h-4" /> Manage Applications & Roster →
            </Link>
          ) : team.isUserMember ? (
            <div className="w-full flex items-center gap-2">
              <span className="flex-1 py-2.5 text-center text-xs font-bold text-emerald-600 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                ✓ Already Part Of The Squad
              </span>
              <Link
                to={`/team/${team.id}`}
                state={{ from: "teams" }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Dossier ↗
              </Link>
            </div>
          ) : appliedTeamIds.includes(team.id) ? (
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 text-center py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold truncate px-2">
                ⏳ Application submitted • Pending review
              </div>
              <Link
                to={`/team/${team.id}`}
                state={{ from: "teams" }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors cursor-pointer shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Dossier ↗
              </Link>
            </div>
          ) : isCampusRestricted ? (
            <>
              <div
                className="flex-1 py-2.5 px-3 text-center text-xs font-semibold text-text-muted bg-surface-dim rounded-xl border border-border-main flex items-center justify-center gap-1.5"
                title={`This squad belongs to an institution-restricted event (${team.university || "Campus-only"}). Cross-campus applications are restricted.`}
              >
                <Lock className="w-3.5 h-3.5 text-text-muted" />
                <span>Campus Locked • Restricted Event</span>
              </div>

              <Link
                to={`/team/${team.id}`}
                state={{ from: "teams" }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Dossier ↗
              </Link>
            </>
          ) : !isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors cursor-pointer">
                  Sign In to Apply <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </SignInButton>

              <Link
                to={`/team/${team.id}`}
                state={{ from: "teams" }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Dossier ↗
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  if (!team.isUserLeader && !team.isUserMember) {
                    setIsApplyModalOpen(true);
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Request to Join Squad <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <Link
                to={`/team/${team.id}`}
                state={{ from: "teams" }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Dossier ↗
              </Link>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface text-text-main border border-border-main px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight font-heading">
            Squads Directory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Browse hackathon teams recruiting talent. Ranked globally by AI taxonomy fit.
          </p>
        </div>
        <button
          onClick={() => loadTeams(true)}
          title="Refresh Squads List"
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-muted hover:text-text-main text-xs font-semibold transition-all cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface rounded-2xl border border-border-main p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by team name, event, or required skills (e.g. React, Docker)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-surface-dim rounded-xl border border-border-main text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-action transition-all"
            />
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              onClick={handleOpenFilterPopover}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                activeFilterCount > 0
                  ? "bg-primary-light text-primary-action border-primary-border"
                  : "bg-surface text-text-main border-border-main hover:bg-surface-dim"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary-action text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-surface dark:bg-[#151c2e] rounded-2xl border border-border-main dark:border-slate-700/80 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] dark:ring-1 dark:ring-white/10 p-4 z-30 space-y-4 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                <div className="flex items-center justify-between pb-2 border-b border-border-main dark:border-slate-800">
                  <h4 className="text-xs font-black text-text-main uppercase tracking-wider">
                    Filter Squads
                  </h4>
                  {(stagedTier !== "ALL" || stagedCampus !== "ALL" || stagedOpenSpotsOnly) && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[11px] text-primary-action hover:underline font-semibold cursor-pointer"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Match Recommendation Spectrum (only when signed in) */}
                {isSignedIn && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-main block">
                      Match Recommendation
                    </label>
                    <div className="space-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setStagedTier("ALL")}
                        className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                          stagedTier === "ALL"
                            ? "bg-primary-light dark:bg-primary-action/20 text-primary-action dark:text-blue-400 font-bold border border-primary-border/30 dark:border-primary-action/30"
                            : "text-text-main hover:bg-surface-dim dark:hover:bg-slate-800/70"
                        }`}
                      >
                        All Tiers
                      </button>
                      <button
                        type="button"
                        onClick={() => setStagedTier("BEST")}
                        className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                          stagedTier === "BEST"
                            ? "bg-best-fit text-best-fit-dark font-bold"
                            : "text-best-fit-dark hover:bg-best-fit-light"
                        }`}
                      >
                        Best Fit
                      </button>
                      <button
                        type="button"
                        onClick={() => setStagedTier("CROSS_CAMPUS")}
                        className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                          stagedTier === "CROSS_CAMPUS"
                            ? "bg-cross-campus text-white font-bold"
                            : "text-cross-campus-dark hover:bg-cross-campus-light"
                        }`}
                      >
                        Cross-Campus
                      </button>
                      <button
                        type="button"
                        onClick={() => setStagedTier("CAMPUS_EXPLORER")}
                        className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                          stagedTier === "CAMPUS_EXPLORER"
                            ? "bg-campus-explorer text-white font-bold"
                            : "text-campus-explorer-dark hover:bg-campus-explorer-light"
                        }`}
                      >
                        Same Campus
                      </button>
                    </div>
                  </div>
                )}

                {/* Campus Affiliation */}
                <div className={`space-y-2 ${isSignedIn ? "pt-2 border-t border-border-main dark:border-slate-800" : ""}`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-main block">
                      Campus Affiliation
                    </label>
                    {stagedCampus !== "ALL" && (
                      <span className="text-[10px] font-semibold text-primary-action truncate max-w-[140px]" title={stagedCampus}>
                        {stagedCampus}
                      </span>
                    )}
                  </div>

                  {/* Primary Choices: All Campuses & User's University & Active Custom Campus */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setStagedCampus("ALL")}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                        stagedCampus === "ALL"
                          ? "bg-primary-light dark:bg-primary-action/20 text-primary-action dark:text-blue-400 font-bold border border-primary-border/30 dark:border-primary-action/30"
                          : "text-text-main hover:bg-surface-dim dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <span>All Campuses</span>
                      {stagedCampus === "ALL" && <Check className="w-3.5 h-3.5 text-primary-action flex-shrink-0" />}
                    </button>

                    {myCampus && (
                      <button
                        type="button"
                        onClick={() => setStagedCampus(myCampus)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                          stagedCampus === myCampus
                            ? "bg-primary-light dark:bg-primary-action/20 text-primary-action dark:text-blue-400 font-bold border border-primary-border/30 dark:border-primary-action/30"
                            : "text-text-main hover:bg-surface-dim dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <span className="truncate">{myCampus}</span>
                        {stagedCampus === myCampus && <Check className="w-3.5 h-3.5 text-primary-action flex-shrink-0" />}
                      </button>
                    )}

                    {stagedCampus !== "ALL" && stagedCampus !== myCampus && (
                      <button
                        type="button"
                        onClick={() => setStagedCampus(stagedCampus)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-light dark:bg-primary-action/20 text-primary-action dark:text-blue-400 transition-all cursor-pointer flex items-center justify-between border border-primary-border/30 dark:border-primary-action/30"
                      >
                        <span className="truncate">{stagedCampus}</span>
                        <Check className="w-3.5 h-3.5 text-primary-action flex-shrink-0" />
                      </button>
                    )}
                  </div>

                  {/* Search bar for universities */}
                  <div className="relative pt-0.5">
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={campusSearch}
                      onChange={(e) => setCampusSearch(e.target.value)}
                      placeholder="Search universities..."
                      className="w-full pl-8 pr-7 py-1.5 bg-surface-dim/70 dark:bg-slate-800/80 border border-border-main dark:border-slate-700/80 rounded-lg text-xs text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary-action"
                    />
                    {campusSearch && (
                      <button
                        type="button"
                        onClick={() => setCampusSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-0.5 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Filtered University List - ONLY shown when searching */}
                  {campusSearch.trim().length > 0 && (
                    <div className="space-y-0.5 max-h-36 overflow-y-auto pr-1 border border-border-main/60 dark:border-slate-700/60 rounded-lg p-1 bg-surface-dim/30 dark:bg-slate-900/50 animate-in fade-in duration-150">
                      {filteredUniversities.length > 0 ? (
                        filteredUniversities.map((uni) => {
                          const isSelected = stagedCampus === uni.name;
                          return (
                            <button
                              key={uni.id || uni.clerkOrgId || uni.name}
                              type="button"
                              onClick={() => {
                                setStagedCampus(uni.name);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-primary-light dark:bg-primary-action/20 text-primary-action dark:text-blue-400 font-bold border border-primary-border/30 dark:border-primary-action/30"
                                  : "text-text-main hover:bg-surface-dim dark:hover:bg-slate-800/70"
                              }`}
                            >
                              <span className="truncate">{uni.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary-action flex-shrink-0 ml-1" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-2.5 text-center text-xs text-text-muted">
                          No campuses matching &quot;{campusSearch}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Toggle Open Spots */}
                <div className="pt-2 border-t border-border-main dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-main">Open Spots Only</span>
                  <input
                    type="checkbox"
                    checked={stagedOpenSpotsOnly}
                    onChange={(e) => setStagedOpenSpotsOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-action focus:ring-primary-action cursor-pointer"
                  />
                </div>

                {/* Apply Filters Action Button */}
                <div className="pt-3 border-t border-border-main dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-text-muted hover:bg-surface-dim dark:hover:bg-slate-800/70 transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary-action text-white hover:bg-primary-hover shadow-xs transition-all cursor-pointer"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sort Popover Button */}
          <div className="relative">
            <button
              onClick={() => {
                setIsSortOpen(!isSortOpen);
                setIsFilterOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border-main bg-surface text-text-main hover:bg-surface-dim transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort: {sortLabels[sortBy].split(" ")[0]}</span>
            </button>

            {isSortOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-surface dark:bg-[#151c2e] rounded-2xl border border-border-main dark:border-slate-700/80 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] dark:ring-1 dark:ring-white/10 p-2 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                {(
                  (isSignedIn
                    ? [
                        { id: "FIT_DESC", label: "Fit Score (Highest)" },
                        { id: "FIT_ASC", label: "Fit Score (Lowest)" },
                        { id: "SPOTS_DESC", label: "Open Spots (Most)" },
                        { id: "NAME_ASC", label: "Squad Name (A-Z)" },
                      ]
                    : [
                        { id: "SPOTS_DESC", label: "Open Spots (Most)" },
                        { id: "NAME_ASC", label: "Squad Name (A-Z)" },
                      ]) as { id: SortOption; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSortBy(opt.id);
                      setPage(1);
                      setIsSortOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      sortBy === opt.id
                        ? "bg-primary-light dark:bg-primary-action/20 text-primary-action dark:text-blue-400 font-bold border border-primary-border/30 dark:border-primary-action/30"
                        : "text-text-main hover:bg-surface-dim dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-primary-action" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* Legend */}
        <div className="pt-2.5 border-t border-border-main flex flex-wrap items-center justify-between gap-2 px-1">
          {isSignedIn ? <CategoryLegend /> : <div />}
          <span className="text-xs text-text-muted font-medium hidden sm:inline">
            Showing {teams.length} of {totalCount} squads
          </span>
        </div>
      </div>

      {/* DYNAMIC VIEW: Unified container with stable card width and smooth drawer slide-in */}
      <div className={`flex flex-col ${viewMode === "cards" ? "lg:flex-row" : ""} items-start gap-6 relative`}>
        {/* Cards / Tiles Column */}
        <div
          className={`w-full ${inspectedTeam && viewMode === "cards" ? "lg:w-[390px] xl:w-[420px] shrink-0" : ""}`}
        >
          {inspectedTeam && viewMode === "cards" && (
            <div className="flex items-center justify-between px-1 mb-3 text-xs text-text-muted font-medium animate-in fade-in duration-200">
              <span>Select a squad to inspect:</span>
              <button
                onClick={() => setInspectedTeam(null)}
                className="text-primary-action font-bold hover:underline cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary-action animate-spin" />
              <p className="text-xs font-semibold text-text-muted">Loading squads & teams...</p>
            </div>
          ) : viewMode === "cards" ? (
            <div
              className={`grid gap-6 ${
                inspectedTeam ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {teams.map((team) => {
                const isRestricted = Boolean(
                  team.isGlobal === false &&
                  (!myCampus || !team.university || myCampus.toLowerCase().trim() !== team.university.toLowerCase().trim())
                );
                return (
                  <div key={team.id} id={`team-card-${team.id}`} className="h-full scroll-mt-24">
                    <TeamCard
                      team={team}
                      isSelected={inspectedTeam?.id === team.id}
                      hasApplied={appliedTeamIds.includes(team.id)}
                      onInspect={() => handleInspectToggle(team)}
                      onApply={() => {
                        handleInspectToggle(team);
                        if (!team.isUserLeader && !isRestricted) {
                          setIsApplyModalOpen(true);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col space-y-3 w-full">
              {teams.map((team) => {
                const isSelected = inspectedTeam?.id === team.id;
                const isRestricted = Boolean(
                  team.isGlobal === false &&
                  (!myCampus || !team.university || myCampus.toLowerCase().trim() !== team.university.toLowerCase().trim())
                );
                return (
                  <div key={team.id} id={`team-tile-${team.id}`} className="w-full scroll-mt-24">
                    <TeamTile
                      team={team}
                      isSelected={isSelected}
                      hasApplied={appliedTeamIds.includes(team.id)}
                      onInspect={() => handleInspectToggle(team)}
                      onApply={() => {
                        handleInspectToggle(team);
                        if (!team.isUserLeader && !isRestricted) {
                          setIsApplyModalOpen(true);
                        }
                      }}
                    />
                    {isSelected && renderInspectionPanel(team, true)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="pt-8 flex items-center justify-between border-t border-border-main mt-6">
              <span className="text-xs text-text-muted">
                Page {page} of {totalPages} ({totalCount} squads)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-text-main" />
                </button>
                <span className="text-xs font-bold text-text-main px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-text-main" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Inspection Panel (ONLY in Cards View) */}
        {inspectedTeam && viewMode === "cards" && (
          renderInspectionPanel(inspectedTeam, false)
        )}
      </div>

      {!isLoading && teams.length === 0 && (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border-main p-8 space-y-3">
          <Users className="w-12 h-12 text-text-muted mx-auto opacity-50" />
          <h3 className="text-base font-bold text-text-main">No matching squads found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Try clearing your active filters or changing your search query.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterTier("ALL");
              setFilterCampus("ALL");
              setFilterOpenSpotsOnly(false);
            }}
            className="text-xs font-bold text-primary-action hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Apply Team Modal */}
      {inspectedTeam && (
        <ApplyTeamModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          team={inspectedTeam}
          onSubmit={handleApplySuccess}
        />
      )}
    </div>
  );
}

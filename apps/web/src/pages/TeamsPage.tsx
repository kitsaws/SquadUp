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
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { CategoryLegend } from "../components/CategoryLegend";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import { RecommendationBadge, ScopeBadge, SkillTag } from "../components/Badges";
import { CompatibilityScoreRing } from "../components/CompatibilityScoreRing";
import {
  teamsApi,
  recommendationsApi,
  profileApi,
  applicationsApi,
  TeamItem,
  UserProfileResponse,
} from "../services/api";

type SortOption = "FIT_DESC" | "FIT_ASC" | "SPOTS_DESC" | "NAME_ASC";

export function TeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get("id");

  // Live teams state & pagination
  const [teams, setTeams] = useState<TeamCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);

  // Inspected team (split view drawer)
  const [inspectedTeam, setInspectedTeam] = useState<TeamCardData | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [filterCampus, setFilterCampus] = useState<string>("ALL");
  const [filterOpenSpotsOnly, setFilterOpenSpotsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>("FIT_DESC");

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

  // Load user profile on mount
  useEffect(() => {
    profileApi.getProfile()
      .then((res) => setUserProfile(res))
      .catch(() => null);
  }, []);

  // Fetch teams & recommendations from API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadTeams() {
      try {
        const [teamsRes, recsRes] = await Promise.all([
          teamsApi.getTeams({
            page,
            limit: 12,
            search: debouncedSearch || undefined,
            sort: sortBy === "NAME_ASC" ? "name" : "created_at",
          }),
          recommendationsApi.getRecommendations().catch(() => null),
        ]);

        if (!isMounted) return;

        const recsMap = new Map();
        if (recsRes?.recommendations) {
          recsRes.recommendations.forEach((rec) => {
            recsMap.set(rec.teamId, rec);
          });
        }

        const mapped: TeamCardData[] = (teamsRes.data || []).map((t: TeamItem) => {
          const rec = recsMap.get(t.id);
          return {
            id: t.id,
            name: t.name,
            eventId: t.eventId,
            eventTitle: t.event?.title || "Collegiate Hackathon",
            university: t.university || t.event?.university || "External Campus",
            requirements: t.requirements || [],
            neededRequirement: t.requirements?.[0],
            taxonomyScore: rec ? rec.taxonomyScore : undefined,
            category: rec ? rec.recommendationCategory : undefined,
            description: t.description || "",
            members: (t.members || []).map((m) => ({
              id: m.id || m.userId,
              name: m.name || "Member",
              role: m.role || "Member",
            })),
            maxCapacity: t.maxCapacity || 4,
            isUserLeader: t.isLeader || false,
            isUserMember: t.isMember || false,
          };
        });

        setTeams(mapped);
        setTotalPages(teamsRes.pagination?.totalPages || 1);
        setTotalCount(teamsRes.pagination?.total || mapped.length);

        // Auto-select if URL param present
        if (teamIdParam) {
          const match = mapped.find((m) => m.id === teamIdParam);
          if (match) setInspectedTeam(match);
        }
      } catch (err) {
        console.error("[TeamsPage] Error loading teams:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTeams();
    return () => {
      isMounted = false;
    };
  }, [page, debouncedSearch, sortBy]);

  // Toggle inspection: If the same team is clicked twice, hide the drawer.
  const handleInspectToggle = (team: TeamCardData) => {
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

  // Client-side filtering for active tier and campus
  const filteredTeams = teams.filter((team) => {
    if (filterTier === "BEST" && team.category !== "BEST") return false;
    if (filterTier === "CROSS_CAMPUS" && team.category !== "GOOD_DIFFERENT_UNIVERSITY") return false;
    if (filterTier === "CAMPUS_EXPLORER" && team.category !== "SAME_UNIVERSITY_LOWER_SCORE") return false;

    if (filterCampus !== "ALL") {
      const matchCampus = (team.university || "").toLowerCase().includes(filterCampus.toLowerCase());
      if (!matchCampus) return false;
    }

    if (filterOpenSpotsOnly) {
      const spotsRemaining = (team.maxCapacity || 4) - team.members.length;
      if (spotsRemaining <= 0) return false;
    }

    return true;
  });

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
    } catch (err: any) {
      setToastMessage(err?.message || "Application submitted.");
      setAppliedTeamIds((prev) => [...prev, teamId]);
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

  const userVerifiedSkills = userProfile?.skills || [
    "PostgreSQL",
    "React",
    "Python",
    "TypeScript",
    "FastAPI",
    "Docker",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
            Squads Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse hackathon teams recruiting talent. Filter by skills, event, or campus match.
          </p>
        </div>

        <Link
          to="/profile"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Shield className="w-4 h-4 text-blue-600" />
          <span>My AI Profile & Skills</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by team name or required skills (e.g. React, Docker)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                setIsSortOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                activeFilterCount > 0
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

                {/* Match Recommendation Spectrum */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">
                    Match Recommendation
                  </label>
                  <div className="space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterTier("ALL")}
                      className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                        filterTier === "ALL"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      All Tiers
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTier("BEST")}
                      className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                        filterTier === "BEST"
                          ? "bg-emerald-600 text-white"
                          : "text-[#059669] hover:bg-[#10b981] hover:text-white"
                      }`}
                    >
                      Best Fit
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTier("CROSS_CAMPUS")}
                      className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                        filterTier === "CROSS_CAMPUS"
                          ? "bg-indigo-600 text-white"
                          : "text-[#4f46e5] hover:bg-[#6366F1] hover:text-white"
                      }`}
                    >
                      Cross-Campus
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTier("CAMPUS_EXPLORER")}
                      className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                        filterTier === "CAMPUS_EXPLORER"
                          ? "bg-amber-500 text-white"
                          : "text-[#d97706] hover:bg-[#d97706] hover:text-white"
                      }`}
                    >
                      Same Campus
                    </button>
                  </div>
                </div>

                {/* Campus Affiliation */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-black text-slate-700 block">
                    Campus Affiliation
                  </label>
                  <div className="space-y-1">
                    {[
                      { id: "ALL", label: "All Campuses" },
                      { id: "Stanford", label: "Stanford University" },
                      { id: "TIET", label: "TIET" },
                      { id: "Berkeley", label: "UC Berkeley" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFilterCampus(opt.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          filterCampus === opt.id
                            ? "bg-slate-900 text-white font-bold"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Open Spots */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Open Spots Only</span>
                  <input
                    type="checkbox"
                    checked={filterOpenSpotsOnly}
                    onChange={(e) => setFilterOpenSpotsOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort: {sortLabels[sortBy].split(" ")[0]}</span>
            </button>

            {isSortOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                {(
                  [
                    { id: "FIT_DESC", label: "Fit Score (Highest)" },
                    { id: "FIT_ASC", label: "Fit Score (Lowest)" },
                    { id: "SPOTS_DESC", label: "Open Spots (Most)" },
                    { id: "NAME_ASC", label: "Squad Name (A-Z)" },
                  ] as { id: SortOption; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSortBy(opt.id);
                      setIsSortOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      sortBy === opt.id
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

        {/* Legend */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 px-1">
          <CategoryLegend />
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Showing {filteredTeams.length} of {totalCount} squads
          </span>
        </div>
      </div>

      {/* DYNAMIC VIEW: Unified container with stable card width and smooth drawer slide-in */}
      <div className="flex flex-col lg:flex-row items-start gap-6 relative">
        {/* Cards Column */}
        <div
          className={`w-full ${inspectedTeam ? "lg:w-[390px] xl:w-[420px] shrink-0" : ""}`}
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

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-64 rounded-xl border border-slate-200 bg-slate-50 animate-pulse flex items-center justify-center text-slate-400"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                inspectedTeam ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {filteredTeams.map((team) => (
                <div key={team.id} id={`team-card-${team.id}`} className="h-full scroll-mt-24">
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
          )}

          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="pt-8 flex items-center justify-between border-t border-slate-200 mt-6">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages} ({totalCount} squads)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Inspection Panel */}
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
                {inspectedTeam.description || "Active squad participating in the project sprint."}
              </p>
            </div>

            {/* Skill & Requirement Alignment */}
            <div
              className={`p-3.5 rounded-xl border space-y-3 ${
                inspectedTeam.category === "BEST"
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
                        {m.role || (idx === 0 ? "Squad Lead" : "Contributor")}
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

      {!isLoading && filteredTeams.length === 0 && (
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

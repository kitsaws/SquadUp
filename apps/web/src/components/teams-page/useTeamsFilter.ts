import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import { teamsApi, organizersApi, TeamItem, OrganizationItem } from "../../services/api";
import { TeamCardData } from "../TeamCard";
import { ViewMode } from "../ViewModeToggle";
import { CacheService } from "../../services/cache.service";

export type SortOption = "FIT_DESC" | "FIT_ASC" | "SPOTS_DESC" | "NAME_ASC";

export function useTeamsFilter() {
  const { isSignedIn, profile: userProfile, userUniversity } = useUserContext();
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get("id");

  const [teams, setTeams] = useState<TeamCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [universities, setUniversities] = useState<OrganizationItem[]>([]);
  const [campusSearch, setCampusSearch] = useState("");

  const [inspectedTeam, setInspectedTeam] = useState<TeamCardData | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [filterCampus, setFilterCampus] = useState<string>("ALL");
  const [filterOpenSpotsOnly, setFilterOpenSpotsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>(isSignedIn ? "FIT_DESC" : "SPOTS_DESC");

  const [stagedTier, setStagedTier] = useState<string>("ALL");
  const [stagedCampus, setStagedCampus] = useState<string>("ALL");
  const [stagedOpenSpotsOnly, setStagedOpenSpotsOnly] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const myCampus = userUniversity || userProfile?.university || null;

  useEffect(() => {
    organizersApi
      .getUniversities()
      .then((data) => {
        if (data && data.length > 0) setUniversities(data);
      })
      .catch((err) => console.warn("[useTeamsFilter] Could not load universities:", err));
  }, []);

  useEffect(() => {
    if (!isSignedIn && (sortBy === "FIT_DESC" || sortBy === "FIT_ASC")) {
      setSortBy("SPOTS_DESC");
    }
  }, [isSignedIn, sortBy]);

  const filteredUniversities = useMemo(() => {
    const query = campusSearch.trim().toLowerCase();
    if (!query) return [];

    const queryTokens = query.split(/\s+/).filter(Boolean);

    return universities.filter((u) => {
      const uniName = u.name.toLowerCase();
      const uniSlug = (u.slug || "").toLowerCase();

      if (uniName.includes(query) || uniSlug.includes(query)) return true;
      if (queryTokens.every((token) => uniName.includes(token))) return true;

      const acronym = uniName
        .split(/\s+/)
        .map((w) => w[0])
        .join("");
      if (acronym.includes(query)) return true;

      return false;
    });
  }, [campusSearch, universities]);

  const handleOpenFilterPopover = () => {
    setStagedTier(filterTier);
    setStagedCampus(filterCampus);
    setStagedOpenSpotsOnly(filterOpenSpotsOnly);
    setCampusSearch("");
    setIsFilterOpen((prev) => !prev);
    setIsSortOpen(false);
  };

  const handleApplyFilters = () => {
    setFilterTier(stagedTier);
    setFilterCampus(stagedCampus);
    setFilterOpenSpotsOnly(stagedOpenSpotsOnly);
    setPage(1);
    setIsFilterOpen(false);
  };

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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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
        orgId: t.orgId || (t.event as any)?.orgId || null,
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
        maxCapacity:
          t.maxCapacity ||
          (t.roles && t.roles.length > 0
            ? (t.members || []).length + t.roles.reduce((acc, r) => acc + (r.spots ?? 0), 0)
            : t.requirements && t.requirements.length > 0
            ? Math.max((t.members || []).length, t.requirements.length)
            : Math.max((t.members || []).length, 4)),
        isUserLeader: t.isLeader || false,
        isUserMember: t.isMember || false,
      }));

      setTeams(mapped);
      setTotalPages(teamsRes.pagination?.totalPages || 1);
      setTotalCount(teamsRes.pagination?.total || mapped.length);

      CacheService.set(
        cacheKey,
        {
          data: mapped,
          totalPages: teamsRes.pagination?.totalPages || 1,
          totalCount: teamsRes.pagination?.total || mapped.length,
        },
        1000 * 60 * 2,
        "session"
      );

      if (teamIdParam) {
        const match = mapped.find((m) => m.id === teamIdParam);
        if (match) setInspectedTeam(match);
      }
    } catch (err) {
      console.error("[useTeamsFilter] Error loading teams:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filterTier, filterCampus, filterOpenSpotsOnly, sortBy, userProfile?.userId, teamIdParam]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

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

  return {
    teams,
    isLoading,
    page,
    setPage,
    totalPages,
    totalCount,
    searchQuery,
    setSearchQuery,
    isFilterOpen,
    setIsFilterOpen,
    isSortOpen,
    setIsSortOpen,
    filterTier,
    filterCampus,
    filterOpenSpotsOnly,
    sortBy,
    setSortBy,
    stagedTier,
    setStagedTier,
    stagedCampus,
    setStagedCampus,
    stagedOpenSpotsOnly,
    setStagedOpenSpotsOnly,
    campusSearch,
    setCampusSearch,
    filteredUniversities,
    myCampus,
    viewMode,
    setViewMode,
    inspectedTeam,
    setInspectedTeam,
    handleInspectToggle,
    handleOpenFilterPopover,
    handleApplyFilters,
    handleResetFilters,
    activeFilterCount,
    loadTeams,
  };
}

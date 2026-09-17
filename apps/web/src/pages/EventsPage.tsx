import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Calendar,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { EventCard, EventCardData } from "../components/EventCard";
import { EventTile } from "../components/EventTile";
import { ViewModeToggle, ViewMode } from "../components/ViewModeToggle";
import { useUserContext } from "../contexts/UserContext";
import {
  eventsApi,
  EventItem,
  PaginatedResponse,
} from "../services/api";

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function calculateDaysRemaining(dateStr: string): number {
  try {
    const eventTime = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = Math.ceil((eventTime - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  } catch {
    return 30;
  }
}

function mapEventToCardData(item: EventItem): EventCardData {
  const orgName =
    item.organization?.name ||
    item.organizerProfile?.name ||
    (item.location && item.location !== "Virtual / Global" ? item.location : null) ||
    "Official Host";

  return {
    id: item.id,
    title: item.title,
    organizerName: orgName,
    organization: item.organization?.name || item.organizerProfile?.name || undefined,
    organizerLogo: item.organization?.logoUrl || item.organizerProfile?.logoUrl || undefined,
    dateStr: formatEventDate(item.date),
    location: item.location,
    isGlobal: item.isGlobal,
    daysRemaining: calculateDaysRemaining(item.date),
    description: item.description,
    tracks: item.tracks && item.tracks.length > 0 ? item.tracks : ["General", "Open Track"],
    teamsCount: item.teamsCount || 0,
    participantsCount: item.participantsCount || (item.teamsCount ? item.teamsCount * 3 : 0),
  };
}

export function EventsPage() {
  const navigate = useNavigate();
  const { userUniversity, profile: userProfile } = useUserContext();
  const myCampus = userUniversity || userProfile?.university || null;

  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [scopeFilter, setScopeFilter] = useState<"all" | "campus" | "global">("all");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [eventsViewMode, setEventsViewMode] = useState<ViewMode>("cards");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalEvents, setTotalEvents] = useState<number>(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch paginated events from backend API - sorted by popularity
  useEffect(() => {
    let isMounted = true;
    async function fetchEvents() {
      setLoading(true);
      setError(null);

      try {
        const res: PaginatedResponse<EventItem> = await eventsApi.getEvents({
          page: currentPage,
          limit: 9,
          search: debouncedSearch || undefined,
          scope: scopeFilter === "campus" ? (myCampus ? "all" : "org") : scopeFilter,
          campus: scopeFilter === "campus" && myCampus ? myCampus : undefined,
          sort: "popularity",
        });

        if (!isMounted) return;

        setEvents(res.data.map(mapEventToCardData));
        setTotalPages(res.pagination.totalPages);
        setTotalEvents(res.pagination.total);
      } catch (err: any) {
        console.error("[EventsPage] Error fetching events:", err);
        if (isMounted) setError(err.message || "Failed to load events from server.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchEvents();
    return () => {
      isMounted = false;
    };
  }, [currentPage, debouncedSearch, scopeFilter, myCampus]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main font-heading tracking-tight">
            Hackathons & Tech Events
          </h1>
          <p className="text-sm text-text-muted font-medium mt-1">
            Discover university project fairs, hackathons, and global competitions recruiting squads.
          </p>
        </div>

        <Link
          to="/teams"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-action hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Users className="w-3.5 h-3.5" /> Browse All Squads
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-3.5 rounded-xl border border-border-main shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search events by name, location, or track..."
            className="w-full text-xs text-text-main placeholder:text-text-muted bg-surface-dim pl-9 pr-3 py-2 rounded-lg border border-border-main outline-hidden focus:border-primary-action font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scope Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-surface-dim border border-border-main text-xs font-medium">
            <button
              onClick={() => {
                setScopeFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                scopeFilter === "all"
                  ? "bg-surface text-text-main shadow-2xs font-bold border border-border-main"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              All Events
            </button>

            <button
              onClick={() => {
                setScopeFilter("campus");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                scopeFilter === "campus"
                  ? "bg-surface text-primary-action shadow-2xs font-bold border border-border-main"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              {myCampus ? (
                <>
                  <span className="text-[10px] font-extrabold uppercase bg-primary-light text-primary-action px-1.5 py-0.5 rounded">
                    My Campus
                  </span>
                  <span className="truncate max-w-[150px]">{myCampus}</span>
                </>
              ) : (
                <span>Campus Only</span>
              )}
            </button>

            <button
              onClick={() => {
                setScopeFilter("global");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                scopeFilter === "global"
                  ? "bg-surface text-text-main shadow-2xs font-bold border border-border-main"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              Global
            </button>
          </div>

          {/* View Mode Toggle */}
          <ViewModeToggle
            mode={eventsViewMode}
            onChange={setEventsViewMode}
            size="sm"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary-action animate-spin" />
          <p className="text-xs font-semibold text-text-muted">Loading hackathons & competitions...</p>
        </div>
      ) : error ? (
        <div className="bg-surface rounded-2xl border border-rose-500/30 p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-text-main">Failed to load events</p>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
      ) : events.length > 0 ? (
        /* Events Grid / Tiles */
        eventsViewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={(evt) => navigate(`/event/${evt.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {events.map((event) => (
              <EventTile
                key={event.id}
                event={event}
                onSelect={(evt) => navigate(`/event/${evt.id}`)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="bg-surface rounded-2xl border border-border-main p-12 text-center space-y-2">
          <Calendar className="w-10 h-10 text-text-muted mx-auto opacity-50" />
          <h4 className="text-sm font-bold text-text-main">No events matched your criteria</h4>
          <p className="text-xs text-text-muted">Try adjusting your search terms or scope filter.</p>
        </div>
      )}

      {/* Server-Side Pagination Footer */}
      {!loading && events.length > 0 && (
        <div className="pt-6 border-t border-border-main flex flex-wrap items-center justify-between gap-4 text-xs text-text-muted">
          <span>
            Page <strong className="text-text-main">{currentPage}</strong> of {totalPages} (
            {totalEvents} total events)
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md border border-border-main bg-surface hover:bg-surface-dim text-text-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((pageNum, idx, arr) => (
                <React.Fragment key={pageNum}>
                  {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                    <span className="px-1 text-text-muted">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? "border-primary-action bg-primary-action text-white font-bold"
                        : "border-border-main bg-surface hover:bg-surface-dim text-text-main"
                    }`}
                  >
                    {pageNum}
                  </button>
                </React.Fragment>
              ))}

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md border border-border-main bg-surface hover:bg-surface-dim text-text-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

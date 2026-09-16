import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  ArrowRight,
  Shield,
  Sparkles,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { EventCard, EventCardData } from "../components/EventCard";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { CategoryLegend } from "../components/CategoryLegend";
import { ScopeBadge } from "../components/Badges";
import {
  eventsApi,
  recommendationsApi,
  EventItem,
  TeamItem,
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
  return {
    id: item.id,
    title: item.title,
    organizerName: item.organizerProfile?.name || item.organizer?.name || "Official Host",
    organizerLogo: item.organizerProfile?.logoUrl || undefined,
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
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventCardData | null>(null);
  const [eventTeams, setEventTeams] = useState<TeamCardData[]>([]);
  const [teamsLoading, setTeamsLoading] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [scopeFilter, setScopeFilter] = useState<"all" | "global" | "org">("all");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

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

  // Fetch paginated events from backend API
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
          scope: scopeFilter,
          sort: "date_asc",
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
  }, [currentPage, debouncedSearch, scopeFilter]);

  // When an event is selected, fetch participating teams from API
  useEffect(() => {
    let isMounted = true;
    if (!selectedEvent) {
      setEventTeams([]);
      return;
    }

    async function fetchTeamsForEvent() {
      setTeamsLoading(true);
      try {
        const res = await eventsApi.getEventTeams(selectedEvent!.id);
        if (!isMounted) return;

        // Try decorating with user recommendations if available
        let recMap: Record<string, { score: number; category: any }> = {};
        try {
          const recRes = await recommendationsApi.getRecommendations({
            eventId: selectedEvent!.id,
            topK: 20,
          });
          recRes.recommendations.forEach((r) => {
            recMap[r.teamId] = {
              score: r.taxonomyScore,
              category: r.recommendationCategory,
            };
          });
        } catch {
          // Unauthenticated or no resume
        }

        const mapped: TeamCardData[] = (res.teams || []).map((t: TeamItem) => ({
          id: t.id,
          name: t.name,
          eventId: t.eventId,
          eventTitle: selectedEvent!.title,
          university: t.university || selectedEvent!.location,
          requirements: t.requirements || [],
          neededRequirement: t.requirements?.[0] || "Specialist",
          members: (t.members || []).map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
          })),
          maxCapacity: t.maxCapacity || 4,
          taxonomyScore: recMap[t.id]?.score,
          category: recMap[t.id]?.category,
          description: t.description || `Formed for ${selectedEvent!.title}.`,
        }));

        setEventTeams(mapped);
      } catch (err: any) {
        console.warn("[EventsPage] Error fetching teams for event:", err);
      } finally {
        if (isMounted) setTeamsLoading(false);
      }
    }

    fetchTeamsForEvent();
    return () => {
      isMounted = false;
    };
  }, [selectedEvent]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          VIEW A: Clicked Event Detail View (When an event is selected)
         ───────────────────────────────────────────────────────────── */}
      {selectedEvent ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Back Button */}
          <button
            onClick={() => setSelectedEvent(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All Events
          </button>

          {/* Event Hero Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary-light text-primary-action border border-primary-border">
                    Hosted by {selectedEvent.organizerName}
                  </span>
                  <ScopeBadge isGlobal={selectedEvent.isGlobal} location={selectedEvent.location} />
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> {selectedEvent.daysRemaining} Days Remaining
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">
                  {selectedEvent.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> {selectedEvent.dateStr}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" /> {selectedEvent.location}
                  </span>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              {/* Action Panel */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <Link
                  to={`/teams?eventId=${selectedEvent.id}`}
                  className="px-5 py-2.5 rounded-lg bg-primary-action hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors text-center cursor-pointer"
                >
                  Explore Squads for this Event
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert("Event link copied to clipboard!");
                  }}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Share Event Link
                </button>
              </div>
            </div>

            {/* Live Metrics Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-500 block">Recruiting Squads</span>
                <span className="text-xl font-bold text-slate-900 font-heading">
                  {eventTeams.length} Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-500 block">Event Track</span>
                <span className="text-xl font-bold text-slate-900 font-heading truncate block">
                  {selectedEvent.tracks?.[0] || "General Track"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-500 block">Days to Kickoff</span>
                <span className="text-xl font-bold text-slate-900 font-heading">
                  {selectedEvent.daysRemaining} Days
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-500 block">Access Scope</span>
                <span className="text-xl font-bold text-slate-900 font-heading">
                  {selectedEvent.isGlobal ? "Global Open" : "Campus Locked"}
                </span>
              </div>
            </div>
          </div>

          {/* Active Teams Inside this Event */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-heading">
                  Recruiting Teams in {selectedEvent.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore squads actively seeking teammates for this competition.
                </p>
              </div>

              <CategoryLegend />
            </div>

            {teamsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 text-primary-action animate-spin" />
                <p className="text-xs font-semibold text-slate-500">Loading participating squads...</p>
              </div>
            ) : eventTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onInspect={() => navigate(`/team/${team.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No teams formed yet for this event</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Be the first to create a squad and invite peers to build with you.
                </p>
                <Link
                  to="/teams"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-action text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Start a Squad
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            VIEW B: Default Directory View (When nothing is clicked)
           ───────────────────────────────────────────────────────────── */
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 font-heading tracking-tight">
                Hackathons & Tech Events
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search events by name, location, or track..."
                className="w-full text-xs text-slate-800 placeholder:text-slate-400 pl-9 pr-3 py-2 rounded-lg border border-slate-200 outline-hidden focus:border-primary-action font-sans"
              />
            </div>

            {/* Scope Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
              <button
                onClick={() => {
                  setScopeFilter("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  scopeFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Events ({totalEvents})
              </button>

              <button
                onClick={() => {
                  setScopeFilter("global");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  scopeFilter === "global"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Global
              </button>

              <button
                onClick={() => {
                  setScopeFilter("org");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  scopeFilter === "org"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Campus Only
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary-action animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Loading hackathons & competitions...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Failed to load events</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          ) : events.length > 0 ? (
            /* Events Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSelect={(evt) => setSelectedEvent(evt)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No events matched your criteria</h4>
              <p className="text-xs text-slate-500">Try adjusting your search terms or scope filter.</p>
            </div>
          )}

          {/* Server-Side Pagination Footer */}
          {!loading && events.length > 0 && (
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <span>
                Page <strong className="text-slate-800">{currentPage}</strong> of {totalPages} (
                {totalEvents} total events)
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((pageNum, idx, arr) => (
                    <React.Fragment key={pageNum}>
                      {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                        <span className="px-1 text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? "border-primary-action bg-primary-action text-white font-bold"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

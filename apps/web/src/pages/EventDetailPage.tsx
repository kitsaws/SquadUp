import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Shield,
  Clock,
  ExternalLink,
  Plus,
  Loader2,
  AlertCircle,
  Share2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useUserContext } from "../contexts/UserContext";
import {
  eventsApi,
  recommendationsApi,
  EventItem,
  TeamItem,
} from "../services/api";
import { EventCardData } from "../components/EventCard";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { TeamTile } from "../components/TeamTile";
import { CategoryLegend } from "../components/CategoryLegend";
import { ViewModeToggle, ViewMode } from "../components/ViewModeToggle";
import { ScopeBadge } from "../components/Badges";
import { CreateTeamModal } from "../components/CreateTeamModal";

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

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSignedIn, profile } = useUserContext();

  const [event, setEvent] = useState<EventCardData | null>(null);
  const [eventTeams, setEventTeams] = useState<TeamCardData[]>([]);
  const [teamsViewMode, setTeamsViewMode] = useState<ViewMode>("cards");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState<boolean>(false);

  const isEligibleToCreateTeam = useMemo(() => {
    if (!event) return false;
    if (event.isGlobal) return true;
    const userUni = (profile?.university || "").toLowerCase().trim();
    const eventLoc = (event.location || "").toLowerCase().trim();
    return Boolean(userUni && eventLoc && userUni === eventLoc);
  }, [event, profile]);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    async function fetchEventDetails() {
      setLoading(true);
      setError(null);

      try {
        // Fetch event & participating teams in parallel
        const [eventData, teamsData] = await Promise.all([
          eventsApi.getEvent(id!),
          eventsApi.getEventTeams(id!),
        ]);

        if (!isMounted) return;

        const mappedEvent = mapEventToCardData(eventData);
        setEvent(mappedEvent);

        // Fetch user recommendations for this event if authenticated
        let recMap: Record<string, { score: number; category: any }> = {};
        if (isSignedIn) {
          try {
            const recRes = await recommendationsApi.getRecommendations({
              eventId: id!,
              topK: 25,
            });
            recRes.recommendations.forEach((r) => {
              recMap[r.teamId] = {
                score: r.taxonomyScore,
                category: r.recommendationCategory,
              };
            });
          } catch {
            // Recommendation failure fallback
          }
        }

        const mappedTeams: TeamCardData[] = (teamsData.teams || []).map((t: TeamItem) => {
          const memberList = (t.members || []).map((m: any) => ({
            id: m.id || m.userId,
            name: m.name || m.user?.name || "Member",
            role: m.role || "Member",
            avatarUrl: m.avatarUrl || m.profilePicture || m.user?.profilePicture || m.user?.avatarUrl,
            profilePicture: m.profilePicture || m.avatarUrl || m.user?.profilePicture || m.user?.avatarUrl,
          }));

          return {
            id: t.id,
            name: t.name,
            eventId: t.eventId || mappedEvent.id,
            eventTitle: mappedEvent.title,
            university: t.university || mappedEvent.location,
            isGlobal: mappedEvent.isGlobal,
            requirements: t.requirements || [],
            neededRequirement: t.requirements?.[0] || "Specialist",
            members: memberList,
            maxCapacity:
              t.maxCapacity ||
              (t.roles && t.roles.length > 0
                ? memberList.length + t.roles.reduce((acc: number, r: any) => acc + (r.spots ?? 0), 0)
                : t.requirements && t.requirements.length > 0
                ? Math.max(memberList.length, t.requirements.length)
                : Math.max(memberList.length, 4)),
            category: recMap[t.id]?.category || undefined,
            taxonomyScore: recMap[t.id]?.score || undefined,
            roles: t.roles,
            bestMatchingRole: t.bestMatchingRole,
          };
        });

        setEventTeams(mappedTeams);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[EventDetailPage] Error loading event:", err);
        setError(err.message || "Failed to load event details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchEventDetails();

    return () => {
      isMounted = false;
    };
  }, [id, isSignedIn]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setToastMessage("Event link copied to clipboard!");
    setTimeout(() => setToastMessage(null), 2500);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-action" />
          <p className="text-sm font-semibold text-text-muted">Loading hackathon briefing...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-surface rounded-2xl border border-border-main p-8 text-center space-y-4 max-w-md mx-auto shadow-xs">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-text-main font-heading">Event Not Found</h2>
          <p className="text-xs text-text-muted">{error || "This event could not be found or has concluded."}</p>
          <button
            onClick={() => navigate("/events")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-action text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface text-text-main border border-border-main px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-main transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Hero Header Card */}
      <div className="bg-surface rounded-3xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-4 flex-1">
            {/* Badges & Meta */}
            <div className="flex flex-wrap items-center gap-2">
              <ScopeBadge isGlobal={event.isGlobal} location={event.location} />
              <span className="text-xs font-medium text-text-muted bg-surface-dim border border-border-main px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 text-text-muted" /> {event.daysRemaining} Days Remaining
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-text-main font-heading tracking-tight">
              {event.title}
            </h1>

            {/* Date & Location */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-text-muted font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-text-muted" /> {event.dateStr}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-text-muted" /> {event.location}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
              {event.description}
            </p>

            {/* Track Tags */}
            {event.tracks && event.tracks.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Event Tracks & Focus Areas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {event.tracks.map((track, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-dim text-text-main border border-border-main shadow-2xs"
                    >
                      {track}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 lg:w-64 bg-surface-dim/60 p-4 rounded-2xl border border-border-main">
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => setIsCreateTeamOpen(true)}
                disabled={!isEligibleToCreateTeam}
                title={!isEligibleToCreateTeam ? `Restricted to students of ${event.location}` : undefined}
                className="w-full px-4 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Start a Squad
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/teams")}
                className="w-full px-4 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Sign In to Start Squad
              </button>
            )}

            <Link
              to={`/teams?eventId=${event.id}`}
              className="w-full px-4 py-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Find Teammates
            </Link>

            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Event Link
            </button>
          </div>
        </div>

        {/* Live Metrics Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-border-main">
          <div className="p-3.5 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
            <span className="text-xs text-text-muted block">Recruiting Squads</span>
            <span className="text-xl font-bold text-text-main font-heading">
              {eventTeams.length} Active
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
            <span className="text-xs text-text-muted block">Primary Track</span>
            <span className="text-xl font-bold text-text-main font-heading truncate block">
              {event.tracks?.[0] || "General Track"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
            <span className="text-xs text-text-muted block">Days to Kickoff</span>
            <span className="text-xl font-bold text-text-main font-heading">
              {event.daysRemaining} Days
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
            <span className="text-xs text-text-muted block">Access Scope</span>
            <span className="text-xl font-bold text-text-main font-heading">
              {event.isGlobal ? "Global Open" : "Campus Locked"}
            </span>
          </div>
        </div>
      </div>

      {/* Participating & Recruiting Teams in this Event */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-text-main font-heading">
              Recruiting Teams in {event.title}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Explore squads actively seeking teammates for this competition.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSignedIn && <CategoryLegend />}
            <ViewModeToggle
              mode={teamsViewMode}
              onChange={setTeamsViewMode}
              size="sm"
            />
          </div>
        </div>

        {eventTeams.length > 0 ? (
          teamsViewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onInspect={() =>
                    navigate(`/team/${team.id}`, {
                      state: { fromEventId: event.id, fromEventTitle: event.title },
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {eventTeams.map((team) => (
                <TeamTile
                  key={team.id}
                  team={team}
                  onInspect={() =>
                    navigate(`/team/${team.id}`, {
                      state: { fromEventId: event.id, fromEventTitle: event.title },
                    })
                  }
                />
              ))}
            </div>
          )
        ) : (
          <div className="bg-surface rounded-2xl border border-border-main p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-text-muted mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-text-main">No teams formed yet for this event</h4>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Be the first to create a squad and invite peers to build with you.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateTeamOpen(true)}
              disabled={!isEligibleToCreateTeam}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-action text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> Start a Squad
            </button>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {event && (
        <CreateTeamModal
          isOpen={isCreateTeamOpen}
          onClose={() => setIsCreateTeamOpen(false)}
          onSuccess={(newTeamId) => {
            navigate(`/team/${newTeamId}`);
          }}
          initialEventId={event.id}
          initialEvent={event}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/react";
import { ArrowRight, Sparkles, CheckCircle2, Shield, Users, Calendar, Loader2 } from "lucide-react";
import { CategoryLegend } from "../components/CategoryLegend";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { EventCard, EventCardData } from "../components/EventCard";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import {
  eventsApi,
  teamsApi,
  recommendationsApi,
  profileApi,
  applicationsApi,
  EventItem,
  TeamItem,
  UserProfileResponse,
} from "../services/api";

export function HomeDashboard() {
  const { user } = useUser();
  const [recommendedTeams, setRecommendedTeams] = useState<TeamCardData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventCardData[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTeamForApply, setSelectedTeamForApply] = useState<TeamCardData | null>(null);
  const [appliedTeamIds, setAppliedTeamIds] = useState<string[]>([]);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // 1. Fetch Events
        const eventsRes = await eventsApi.getEvents({ limit: 3, sort: "date_asc" }).catch(() => null);
        if (isMounted && eventsRes?.data) {
          const mappedEvents: EventCardData[] = eventsRes.data.map((evt: EventItem) => {
            const eventDate = new Date(evt.date);
            const daysRemaining = Math.max(
              0,
              Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            );
            return {
              id: evt.id,
              title: evt.title,
              organizerName:
                evt.organizerProfile?.name || evt.organizer?.name || "Campus Organizer",
              dateStr: eventDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              location: evt.location,
              isGlobal: evt.isGlobal,
              daysRemaining,
              description: evt.description,
              tracks: evt.tracks || [],
              teamsCount: evt.teamsCount || 0,
              participantsCount: evt.participantsCount || (evt.teamsCount ? evt.teamsCount * 3 : 0),
            };
          });
          setUpcomingEvents(mappedEvents);
        }

        // 2. Fetch User Profile & Squads
        const profileRes = await profileApi.getProfile().catch(() => null);
        if (isMounted && profileRes) {
          setUserProfile(profileRes);
        }

        // 3. Fetch Recommendations (or featured teams)
        let loadedTeams: TeamCardData[] = [];
        try {
          const recsRes = await recommendationsApi.getRecommendations({ topK: 3 });
          if (recsRes?.recommendations && recsRes.recommendations.length > 0) {
            loadedTeams = recsRes.recommendations.map((rec) => ({
              id: rec.teamId,
              name: rec.teamName,
              eventId: "",
              eventTitle: "Featured Event",
              university: rec.university,
              requirements: rec.requirements || [],
              neededRequirement: rec.requirements?.[0],
              taxonomyScore: rec.taxonomyScore,
              category: rec.recommendationCategory,
              description: rec.description,
              members: [],
              maxCapacity: 4,
            }));
          }
        } catch {
          // If recommendation engine has no resume, fallback to real teams
        }

        if (loadedTeams.length === 0) {
          const teamsRes = await teamsApi.getTeams({ limit: 3, sort: "created_at" }).catch(() => null);
          if (teamsRes?.data) {
            loadedTeams = teamsRes.data.map((t: TeamItem) => ({
              id: t.id,
              name: t.name,
              eventId: t.eventId,
              eventTitle: t.event?.title || "Upcoming Hackathon",
              university: t.university || t.event?.university || "Campus Squad",
              requirements: t.requirements || [],
              neededRequirement: t.requirements?.[0],
              description: t.description || "",
              members: t.members || [],
              maxCapacity: t.maxCapacity || 4,
            }));
          }
        }

        if (isMounted) {
          setRecommendedTeams(loadedTeams);
        }
      } catch (err) {
        console.error("[HomeDashboard] Error loading data:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplySubmit = async (teamId: string, message?: string) => {
    try {
      await applicationsApi.applyToTeam(teamId, message);
      setAppliedTeamIds((prev) => [...prev, teamId]);
      setNotificationToast("✓ Application submitted! Status set to PENDING review.");
    } catch (error: any) {
      setNotificationToast(error?.message || "Application submitted.");
      setAppliedTeamIds((prev) => [...prev, teamId]);
    }
    setTimeout(() => setNotificationToast(null), 4500);
  };

  const displayName = user?.firstName || userProfile?.name?.split(" ")[0] || "there";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Toast feedback */}
      {notificationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Hero Greeting Section */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-heading">
              Good morning, {displayName}.
            </h1>
            <p className="text-base text-slate-500 font-medium mt-1">
              Find your next squad.
            </p>
          </div>
        </div>
      </section>

      {/* Section 1: Recommended For You */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" /> Recommended for you
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Smart recommendations matched against your verified skills & campus affiliation.
            </p>
          </div>

          {/* Horizontal Match Legend */}
          <CategoryLegend />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-xl border border-slate-200 bg-slate-50 animate-pulse flex items-center justify-center text-slate-400"
              >
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ))}
          </div>
        ) : recommendedTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                hasApplied={appliedTeamIds.includes(team.id)}
                onInspect={() => setSelectedTeamForApply(team)}
                onApply={() => setSelectedTeamForApply(team)}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">No squads available right now.</p>
            <p className="text-xs text-slate-500">
              Check back soon or explore upcoming events to be the first to create a team.
            </p>
          </div>
        )}
      </section>

      {/* Section 2: Upcoming Events */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              Upcoming Events
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hackathons and university project fairs currently recruiting squads.
            </p>
          </div>

          <Link
            to="/events"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Explore All Events <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 rounded-xl border border-slate-200 bg-slate-50 animate-pulse flex items-center justify-center text-slate-400"
              >
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center">
            <p className="text-sm text-slate-600">No upcoming events listed at this time.</p>
          </div>
        )}
      </section>

      {/* Section 3: Your Squad */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">
            Your Squad
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {userProfile?.teams && userProfile.teams.length > 0
              ? `You're currently in ${userProfile.teams.length} ${
                  userProfile.teams.length === 1 ? "team" : "teams"
                }.`
              : "You are not currently part of any team roster."}
          </p>
        </div>

        {userProfile?.teams && userProfile.teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userProfile.teams.map((squad) => (
              <div
                key={squad.teamId}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 block">Active Team</span>
                    <h3 className="text-lg font-bold text-slate-900 font-heading mt-0.5">
                      {squad.teamName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Joined {new Date(squad.joinedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md shrink-0 border ${
                      squad.role === "Leader"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {squad.role === "Leader" ? "👑 Squad Leader" : squad.role}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Active Roster Member
                  </span>

                  <Link
                    to={squad.role === "Leader" ? "/applications" : `/teams/${squad.teamId}`}
                    className="font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    {squad.role === "Leader" ? "Manage Squad" : "View Team Dossier"}{" "}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center space-y-3">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">No active squad memberships yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Explore recommended teams above or browse events to apply for an open role in a squad.
              </p>
            </div>
            <Link
              to="/teams"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Browse Squads Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* Apply Team Modal */}
      {selectedTeamForApply && (
        <ApplyTeamModal
          isOpen={!!selectedTeamForApply}
          onClose={() => setSelectedTeamForApply(null)}
          team={selectedTeamForApply}
          onSubmit={(teamId) => handleApplySubmit(teamId)}
        />
      )}
    </div>
  );
}

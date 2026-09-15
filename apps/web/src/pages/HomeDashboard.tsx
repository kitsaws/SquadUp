import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, CheckCircle2, Shield } from "lucide-react";
import { CategoryLegend } from "../components/CategoryLegend";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { EventCard, EventCardData } from "../components/EventCard";
import { ApplyTeamModal } from "../components/ApplyTeamModal";

const DEMO_RECOMMENDED_TEAMS: TeamCardData[] = [
  {
    id: "t1",
    name: "AI Agents Guild",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "Stanford University",
    requirements: ["React", "FastAPI", "PostgreSQL"],
    neededRequirement: "PostgreSQL",
    taxonomyScore: 0.92,
    category: "BEST",
    description: "Autonomous task orchestrator with self-healing tools & local LLM reasoning.",
    members: [
      { id: "m1", name: "Jane Doe" },
      { id: "m2", name: "Marcus Chen" },
      { id: "m3", name: "Sofia Rodriguez" },
    ],
  },
  {
    id: "t2",
    name: "CloudScale Engine",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "UC Berkeley (Global Event Eligible)",
    requirements: ["Docker", "Python", "Kubernetes"],
    neededRequirement: "Kubernetes",
    taxonomyScore: 0.85,
    category: "GOOD_DIFFERENT_UNIVERSITY",
    description: "Distributed telemetry backend and edge cluster orchestrator for IoT fleets.",
    members: [
      { id: "m4", name: "Liam Vance" },
      { id: "m5", name: "Maya Lin" },
    ],
  },
  {
    id: "t3",
    name: "Campus Rover Robotics",
    eventId: "e3",
    eventTitle: "Stanford Robotics Fair",
    university: "Stanford University",
    requirements: ["C++", "ROS", "Python"],
    neededRequirement: "C++",
    taxonomyScore: 0.65,
    category: "SAME_UNIVERSITY_LOWER_SCORE",
    description: "Indoor delivery autonomous ground vehicle targeting campus dining corridors.",
    members: [
      { id: "m6", name: "Ethan Hunt" },
      { id: "m7", name: "Chloe Bennett" },
      { id: "m8", name: "Zack Taylor" },
    ],
    maxCapacity: 5,
  },
];

const DEMO_UPCOMING_EVENTS: EventCardData[] = [
  {
    id: "e1",
    title: "TreeHacks 2026",
    organizerName: "ACM Stanford",
    dateStr: "Oct 15 – 17, 2026",
    location: "Stanford, CA",
    isGlobal: true,
    daysRemaining: 30,
    description: "Stanford’s premier annual hackathon with tracks in Healthcare, AI Agents, and Sustainability.",
    tracks: ["Healthcare", "AI Agents", "Sustainability"],
    teamsCount: 12,
    participantsCount: 48,
  },
  {
    id: "e2",
    title: "CalHacks 12.0",
    organizerName: "Cal Hacks",
    dateStr: "Nov 02 – 04, 2026",
    location: "San Francisco, CA",
    isGlobal: true,
    daysRemaining: 48,
    description: "The world’s largest collegiate hackathon hosted at the San Francisco Metreon.",
    tracks: ["Web3 & Fintech", "Autonomous Systems"],
    teamsCount: 8,
    participantsCount: 32,
  },
  {
    id: "e3",
    title: "Stanford AI & MedTech Showcase",
    organizerName: "Bio-X Stanford",
    dateStr: "Dec 05, 2026",
    location: "Li Ka Shing Center, Stanford",
    isGlobal: false,
    daysRemaining: 80,
    description: "Interdisciplinary project fair matching CS students with medical researchers.",
    tracks: ["Clinical AI", "Biotech"],
    teamsCount: 5,
    participantsCount: 20,
  },
];

export function HomeDashboard() {
  const [selectedTeamForApply, setSelectedTeamForApply] = useState<TeamCardData | null>(null);
  const [appliedTeamIds, setAppliedTeamIds] = useState<string[]>([]);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const handleApplySubmit = (teamId: string) => {
    setAppliedTeamIds((prev) => [...prev, teamId]);
    setNotificationToast("✓ Application submitted! Status set to PENDING review.");
    setTimeout(() => setNotificationToast(null), 4000);
  };

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
              Good morning, Swastik.
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

        {/* 3 Team Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEMO_RECOMMENDED_TEAMS.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              hasApplied={appliedTeamIds.includes(team.id)}
              onInspect={() => setSelectedTeamForApply(team)}
              onApply={() => setSelectedTeamForApply(team)}
            />
          ))}
        </div>
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
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Explore All Events <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEMO_UPCOMING_EVENTS.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* Section 3: Your Squad */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">
            Your Squad
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            You're currently in 2 teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Squad 1 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 block">TreeHacks 2026</span>
                <h3 className="text-lg font-bold text-slate-900 font-heading mt-0.5">
                  NeuroVision Health
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time EEG telemetry and seizure classification app.
                </p>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                Team Leader
              </span>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Roster Finalized (4/4)
              </span>

              <Link
                to="/applications"
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                Manage Squad <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Squad 2 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 block">Stanford AgTech Fair</span>
                <h3 className="text-lg font-bold text-slate-900 font-heading mt-0.5">
                  Autonomous FarmBot
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Automated crop monitoring robotics for university test beds.
                </p>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                Full Stack Dev
              </span>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">
                3 of 4 members • 1 open spot
              </span>

              <Link
                to="/teams"
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                View Details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Apply Team Modal */}
      {selectedTeamForApply && (
        <ApplyTeamModal
          isOpen={!!selectedTeamForApply}
          onClose={() => setSelectedTeamForApply(null)}
          team={selectedTeamForApply}
          onSubmit={handleApplySubmit}
        />
      )}
    </div>
  );
}

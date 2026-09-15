import React, { useState } from "react";
import { Search, Calendar, MapPin, Users, ArrowLeft, ArrowRight, Shield, Sparkles, Plus } from "lucide-react";
import { EventCard, EventCardData } from "../components/EventCard";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { CategoryLegend } from "../components/CategoryLegend";
import { ScopeBadge } from "../components/Badges";

const DEMO_EVENTS_DIRECTORY: EventCardData[] = [
  {
    id: "e1",
    title: "TreeHacks 2026",
    organizerName: "ACM Stanford",
    dateStr: "Oct 15 – 17, 2026",
    location: "Stanford, CA (Arrillaga Center)",
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
  {
    id: "e4",
    title: "MIT Blueprint 2027",
    organizerName: "MIT TechX",
    dateStr: "Feb 20 – 22, 2027",
    location: "Cambridge, MA",
    isGlobal: true,
    daysRemaining: 120,
    description: "Undergraduate prototyping sprint focused on foundational infrastructure and hardware.",
    tracks: ["Systems", "Robotics", "Applied ML"],
    teamsCount: 15,
    participantsCount: 60,
  },
  {
    id: "e5",
    title: "HackSC 2027",
    organizerName: "HackSC Team",
    dateStr: "Mar 12 – 14, 2027",
    location: "Los Angeles, CA",
    isGlobal: true,
    daysRemaining: 142,
    description: "Southern California’s flagship collegiate hackathon promoting human-centric technology.",
    tracks: ["Creative Tech", "Social Impact"],
    teamsCount: 7,
    participantsCount: 28,
  },
  {
    id: "e6",
    title: "Stanford Hardware & Robotics Fair",
    organizerName: "Stanford Robotics Club",
    dateStr: "Jan 14, 2027",
    location: "Stanford Robotics Lab",
    isGlobal: false,
    daysRemaining: 90,
    description: "Showcase pairing embedded engineers with active autonomous robotics labs.",
    tracks: ["ROS2", "Firmware", "Computer Vision"],
    teamsCount: 4,
    participantsCount: 16,
  },
];

const DEMO_EVENT_TEAMS: TeamCardData[] = [
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
    members: [{ id: "m1", name: "Jane Doe" }, { id: "m2", name: "Marcus Chen" }, { id: "m3", name: "Sofia Rodriguez" }],
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
    members: [{ id: "m4", name: "Liam Vance" }, { id: "m5", name: "Maya Lin" }],
  },
  {
    id: "t4",
    name: "BioSync Health",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "Stanford University",
    requirements: ["PyTorch", "React Native", "FHIR"],
    neededRequirement: "FHIR",
    taxonomyScore: 0.88,
    category: "BEST",
    description: "Real-time biometric analytics platform for clinical trial cohort telemetry.",
    members: [{ id: "m9", name: "David Kim" }, { id: "m10", name: "Aria Stark" }, { id: "m11", name: "Kevin Patel" }],
  },
  {
    id: "t5",
    name: "Quantum Ledger",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "Stanford University",
    requirements: ["Rust", "Solidity", "TypeScript"],
    neededRequirement: "TypeScript",
    taxonomyScore: 0.68,
    category: "SAME_UNIVERSITY_LOWER_SCORE",
    description: "Post-quantum cryptographic verification layer for distributed consensus.",
    members: [{ id: "m12", name: "Alex Rover" }, { id: "m13", name: "Samira Khan" }],
  },
];

export function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventCardData | null>(null);
  const [scopeFilter, setScopeFilter] = useState<"all" | "global" | "campus">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = DEMO_EVENTS_DIRECTORY.filter((e) => {
    if (scopeFilter === "global" && !e.isGlobal) return false;
    if (scopeFilter === "campus" && e.isGlobal) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.organizerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    Hosted by {selectedEvent.organizerName}
                  </span>
                  <ScopeBadge isGlobal={selectedEvent.isGlobal} location={selectedEvent.location} />
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    30 Days Remaining
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
                <button className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer">
                  + Create a Team for {selectedEvent.title}
                </button>
                <button className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer">
                  Share Event
                </button>
              </div>
            </div>

            {/* Live Metrics Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-500 block">Recruiting Squads</span>
                <span className="text-xl font-bold text-slate-900 font-heading">
                  {selectedEvent.teamsCount} Teams Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-500 block">Participants</span>
                <span className="text-xl font-bold text-slate-900 font-heading">
                  {selectedEvent.participantsCount} Confirmed
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-500 block">Roster Lock</span>
                <span className="text-xl font-bold text-slate-900 font-heading">
                  In 30 Days
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-500 block">Prize Pool</span>
                <span className="text-xl font-bold text-slate-900 font-heading">
                  $150,000+
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
                  Explore squads looking for specific technical roles for this hackathon.
                </p>
              </div>

              <CategoryLegend />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DEMO_EVENT_TEAMS.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
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

            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors self-start md:self-auto cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Host an Event
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by name, university, or tech track..."
                className="w-full text-xs text-slate-800 placeholder:text-slate-400 pl-9 pr-3 py-2 rounded-lg border border-slate-200 outline-hidden focus:border-blue-600 font-sans"
              />
            </div>

            {/* Scope Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setScopeFilter("all")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  scopeFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Events ({DEMO_EVENTS_DIRECTORY.length})
              </button>

              <button
                onClick={() => setScopeFilter("global")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  scopeFilter === "global"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Global
              </button>

              <button
                onClick={() => setScopeFilter("campus")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  scopeFilter === "campus"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stanford Only
              </button>
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={(evt) => setSelectedEvent(evt)}
              />
            ))}
          </div>

          {/* Server-Side Pagination Footer */}
          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">1 to {filteredEvents.length}</strong> of {filteredEvents.length} events
            </span>

            <div className="flex items-center gap-1">
              <button disabled className="px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed">
                Previous
              </button>
              <button className="px-3 py-1.5 rounded-md border border-blue-600 bg-blue-600 text-white font-bold">
                1
              </button>
              <button className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                2
              </button>
              <button className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

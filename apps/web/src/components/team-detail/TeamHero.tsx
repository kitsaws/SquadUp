import React from "react";
import { Users, Clock, CheckCircle2 } from "lucide-react";
import { TeamItem } from "../../services/api";

interface TeamHeroProps {
  team: TeamItem;
  isUserLeader: boolean;
  totalSpots: number;
  pendingApplicationsCount: number;
  totalApplicationsCount: number;
}

export function TeamHero({
  team,
  isUserLeader,
  totalSpots,
  pendingApplicationsCount,
  totalApplicationsCount,
}: TeamHeroProps) {
  const remainingSpots = totalSpots - team.members.length;

  return (
    <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-light text-primary-action border border-primary-border">
              {isUserLeader ? "Squad Leader Dashboard" : "Squad Dashboard"}
            </span>
            <span className="text-xs text-text-muted">• {team.event?.title || "Upcoming Event"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight font-heading">
            {team.name}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl">
            {team.description || `Formed for ${team.event?.title || "hackathon"}. Recruiting verified candidates.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Active Formation
          </span>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-main">
        <div className="p-4 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
          <div className="flex items-center justify-between text-xs text-text-muted font-semibold mb-1">
            <span>Squad Roster</span>
            <Users className="w-4 h-4 text-primary-action" />
          </div>
          <div className="text-xl font-black text-text-main font-heading">
            {team.members.length} / {totalSpots} Spots
          </div>
          <p className="text-[11px] text-text-muted font-medium mt-1">
            {remainingSpots > 0
              ? `${remainingSpots} spot(s) remaining for recruitment`
              : "Roster complete"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-dim border border-border-main shadow-2xs">
          <div className="flex items-center justify-between text-xs text-text-muted font-semibold mb-1">
            <span>Candidate Applications</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-text-main font-heading">
            {pendingApplicationsCount} Pending
          </div>
          <p className="text-[11px] text-text-muted font-medium mt-1">
            {totalApplicationsCount} total candidate submissions
          </p>
        </div>
      </div>
    </div>
  );
}

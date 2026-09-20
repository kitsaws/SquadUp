import React from "react";
import { Link } from "react-router-dom";
import { Users, Crown, Clock, ArrowRight } from "lucide-react";
import { CandidateApplicationItem, UserProfileResponse } from "../../services/api";

interface ProfileSquadsProps {
  userTeams: any[];
  myApplications: CandidateApplicationItem[];
  isOwner: boolean;
  isCandidateView: boolean;
  ctxProfile: UserProfileResponse | null;
}

export function ProfileSquads({
  userTeams,
  myApplications,
  isOwner,
  isCandidateView,
  ctxProfile,
}: ProfileSquadsProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-7 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-text-main font-heading flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-action" /> {isCandidateView ? "Active Squads" : "My Squads"}
          </h2>
          <p className="text-xs text-text-muted">
            {isCandidateView
              ? "Teams this candidate is currently participating in or leading."
              : "Teams you are participating in or have applied to join."}
          </p>
        </div>

        <Link
          to="/teams"
          className="text-xs font-bold text-primary-action hover:underline inline-flex items-center gap-1"
        >
          Explore More Squads <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Squads Container */}
      <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
        {/* 1. Confirmed Memberships */}
        {userTeams.map((squad) => {
          const isViewerLeader = isOwner
            ? squad.role === "Leader"
            : Boolean(ctxProfile?.teams?.some((t: any) => t.teamId === squad.teamId && t.role === "Leader"));

          return (
            <div
              key={squad.teamId}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                squad.role === "Leader"
                  ? "bg-primary-light/30 border-primary-border hover:border-primary-action/40"
                  : "bg-surface-dim border-border-main hover:border-primary-action/40 shadow-2xs"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {squad.role === "Leader" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary-action flex items-center gap-1">
                        <Crown className="w-3 h-3 text-primary-action" /> Squad Leader
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border-main">
                        Member
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-text-main font-heading">
                    {squad.teamName}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Joined {squad.joinedAt ? new Date(squad.joinedAt).toLocaleDateString() : "Recently"}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-text-main block">
                    Role: {squad.role}
                  </span>
                </div>
              </div>

              {/* Action Link */}
              <div className="flex items-center justify-between pt-2 border-t border-border-main text-xs">
                <span className="text-text-muted font-medium">
                  Status: <strong className="text-text-main">Active Member</strong>
                </span>

                <Link
                  to={`/team/${squad.teamId}`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-colors shadow-2xs cursor-pointer ${
                    isViewerLeader
                      ? "text-white bg-primary-action hover:bg-primary-hover"
                      : "text-text-main bg-surface hover:bg-surface-dim border border-border-main"
                  }`}
                >
                  <span>{isViewerLeader ? "Manage Team" : "View Team"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}

        {/* 2. Submitted Applications */}
        {!isCandidateView &&
          myApplications.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex flex-col justify-between gap-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" /> Application Pending
                    </span>
                    <span className="text-[11px] font-medium text-text-muted">• {app.eventTitle}</span>
                  </div>
                  <h3 className="text-base font-bold text-text-main font-heading">
                    {app.teamName}
                  </h3>
                  {app.message && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1 italic">
                      "{app.message}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs">
                <span className="text-amber-600 font-medium">Under review by squad leader</span>
                <Link
                  to={`/team/${app.teamId}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-amber-600 bg-surface hover:bg-surface-dim border border-amber-500/20 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>View Squad</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

        {userTeams.length === 0 && myApplications.length === 0 && (
          <div className="p-6 rounded-xl border border-dashed border-border-main text-center space-y-2">
            <Users className="w-8 h-8 text-text-muted mx-auto opacity-50" />
            <p className="text-xs font-semibold text-text-muted">No active squads or pending applications</p>
            <p className="text-[11px] text-text-muted">Join an existing squad for an upcoming hackathon or recruit teammates.</p>
            <Link
              to="/teams"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary-action hover:underline pt-1"
            >
              Find Squads to Join →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

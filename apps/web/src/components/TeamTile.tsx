import React from "react";
import { Users, ArrowRight, Check, Sparkles } from "lucide-react";
import { RecommendationBadge, SkillTag } from "./Badges";
import { TeamCardData } from "./TeamCard";
import { useUserContext } from "../contexts/UserContext";

interface TeamTileProps {
  team: TeamCardData;
  onInspect?: (team: TeamCardData) => void;
  isSelected?: boolean;
  onApply?: (team: TeamCardData) => void;
  hasApplied?: boolean;
}

export function TeamTile({
  team,
  onInspect,
  isSelected = false,
  onApply,
  hasApplied = false,
}: TeamTileProps) {
  const { isSignedIn, userVerifiedSkills, userUniversity } = useUserContext();
  const maxCapacity = team.maxCapacity || 4;
  const currentCount = team.members.length;
  const isFull = currentCount >= maxCapacity;

  const isCampusRestricted = Boolean(
    team.isGlobal === false &&
    (!userUniversity || !team.university || userUniversity.toLowerCase().trim() !== team.university.toLowerCase().trim())
  );

  // Accent colors based on recommendation tier
  let accentBorder = "border-border-main";
  let leftAccentColor = "";

  if (isSignedIn && team.category === "BEST") {
    leftAccentColor = "bg-best-fit";
    accentBorder = "hover:border-best-fit";
  } else if (isSignedIn && team.category === "GOOD_DIFFERENT_UNIVERSITY") {
    leftAccentColor = "bg-cross-campus";
    accentBorder = "hover:border-cross-campus";
  } else if (isSignedIn && team.category === "SAME_UNIVERSITY_LOWER_SCORE") {
    leftAccentColor = "bg-campus-explorer";
    accentBorder = "hover:border-campus-explorer";
  }

  return (
    <div
      onClick={() => onInspect?.(team)}
      className={`group relative rounded-xl border bg-surface p-4 sm:p-5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
        isFull
          ? "opacity-60 bg-surface-dim/70 border-border-main"
          : isSelected
          ? "ring-2 ring-primary-action/20 border-primary-action shadow-md"
          : `shadow-2xs hover:shadow-md ${accentBorder}`
      }`}
    >
      {/* Left Highlight Strip for Recommendation */}
      {isSignedIn && team.category && !isFull && leftAccentColor && (
        <div className={`absolute top-0 bottom-0 left-0 w-1 ${leftAccentColor}`} />
      )}

      {/* Main Info: Name, Event, University, Tier */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1 pl-1">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="text-base font-bold text-text-main group-hover:text-primary-action transition-colors font-heading truncate max-w-[280px]"
              title={team.name}
            >
              {team.name}
            </h3>

            {isSignedIn && team.category && !isFull && (
              <RecommendationBadge category={team.category} score={team.taxonomyScore} />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
            <span className="font-semibold text-primary-action truncate max-w-[180px]">
              {team.eventTitle}
            </span>
            {team.university && (
              <>
                <span>•</span>
                <span className="truncate max-w-[200px]" title={team.university}>
                  {team.university}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 py-1 lg:py-0">
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-2xs shrink-0">
          <span>Requirements:</span>
        </div>

        {team.requirements.slice(0, 3).map((req, idx) => (
          <SkillTag
            key={idx}
            skill={req}
            breakdown={team.requirementBreakdown}
            userSkills={isSignedIn ? userVerifiedSkills : undefined}
          />
        ))}

        {team.requirements.length > 3 && (
          <span className="text-[10px] text-text-muted font-semibold">
            +{team.requirements.length - 3}
          </span>
        )}
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-main/60">
        {/* Capacity / Spots Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
          <Users className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span>
            <strong className="text-text-main">{currentCount}</strong> / {maxCapacity} spots
          </span>
          {isFull ? (
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded">
              Full
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">
              {maxCapacity - currentCount} open
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onApply && !team.isUserLeader && !team.isUserMember && (
            isCampusRestricted ? (
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-dim text-text-muted border border-border-main"
                title="This squad belongs to an institution-restricted event for another university."
              >
                Campus Locked
              </span>
            ) : (
              <button
                type="button"
                disabled={isFull || hasApplied}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isFull && !hasApplied) {
                    onApply(team);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                  hasApplied
                    ? "bg-surface-dim text-emerald-600 border border-emerald-500/30"
                    : isFull
                    ? "bg-surface-dim text-text-muted cursor-not-allowed opacity-50"
                    : "bg-primary-action text-white hover:bg-primary-hover"
                }`}
              >
                {hasApplied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Applied</span>
                  </>
                ) : isFull ? (
                  <span>Full</span>
                ) : (
                  <span>Apply</span>
                )}
              </button>
            )
          )}

          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-dim text-text-main hover:bg-primary-light hover:text-primary-action transition-all cursor-pointer border border-border-main shadow-2xs"
          >
            <span>Inspect</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

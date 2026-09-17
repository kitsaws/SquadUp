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
  const currentCount = Math.max(1, (team.members || []).length);
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

  // Derive roles list: use configured roles if present, else fallback
  const rolesList =
    team.roles && team.roles.length > 0
      ? team.roles
      : team.requirements.length > 0
      ? team.requirements.map((req) => ({ title: req, skills: [req] }))
      : [{ title: "Core Specialist", skills: [] }];

  const getRoleMatchStatus = (role: { title: string; skills?: string[] }): "perfect" | "partial" | "none" => {
    if (!isSignedIn || !userVerifiedSkills || userVerifiedSkills.length === 0) return "none";

    // 1. Check if bestMatchingRole matches this role
    if (team.bestMatchingRole && team.bestMatchingRole.roleTitle.toLowerCase().trim() === role.title.toLowerCase().trim()) {
      if (team.bestMatchingRole.score >= 0.85) return "perfect";
      if (team.bestMatchingRole.score >= 0.40) return "partial";
    }

    const skills = role.skills || [];
    if (skills.length === 0) return "none";

    let matchedCount = 0;
    for (const skill of skills) {
      const sLower = skill.toLowerCase().trim();
      const direct = userVerifiedSkills.some((us) => {
        const uLower = us.toLowerCase().trim();
        return (
          uLower === sLower ||
          sLower.includes(uLower) ||
          uLower.includes(sLower) ||
          (sLower.includes("react") && uLower.includes("react")) ||
          (sLower.includes("frontend") && uLower.includes("frontend")) ||
          (sLower.includes("backend") && uLower.includes("backend")) ||
          (sLower.includes("python") && uLower.includes("python")) ||
          (sLower.includes("javascript") && uLower.includes("javascript")) ||
          (sLower.includes("typescript") && uLower.includes("typescript")) ||
          (sLower.includes("design") && uLower.includes("design")) ||
          (sLower.includes("css") && uLower.includes("css")) ||
          (sLower.includes("node") && uLower.includes("node"))
        );
      });
      if (direct) {
        matchedCount++;
        continue;
      }
      if (team.requirementBreakdown) {
        const rb = team.requirementBreakdown.find((b) => {
          const bName = (b.requirementName || "").toLowerCase().trim();
          return bName === sLower || bName.includes(sLower) || sLower.includes(bName);
        });
        if (rb && (rb.score >= 0.7 || rb.isStrong)) {
          matchedCount++;
        }
      }
    }

    if (matchedCount === skills.length && matchedCount > 0) return "perfect";
    if (matchedCount > 0) return "partial";
    return "none";
  };

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
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-surface-dim text-text-muted border border-border-main shadow-2xs shrink-0">
          <span>Roles:</span>
        </div>

        {rolesList.slice(0, 3).map((role, idx) => {
          const matchStatus = getRoleMatchStatus(role);
          return (
            <span
              key={idx}
              className={`text-xs font-semibold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                matchStatus === "perfect"
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : matchStatus === "partial"
                  ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                  : "bg-surface-dim text-text-muted border-border-main"
              }`}
            >
              {matchStatus === "perfect" && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
              <span className="truncate max-w-[120px]">{role.title}</span>
            </span>
          );
        })}

        {rolesList.length > 3 && (
          <span className="text-[10px] text-text-muted font-semibold">
            +{rolesList.length - 3}
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
          {team.isUserLeader ? (
            <span className="text-[11px] font-bold text-primary-action bg-primary-light px-2.5 py-1 rounded-md border border-primary-border">
              Leader
            </span>
          ) : team.isUserMember ? (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              Member
            </span>
          ) : hasApplied ? (
            <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              Pending
            </span>
          ) : onApply && (
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
                disabled={isFull}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isFull) {
                    onApply(team);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                  isFull
                    ? "bg-surface-dim text-text-muted cursor-not-allowed opacity-50"
                    : "bg-primary-action text-white hover:bg-primary-hover"
                }`}
              >
                {isFull ? <span>Full</span> : <span>Apply</span>}
              </button>
            )
          )}

          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-dim text-text-main hover:bg-primary-light hover:text-primary-action transition-all cursor-pointer border border-border-main shadow-2xs"
          >
            <span>Inspect</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

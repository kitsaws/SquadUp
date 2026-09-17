import React from "react";
import { Users, ArrowRight, Check } from "lucide-react";
import { RecommendationBadge, RecommendationTier, SkillTag } from "./Badges";
import { useUserContext } from "../contexts/UserContext";

export interface TeamMemberPreview {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface TeamCardData {
  id: string;
  name: string;
  eventId: string;
  eventTitle: string;
  university?: string;
  requirements: string[];
  neededRequirement?: string;
  members: TeamMemberPreview[];
  maxCapacity?: number;
  taxonomyScore?: number;
  category?: RecommendationTier;
  isEligible?: boolean;
  description?: string;
  isUserLeader?: boolean;
  isUserMember?: boolean;
}

interface TeamCardProps {
  team: TeamCardData;
  onInspect?: (team: TeamCardData) => void;
  isSelected?: boolean;
  onApply?: (team: TeamCardData) => void;
  hasApplied?: boolean;
}

export function TeamCard({
  team,
  onInspect,
  isSelected = false,
  onApply,
  hasApplied = false,
}: TeamCardProps) {
  const { isSignedIn, userVerifiedSkills } = useUserContext();
  const maxCapacity = team.maxCapacity || 4;
  const currentCount = team.members.length;
  const isFull = currentCount >= maxCapacity;

  const [isHovered, setIsHovered] = React.useState(false);

  // Accent color for category (only active when signed in)
  let accentColor = "var(--sq-border, #e2e8f0)";
  let topHighlightClass = "bg-border-main";

  if (isSignedIn && team.category === "BEST") {
    accentColor = "var(--sq-best-fit, #68DBA9)";
    topHighlightClass = "bg-best-fit";
  } else if (isSignedIn && team.category === "GOOD_DIFFERENT_UNIVERSITY") {
    accentColor = "var(--sq-cross-campus, #6366F1)";
    topHighlightClass = "bg-cross-campus";
  } else if (isSignedIn && team.category === "SAME_UNIVERSITY_LOWER_SCORE") {
    accentColor = "var(--sq-campus-explorer, #ffc761)";
    topHighlightClass = "bg-campus-explorer";
  }

  return (
    <div
      onClick={() => onInspect?.(team)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`rounded-xl border-2 p-5 sm:p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden group h-full w-full min-w-[320px] max-w-[420px] ${
        isFull
          ? "opacity-60 bg-surface-dim/70 border-border-main"
          : isSelected
          ? "bg-surface ring-2 ring-primary-action/20 shadow-md"
          : "bg-surface shadow-xs hover:shadow-md"
      }`}
      style={{
        borderColor: isFull
          ? "var(--sq-border, #e2e8f0)"
          : isSelected || isHovered
          ? accentColor
          : "var(--sq-border, #e2e8f0)",
      }}
    >
      {/* Top Content: header, name, description */}
      <div className="flex flex-col">
        {/* Top Highlight indicator (only when logged in and tier is active) */}
        {isSignedIn && team.category && !isFull && (
          <div className={`absolute top-0 left-0 right-0 h-1 z-10 ${topHighlightClass}`} />
        )}

        {/* Top Meta Bar */}
        <div className="flex items-start justify-between gap-2 mb-1.5 pt-0.5">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-primary-action truncate block">
              {team.eventTitle}
            </span>
            <h3
              className="text-base sm:text-lg font-bold text-text-main font-heading leading-tight mt-0.5 truncate"
              title={team.name}
            >
              {team.name}
            </h3>
          </div>

          {isSignedIn && team.category && !isFull && (
            <RecommendationBadge category={team.category} score={team.taxonomyScore} />
          )}
        </div>

        {/* University context */}
        <div className="text-xs text-text-muted mb-2 truncate h-4">
          {team.university || ""}
        </div>

        {/* Description snippet */}
        <p
          className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-2"
          title={team.description}
        >
          {team.description || ""}
        </p>
      </div>

      {/* Stack Requirements Pills: mt-auto anchors to bottom and expands upward */}
      <div className="mt-auto pt-3 mb-4">
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Needs/Requirements:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {team.requirements.map((req, i) => {
            const isMet =
              isSignedIn &&
              userVerifiedSkills.some(
                (s) => s.trim().toLowerCase() === req.trim().toLowerCase()
              );
            return (
              <SkillTag
                key={i}
                skill={req}
                isMatched={isMet}
              />
            );
          })}
        </div>
      </div>

      {/* Footer Capacity & Actions */}
      <div className="pt-3.5 border-t border-border-main flex items-center justify-between">
        {/* Member Avatars & Spots */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {team.members.map((m, idx) => (
              <div
                key={m.id || idx}
                className="w-7 h-7 rounded-full bg-surface-dim border-2 border-surface flex items-center justify-center text-[10px] font-bold text-text-main overflow-hidden shadow-2xs"
                title={m.name}
              >
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  m.name[0]
                )}
              </div>
            ))}
            {!isFull && (
              <div className="w-7 h-7 rounded-full bg-surface border-2 border-dashed border-border-main flex items-center justify-center text-[10px] text-text-muted">
                +1
              </div>
            )}
          </div>

          <span className="text-xs text-text-muted font-medium">
            <strong className="text-text-main">{currentCount}</strong>/{maxCapacity} spots
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasApplied ? (
            <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              Pending
            </span>
          ) : isFull ? (
            <span className="text-xs font-semibold text-text-muted bg-surface-dim/80 px-2.5 py-1 rounded-md border border-border-main">
              Squad Full
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInspect ? onInspect(team) : onApply?.(team);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary-action hover:text-primary-hover transition-colors cursor-pointer"
            >
              View Team <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Users, ArrowRight, Check } from "lucide-react";
import { RecommendationBadge, RecommendationTier, SkillTag } from "./Badges";

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
  const maxCapacity = team.maxCapacity || 4;
  const currentCount = team.members.length;
  const isFull = currentCount >= maxCapacity;

  const [isHovered, setIsHovered] = React.useState(false);

  // Verified user competencies for requirement matching
  const userVerifiedSkills = ["PostgreSQL", "React", "Python", "TypeScript", "FastAPI", "Docker"];

  // Accent color for category
  let accentColor = "#94a3b8";
  let topHighlightColor = "#cbd5e1";

  if (team.category === "BEST") {
    accentColor = "#68DBA9";
    topHighlightColor = "var(--sq-best-fit, #68DBA9)";
  } else if (team.category === "GOOD_DIFFERENT_UNIVERSITY") {
    accentColor = "#6366F1";
    topHighlightColor = "var(--sq-cross-campus, #6366F1)";
  } else if (team.category === "SAME_UNIVERSITY_LOWER_SCORE") {
    accentColor = "#ffc761";
    topHighlightColor = "var(--sq-campus-explorer, #ffc761)";
  }

  return (
    <div
      onClick={() => onInspect?.(team)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-white rounded-xl border-2 p-5 sm:p-6 transition-[border-color,box-shadow] duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md relative overflow-hidden group h-full w-full min-w-[320px] max-w-[420px] ${
        isSelected
          ? "ring-2 ring-blue-500/20 shadow-md"
          : "hover:shadow-md"
      }`}
      style={{
        borderColor: isSelected ? accentColor : isHovered ? accentColor : "#e2e8f0",
      }}
    >
      {/* Top Content: flex-1 ensures uniform expansion */}
      <div className="flex-1 flex flex-col">
        {/* Subtle top indicator */}
        <div
          className="absolute top-0 left-0 right-0 h-1 z-10"
          style={{ backgroundColor: topHighlightColor }}
        />

        {/* Top Meta Bar */}
        <div className="flex items-start justify-between gap-2 mb-1.5 pt-0.5">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-blue-600 truncate block">
              {team.eventTitle}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading leading-tight mt-0.5 truncate" title={team.name}>
              {team.name}
            </h3>
          </div>

          {team.category && (
            <RecommendationBadge category={team.category} score={team.taxonomyScore} />
          )}
        </div>

        {/* University context */}
        <div className="text-xs text-slate-500 mb-2 truncate h-4">
          {team.university || ""}
        </div>

        {/* Description snippet - fixed height 2 lines for uniform card sizes */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3 h-9" title={team.description}>
          {team.description || ""}
        </p>

        {/* Stack Requirements Pills */}
        <div className="mb-4 flex-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Needs/Requirements:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {team.requirements.map((req, i) => {
              const isMet = userVerifiedSkills.includes(req);
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
      </div>

      {/* Footer Capacity & Actions */}
      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between mt-auto">
        {/* Member Avatars & Spots */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {team.members.map((m, idx) => (
              <div
                key={m.id || idx}
                className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-700 overflow-hidden shadow-2xs"
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
              <div className="w-7 h-7 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                +1
              </div>
            )}
          </div>

          <span className="text-xs text-slate-500 font-medium">
            <strong className="text-slate-800">{currentCount}</strong>/{maxCapacity} spots
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasApplied ? (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              Pending
            </span>
          ) : isFull ? (
            <span className="text-xs font-medium text-slate-400">Squad Full</span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInspect ? onInspect(team) : onApply?.(team);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Inspect Fit <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

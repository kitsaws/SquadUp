import React from "react";
import { Users, ArrowRight, Check } from "lucide-react";
import { RecommendationBadge, RecommendationTier, SkillTag } from "./Badges";
import { useUserContext } from "../contexts/UserContext";
import { TeamRoleItem, BestMatchingRoleItem } from "../services/api";

export interface TeamMemberPreview {
  id: string;
  name: string;
  avatarUrl?: string;
  profilePicture?: string;
  role?: string;
}

export interface TeamCardData {
  id: string;
  name: string;
  eventId: string;
  eventTitle: string;
  university?: string;
  requirements: string[];
  requirementBreakdown?: Array<{
    requirementNodeId?: string;
    requirementName: string;
    requirementDepth?: number;
    bestUserSkillId?: string | null;
    bestUserSkillName?: string | null;
    bestUserSkillDepth?: number;
    lcaNodeId?: string | null;
    lcaNodeName?: string | null;
    lcaDepth?: number;
    graphDistance?: number;
    matchType?: "exact" | "ancestor" | "descendant" | "sibling" | "subdomain" | "domain" | "unmet";
    score: number;
    explanationText?: string;
    isStrong?: boolean;
  }>;
  roles?: TeamRoleItem[];
  bestMatchingRole?: BestMatchingRoleItem;
  neededRequirement?: string;
  members: TeamMemberPreview[];
  maxCapacity?: number;
  taxonomyScore?: number;
  category?: RecommendationTier;
  isEligible?: boolean;
  isGlobal?: boolean;
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

const AVATAR_VIBRANT_STYLES = [
  "bg-indigo-600 text-white",
  "bg-cyan-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-fuchsia-600 text-white",
  "bg-violet-600 text-white",
  "bg-teal-600 text-white",
];

function getAvatarVibrantStyle(name: string, idx: number): string {
  let hash = idx;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return AVATAR_VIBRANT_STYLES[Math.abs(hash) % AVATAR_VIBRANT_STYLES.length];
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
  const membersList =
    team.members && team.members.length > 0
      ? team.members
      : [{ id: "leader", name: team.university ? `${team.university} Lead` : "Squad Lead", role: "Leader" }];
  const currentCount = Math.max(1, (team.members || []).length);
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

  // Derive vacant/open roles list: filter out roles that are already assigned
  const openRoles =
    team.roles && team.roles.length > 0
      ? team.roles.filter((r) => !r.assignedToId && (r.spots ?? 1) > 0)
      : [];
  const rolesList =
    openRoles.length > 0
      ? openRoles
      : team.roles && team.roles.length > 0
      ? []
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
          (sLower.includes("css") && uLower.includes("css"))
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

      {/* Open Roles Section */}
      <div className="mt-auto pt-3 mb-4">
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Roles Needed:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rolesList.length > 0 ? (
            rolesList.map((role, i) => {
              const matchStatus = getRoleMatchStatus(role);
              return (
                <span
                  key={i}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                    matchStatus === "perfect"
                      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shadow-2xs"
                      : matchStatus === "partial"
                      ? "bg-amber-500/15 text-amber-600 border-amber-500/30 shadow-2xs"
                      : "bg-surface-dim text-text-muted border-border-main"
                  }`}
                >
                  {matchStatus === "perfect" && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                  <span>{role.title}</span>
                </span>
              );
            })
          ) : (
            <span className="text-xs text-text-muted italic bg-surface-dim px-2.5 py-1 rounded-lg border border-border-main">
              All roles filled
            </span>
          )}
        </div>
      </div>

      {/* Footer Capacity & Actions */}
      <div className="pt-3.5 border-t border-border-main flex items-center justify-between">
        {/* Member Avatars & Spots */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {membersList.map((m, idx) => {
              const picture = m.profilePicture || m.avatarUrl;
              const initials =
                (m.name || "Member")
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "M";
              const vibrantStyle = getAvatarVibrantStyle(m.name || "", idx);

              return (
                <div
                  key={m.id || idx}
                  className={`w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-black overflow-hidden shadow-2xs shrink-0 ${
                    picture ? "bg-surface-dim" : vibrantStyle
                  }`}
                  title={m.name}
                >
                  {picture ? (
                    <img
                      src={picture}
                      alt={m.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="tracking-tighter">{initials}</span>
                  )}
                </div>
              );
            })}
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

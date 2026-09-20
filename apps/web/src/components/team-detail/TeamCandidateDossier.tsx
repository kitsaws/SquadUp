import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Sparkles,
  Lock,
  Layers,
  CheckCircle2,
  ArrowRight,
  User,
} from "lucide-react";
import { TeamItem, TeamRoleItem, TeamMember, RecommendationItem, TeamInviteItem } from "../../services/api";
import { RecommendationBadge, RecommendationTier, SkillTag } from "../Badges";

interface TeamCandidateDossierProps {
  team: TeamItem;
  isSignedIn: boolean;
  category?: RecommendationTier;
  taxonomyScore?: number;
  totalSpots: number;
  isRestrictedEvent: boolean;
  pendingInvite?: TeamInviteItem | null;
  isUserMember: boolean;
  activeBestMatchingRole?: { roleId?: string; roleTitle?: string; score?: number } | null;
  checkSkillMatch: (skill: string) => boolean;
  userVerifiedSkills: string[];
  recommendation?: RecommendationItem | null;
  onOpenInviteModal: () => void;
}

export function TeamCandidateDossier({
  team,
  isSignedIn,
  category,
  taxonomyScore,
  totalSpots,
  isRestrictedEvent,
  pendingInvite,
  isUserMember,
  activeBestMatchingRole,
  checkSkillMatch,
  userVerifiedSkills,
  recommendation,
  onOpenInviteModal,
}: TeamCandidateDossierProps) {
  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {isSignedIn && category ? (
                <RecommendationBadge category={category} score={taxonomyScore} />
              ) : (
                <span className="text-xs font-semibold text-text-muted bg-surface-dim border border-border-main px-2.5 py-0.5 rounded-full">
                  General Squad
                </span>
              )}
              <span className="text-xs font-semibold text-primary-action bg-primary-light border border-primary-border px-2.5 py-0.5 rounded-full">
                {team.event?.title || "Hackathon"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight font-heading">
              {team.name}
            </h1>
            <p className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-primary-action" />
              Affiliation: {team.university || "Collegiate Squad"}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-text-muted block uppercase tracking-wider">
              Roster Capacity
            </span>
            <span className="text-xl font-bold text-text-main">
              {team.members.length} / {totalSpots} Members
            </span>
          </div>
        </div>

        {isRestrictedEvent && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-amber-600 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              This squad belongs to an organization-restricted event ({team.university || "Organization-only"}).
              Applications are restricted to members of this organization in Clerk.
            </span>
          </div>
        )}

        {pendingInvite && !isUserMember && (
          <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-500 uppercase tracking-wider block">
                  You Have an Active Invitation!
                </span>
                <p className="text-xs text-text-main font-semibold">
                  Designated Role: <span className="text-primary-action font-extrabold">{pendingInvite.roleTitle || "Squad Contributor"}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onOpenInviteModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <span>Review Invitation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-muted">
            Squad Mission & Objectives
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            {team.description || `Recruiting driven builders for ${team.event?.title || "the upcoming hackathon"}. Apply with your profile to join forces.`}
          </p>
        </div>

        {/* Role : Technologies Needed Section */}
        <div className="space-y-4 pt-4 border-t border-border-main">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-text-main flex items-center gap-2 font-heading">
                <Layers className="w-4 h-4 text-primary-action" />
                <span>Role : Technologies Needed</span>
              </h3>
              <p className="text-xs text-text-muted">
                Required competencies and open vacancies structured by role.
              </p>
            </div>
            {team.roles && team.roles.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-dim text-text-muted border border-border-main self-start sm:self-auto">
                {team.roles.length} Defined Roles
              </span>
            )}
          </div>

          {team.roles && team.roles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {team.roles
                .filter((r) => (r.spots ?? 1) > 0)
                .map((role) => {
                  const isOptimalRole = activeBestMatchingRole?.roleTitle === role.title;
                  const matchingSkillsCount = role.skills.filter((s) => checkSkillMatch(s)).length;

                  return (
                    <div
                      key={role.id || role.title}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 shadow-2xs ${
                        isOptimalRole
                          ? "bg-gradient-to-br from-primary-action/10 via-surface to-surface border-primary-action/40 shadow-xs"
                          : "bg-surface-dim/50 border-border-main"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-bold text-text-main font-heading truncate">
                              {role.title}
                            </h4>
                            {isOptimalRole && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-primary-action text-white shadow-2xs">
                                ⭐ Best Match
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium block mt-0.5">
                            {isOptimalRole ? (
                              <span className="text-primary-action font-bold">Recommended Role</span>
                            ) : (
                              <span className="text-text-muted">{role.spots || 1} Open Spot{(role.spots || 1) > 1 ? "s" : ""}</span>
                            )}
                          </span>
                        </div>

                        {isSignedIn && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                              matchingSkillsCount > 0
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-surface text-text-muted border-border-main"
                            }`}
                          >
                            {matchingSkillsCount}/{role.skills.length} Skills Match
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-1 border-t border-border-main/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                          Technologies Needed:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {role.skills.map((skill) => {
                            const isMatched = checkSkillMatch(skill);
                            return (
                              <span
                                key={skill}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                  isMatched && isSignedIn
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-surface text-text-muted border-border-main"
                                }`}
                              >
                                {isMatched && isSignedIn && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                                <span>{skill}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl border border-border-main bg-surface-dim/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-text-main font-heading">
                  Core Squad Contributor
                </h4>
                <span className="text-xs text-text-muted font-medium">
                  Open Technical Requirements
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                  Technologies Needed:
                </span>
                <div className="flex flex-wrap gap-2">
                  {team.requirements.map((req) => (
                    <SkillTag
                      key={req}
                      skill={req}
                      breakdown={recommendation?.requirementBreakdown || (team as any).requirementBreakdown}
                      userSkills={isSignedIn ? userVerifiedSkills : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Squad Roster for Candidates */}
      <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-text-main font-heading">
              Current Squad Roster
            </h3>
            <p className="text-xs text-text-muted">
              Verified team members currently committed to this project.
            </p>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            {team.members.length} / {totalSpots} Members
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {team.members.map((member) => (
            <div
              key={member.id}
              className="p-3.5 rounded-xl border border-border-main bg-surface-dim flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-action to-cross-campus text-white font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    (member.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-text-main truncate">
                      {member.name || "Teammate"}
                    </h4>
                    {member.role === "Leader" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-light text-primary-action shrink-0">
                        Leader
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted truncate">{member.title || member.role || "Member"}</p>
                </div>
              </div>

              <Link
                to={member.userId ? `/profile/${member.userId}` : `/profile`}
                className="p-1.5 text-text-muted hover:text-primary-action rounded-lg hover:bg-surface transition-colors cursor-pointer shrink-0"
                title={`View ${member.name}'s profile`}
              >
                <User className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

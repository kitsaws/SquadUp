import React from "react";
import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import { TeamRoleItem, TeamMember, UserProfileResponse } from "../../services/api";

interface TeamRolesGridProps {
  roles?: TeamRoleItem[];
  requirements?: string[];
  members: TeamMember[];
  profile?: UserProfileResponse | null;
}

export function TeamRolesGrid({
  roles,
  requirements = [],
  members = [],
  profile,
}: TeamRolesGridProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-text-main font-heading flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-action" />
            <span>Squad Roles & Allocations</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Overview of configured squad roles, assigned teammates, and required technologies.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-dim text-text-muted border border-border-main self-start sm:self-auto shrink-0">
          {roles?.length || requirements.length} Configured Roles
        </span>
      </div>

      {roles && roles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const assignedMembersMap = new Map<string, TeamMember>();
            members.forEach((m) => {
              const isDirect = Boolean(
                role.assignedToId && (m.userId === role.assignedToId || m.id === role.assignedToId)
              );
              const isRole = Boolean(m.role && m.role.toLowerCase() === role.title.toLowerCase());
              const isTitle = Boolean(m.title && m.title.toLowerCase() === role.title.toLowerCase());
              if (isDirect || isRole || isTitle) {
                assignedMembersMap.set(m.userId || m.id, m);
              }
            });
            const assignedMembers = Array.from(assignedMembersMap.values());
            const remainingSpots = role.spots ?? 0;
            const isFilled = remainingSpots === 0;

            return (
              <div
                key={role.id || role.title}
                className="p-5 sm:p-6 rounded-2xl border border-border-main bg-surface shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-text-main font-heading truncate">
                        {role.title}
                      </h3>
                      <p className="text-xs text-text-muted mt-1">
                        {assignedMembers.length > 0 ? (
                          <span>
                            Filled by{" "}
                            {assignedMembers.map((m, idx) => {
                              const isMe = Boolean(
                                profile && (m.userId === profile.id || m.userId === profile.userId)
                              );
                              return (
                                <React.Fragment key={m.id || m.userId || idx}>
                                  {idx > 0 && <span className="text-text-muted font-normal">, </span>}
                                  <Link
                                    to={m.userId ? `/profile/${m.userId}` : `/profile`}
                                    className="font-bold text-text-main hover:text-primary-action transition-colors cursor-pointer"
                                  >
                                    {m.name || "Teammate"}
                                    {isMe ? " (You)" : ""}
                                  </Link>
                                </React.Fragment>
                              );
                            })}
                            {remainingSpots > 0 && (
                              <span className="text-text-muted font-normal">
                                {" "}• {remainingSpots} spot{remainingSpots > 1 ? "s" : ""} open
                              </span>
                            )}
                          </span>
                        ) : isFilled ? (
                          <span>
                            Filled by <strong className="font-semibold text-text-main">Active Teammate</strong>
                          </span>
                        ) : (
                          <span className="text-text-muted">
                            Vacant • {remainingSpots || 1} spot{(remainingSpots || 1) > 1 ? "s" : ""} open
                          </span>
                        )}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                        isFilled
                          ? "bg-surface-dim text-text-muted border border-border-main"
                          : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      }`}
                    >
                      {isFilled ? "Filled" : `${remainingSpots || 1} Open`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-border-main">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    Technologies Needed:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {role.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-dim text-text-main border border-border-main"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-border-main bg-surface-dim space-y-3">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-text-muted block">
            Technologies Needed:
          </span>
          <div className="flex flex-wrap gap-2">
            {requirements.map((req) => (
              <span
                key={req}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface text-text-main border border-border-main"
              >
                {req}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

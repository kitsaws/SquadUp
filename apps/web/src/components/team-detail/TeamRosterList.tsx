import React from "react";
import { Link } from "react-router-dom";
import { User, LogOut, UserMinus } from "lucide-react";
import { TeamMember } from "../../services/api";

interface TeamRosterListProps {
  members: TeamMember[];
  isUserLeader: boolean;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  onLeaveTeam: () => void;
  onRemoveMember: (memberUserId: string, memberName: string) => void;
}

export function TeamRosterList({
  members,
  isUserLeader,
  currentUserId,
  currentUserEmail,
  onLeaveTeam,
  onRemoveMember,
}: TeamRosterListProps) {
  // Sort squad members so Leader is always the first person in the roster
  const sortedMembers = [...members].sort((a, b) => {
    const isALeader = a.role === "Leader" || a.role?.toLowerCase() === "leader";
    const isBLeader = b.role === "Leader" || b.role?.toLowerCase() === "leader";
    if (isALeader && !isBLeader) return -1;
    if (!isALeader && isBLeader) return 1;
    return 0;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sortedMembers.map((member) => {
        const isCurrentMember =
          member.userId === currentUserId ||
          member.id === currentUserId ||
          (currentUserEmail && member.email && member.email.toLowerCase() === currentUserEmail.toLowerCase());

        return (
          <div
            key={member.id}
            className="p-3.5 rounded-xl border border-border-main bg-surface-dim flex items-center justify-between gap-3 shadow-2xs"
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
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
                {member.university && (
                  <p className="text-[11px] text-text-muted truncate">{member.university}</p>
                )}
              </div>
            </div>

            {/* Actions: View Profile and Kick/Remove or Leave */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Link
                to={member.userId ? `/profile/${member.userId}` : `/profile`}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold text-primary-action hover:text-white bg-primary-light hover:bg-primary-action border border-primary-border rounded-lg transition-all cursor-pointer w-full text-center"
                title={`View ${member.name}'s profile`}
              >
                <User className="w-3 h-3" />
                <span>View Profile</span>
              </Link>

              {isCurrentMember ? (
                <button
                  onClick={onLeaveTeam}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-all cursor-pointer w-full"
                  title="Leave this squad"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Leave</span>
                </button>
              ) : isUserLeader ? (
                <button
                  onClick={() => onRemoveMember(member.userId || member.id, member.name)}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-all cursor-pointer w-full"
                  title={`Remove ${member.name} from squad`}
                >
                  <UserMinus className="w-3 h-3" />
                  <span>Kick/Remove</span>
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

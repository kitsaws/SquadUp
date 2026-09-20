import React from "react";
import { Mail, Send, Clock } from "lucide-react";
import { TeamItem } from "../../services/api";
import { RoleSelectDropdown } from "../RoleSelectDropdown";
import { formatTimeAgo } from "../../utils/date.utils";

interface TeamInviteFormProps {
  team: TeamItem;
  isUserLeader: boolean;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  selectedRoleId: string;
  setSelectedRoleId: (roleId: string) => void;
  isInviting: boolean;
  onSendInvite: (e: React.FormEvent) => void;
}

export function TeamInviteForm({
  team,
  isUserLeader,
  inviteEmail,
  setInviteEmail,
  selectedRoleId,
  setSelectedRoleId,
  isInviting,
  onSendInvite,
}: TeamInviteFormProps) {
  if (!isUserLeader) return null;

  return (
    <form onSubmit={onSendInvite} className="flex flex-wrap items-center gap-2">
      {team.roles && team.roles.length > 0 && (
        <RoleSelectDropdown
          roles={team.roles}
          selectedRoleId={selectedRoleId}
          onChange={setSelectedRoleId}
        />
      )}

      <div className="relative">
        <Mail className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="Teammate email..."
          className="text-xs pl-8 pr-3 py-2 border border-border-main bg-surface-dim text-text-main placeholder:text-text-muted rounded-xl outline-hidden focus:border-primary-action focus:ring-1 focus:ring-primary-action w-44 sm:w-48"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isInviting}
        className="px-3 py-2 bg-primary-action hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-xs"
      >
        <Send className="w-3.5 h-3.5" />
        <span>{isInviting ? "Inviting..." : "Send Invite"}</span>
      </button>
    </form>
  );
}

interface TeamInvitesSectionProps {
  team: TeamItem;
  isUserLeader: boolean;
  onCancelInvite: (inviteId: string, email: string) => void;
}

export function TeamInvitesSection({
  team,
  isUserLeader,
  onCancelInvite,
}: TeamInvitesSectionProps) {
  const pendingInvites = (team.invites || []).filter((inv) => inv.status === "PENDING");

  if (pendingInvites.length === 0) return null;

  return (
    <div className="pt-4 border-t border-border-main space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary-action" />
          <span>Pending Outgoing Invitations</span>
        </h4>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary-action border border-primary-border">
          {pendingInvites.length} Pending
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {pendingInvites.map((inv) => (
          <div
            key={inv.id}
            className="p-3 rounded-xl border border-border-main/70 bg-surface-dim/50 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-surface border border-border-main flex items-center justify-center text-text-muted text-xs font-bold shrink-0">
                @
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-text-main truncate block">
                  {inv.email}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                  {inv.roleTitle ? (
                    <span className="text-primary-action font-semibold truncate">
                      {inv.roleTitle}
                    </span>
                  ) : (
                    <span>General Role</span>
                  )}
                  <span>• {formatTimeAgo(new Date(inv.createdAt))}</span>
                </div>
              </div>
            </div>

            {isUserLeader && (
              <button
                onClick={() => onCancelInvite(inv.id, inv.email)}
                className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-all cursor-pointer shrink-0"
                title="Cancel invitation"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

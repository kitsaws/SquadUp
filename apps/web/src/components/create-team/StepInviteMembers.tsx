import React from "react";
import {
  Sparkles,
  Briefcase,
  ChevronDown,
  Layers,
  Check,
  X,
} from "lucide-react";
import { RoleDraft, InviteDraft } from "./create-team.types";

interface StepInviteMembersProps {
  roles: RoleDraft[];
  invites: InviteDraft[];
  newInviteEmail: string;
  setNewInviteEmail: (email: string) => void;
  newInviteRoleIndex: number;
  setNewInviteRoleIndex: (index: number) => void;
  isInviteRoleDropdownOpen: boolean;
  setIsInviteRoleDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  inviteRoleDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleAddInvite: () => void;
  handleRemoveInvite: (inviteId: string) => void;
}

export function StepInviteMembers({
  roles,
  invites,
  newInviteEmail,
  setNewInviteEmail,
  newInviteRoleIndex,
  setNewInviteRoleIndex,
  isInviteRoleDropdownOpen,
  setIsInviteRoleDropdownOpen,
  inviteRoleDropdownRef,
  handleAddInvite,
  handleRemoveInvite,
}: StepInviteMembersProps) {
  return (
    <div className="space-y-3 pt-2 border-t border-border-main/60">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-action" />
          <span>Invite Teammates Now (Optional)</span>
        </label>
        <span className="text-[10px] text-text-muted">In-App & Email Alert</span>
      </div>

      {/* Add Invite Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          type="email"
          placeholder="Teammate's email address..."
          value={newInviteEmail}
          onChange={(e) => setNewInviteEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddInvite();
            }
          }}
          className="flex-1 px-3.5 py-2 text-xs bg-surface-dim rounded-xl border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary-action"
        />

        {/* Custom Role Select Dropdown */}
        <div className="relative" ref={inviteRoleDropdownRef}>
          <button
            type="button"
            onClick={() => setIsInviteRoleDropdownOpen((prev) => !prev)}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim/70 text-text-main text-xs font-semibold shadow-2xs transition-all cursor-pointer min-w-[170px] max-w-[220px] focus:outline-hidden focus:ring-2 focus:ring-primary-action/30 focus:border-primary-action"
            title="Designate squad role for this invite"
            aria-haspopup="listbox"
            aria-expanded={isInviteRoleDropdownOpen}
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <div className="p-1 rounded-md bg-primary-light text-primary-action shrink-0">
                <Briefcase className="w-3 h-3" />
              </div>
              <span className="truncate font-medium">
                {newInviteRoleIndex >= 0 && newInviteRoleIndex < roles.length
                  ? roles[newInviteRoleIndex].title.trim() || `Position #${newInviteRoleIndex + 1}`
                  : "Any Open Role"}
              </span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${
                isInviteRoleDropdownOpen ? "rotate-180 text-primary-action" : ""
              }`}
            />
          </button>

          {/* Popover Dropdown Menu */}
          {isInviteRoleDropdownOpen && (
            <div className="absolute left-0 sm:right-0 sm:left-auto bottom-full mb-1.5 z-50 w-72 sm:w-80 bg-surface rounded-2xl border border-border-main shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
              <div className="px-3 py-1.5 border-b border-border-main/60 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                  <Layers className="w-3 h-3 text-primary-action" />
                  Designate Squad Role
                </span>
                <span className="text-[10px] font-semibold text-text-muted">
                  {roles.length} Position{roles.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 pt-1.5 pr-0.5">
                {/* Option 1: Any Open Role */}
                <button
                  type="button"
                  onClick={() => {
                    setNewInviteRoleIndex(-1);
                    setIsInviteRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    newInviteRoleIndex === -1
                      ? "bg-primary-light/70 text-primary-action border border-primary-border/60 font-bold"
                      : "hover:bg-surface-dim text-text-main border border-transparent font-medium"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>Any Open Role</span>
                    </div>
                    <span className="text-[10px] text-text-muted block mt-0.5 font-normal">
                      Let candidate pick or assign role later
                    </span>
                  </div>
                  {newInviteRoleIndex === -1 && (
                    <Check className="w-3.5 h-3.5 text-primary-action shrink-0" />
                  )}
                </button>

                {/* List of Configured Roles */}
                {roles.map((r, idx) => {
                  const isSelected = newInviteRoleIndex === idx;
                  const displayTitle = r.title.trim() || `Position #${idx + 1}`;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setNewInviteRoleIndex(idx);
                        setIsInviteRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2 ${
                        isSelected
                          ? "bg-primary-light/70 text-primary-action border border-primary-border/60"
                          : "hover:bg-surface-dim text-text-main border border-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate block font-heading">
                            {displayTitle}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-dim text-text-muted border border-border-main shrink-0">
                            {r.spots} spot{r.spots > 1 ? "s" : ""}
                          </span>
                        </div>

                        {r.skills && r.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {r.skills.map((skill) => (
                              <span
                                key={skill}
                                className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface text-text-muted border border-border-main"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary-action shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddInvite}
          className="px-3.5 py-2 rounded-xl bg-surface border border-border-main hover:bg-surface-dim text-text-main text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          + Add
        </button>
      </div>

      {/* List of Pending Invites */}
      {invites.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {invites.map((inv) => {
            const assignedRoleTitle =
              inv.roleIndex >= 0 && inv.roleIndex < roles.length
                ? roles[inv.roleIndex].title || `Role #${inv.roleIndex + 1}`
                : "Any Open Role";

            return (
              <div
                key={inv.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border-main text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-text-main truncate">
                    {inv.email}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-light text-primary-action border border-primary-border shrink-0">
                    {assignedRoleTitle}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveInvite(inv.id)}
                  className="text-text-muted hover:text-rose-500 transition-colors p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

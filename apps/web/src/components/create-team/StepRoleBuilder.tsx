import React from "react";
import {
  Users,
  Plus,
  Trash2,
  X,
  Crown,
  Check,
} from "lucide-react";
import { RoleDraft, POPULAR_SKILL_SUGGESTIONS } from "./create-team.types";

interface StepRoleBuilderProps {
  roles: RoleDraft[];
  leaderRoleIndex: number;
  setLeaderRoleIndex: (index: number) => void;
  skillInputs: Record<string, string>;
  setSkillInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAddRole: () => void;
  handleRemoveRole: (index: number) => void;
  handleUpdateRoleTitle: (index: number, title: string) => void;
  handleUpdateRoleSpots: (index: number, delta: number) => void;
  handleAddSkillToRole: (roleIndex: number, skillName: string) => void;
  handleRemoveSkillFromRole: (roleIndex: number, skillToRemove: string) => void;
}

export function StepRoleBuilder({
  roles,
  leaderRoleIndex,
  setLeaderRoleIndex,
  skillInputs,
  setSkillInputs,
  handleAddRole,
  handleRemoveRole,
  handleUpdateRoleTitle,
  handleUpdateRoleSpots,
  handleAddSkillToRole,
  handleRemoveSkillFromRole,
}: StepRoleBuilderProps) {
  return (
    <>
      {/* Structured Role Builder */}
      <div className="space-y-3 pt-2 border-t border-border-main/60">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary-action" />
              <span>Configured Squad Roles & Skill Requirements</span>
            </label>
            <p className="text-[11px] text-text-muted mt-0.5">
              Specify titles, required skills, and open recruitment spots for each position.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddRole}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary-border bg-primary-light text-primary-action text-xs font-bold hover:bg-primary-action hover:text-white transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Position</span>
          </button>
        </div>

        {/* Role Cards List */}
        <div className="space-y-3">
          {roles.map((role, rIndex) => {
            const isLeaderChosenRole = leaderRoleIndex === rIndex;
            const roleInputVal = skillInputs[role.id] || "";

            return (
              <div
                key={role.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isLeaderChosenRole
                    ? "bg-primary-light/30 border-primary-border shadow-xs"
                    : "bg-surface-dim/70 border-border-main"
                }`}
              >
                {/* Role Header (Title + Slots + Delete) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="e.g. Frontend Developer, AI Specialist, Product Designer"
                      value={role.title}
                      onChange={(e) => handleUpdateRoleTitle(rIndex, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-surface rounded-xl border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary-action"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Spot Stepper */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface border border-border-main shadow-2xs">
                      <span className="text-[11px] font-semibold text-text-muted mr-1">
                        Slots:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateRoleSpots(rIndex, -1)}
                        disabled={role.spots <= 1}
                        className="w-5 h-5 rounded-md flex items-center justify-center bg-surface-dim hover:bg-border-main text-text-main text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-text-main w-4 text-center">
                        {role.spots}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateRoleSpots(rIndex, 1)}
                        disabled={role.spots >= 8}
                        className="w-5 h-5 rounded-md flex items-center justify-center bg-surface-dim hover:bg-border-main text-text-main text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Remove Role */}
                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(rIndex)}
                        className="p-1.5 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Skill Tags for this Role */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {role.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface text-text-main border border-border-main text-[11px] font-medium shadow-2xs"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkillFromRole(rIndex, skill)}
                          className="text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {/* Tag Input */}
                    <input
                      type="text"
                      placeholder={
                        role.skills.length === 0
                          ? "+ Type skill & press Enter (e.g. React, Docker)"
                          : "+ Add skill tag"
                      }
                      value={roleInputVal}
                      onChange={(e) =>
                        setSkillInputs((prev) => ({
                          ...prev,
                          [role.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddSkillToRole(rIndex, roleInputVal);
                        }
                      }}
                      onBlur={() => {
                        if (roleInputVal.trim()) {
                          handleAddSkillToRole(rIndex, roleInputVal);
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] bg-surface rounded-lg border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary-action min-w-[140px]"
                    />
                  </div>

                  {/* Quick skill chips */}
                  {role.skills.length < 3 && (
                    <div className="flex flex-wrap gap-1 items-center pt-1">
                      <span className="text-[10px] text-text-muted mr-1">Suggestions:</span>
                      {POPULAR_SKILL_SUGGESTIONS.slice(0, 6)
                        .filter((s) => !role.skills.includes(s))
                        .map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleAddSkillToRole(rIndex, s)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-surface hover:bg-primary-light hover:text-primary-action text-text-muted border border-border-main transition-colors cursor-pointer"
                          >
                            + {s}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory Leader Role Selection */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-action/10 via-surface-dim/60 to-surface-dim border border-primary-action/30 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5 font-heading">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>Your Designated Role (Team Leader)</span>
          </label>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-action text-white">
            Mandatory
          </span>
        </div>

        <p className="text-xs text-text-muted">
          Select which position you will fill in this squad. Upon squad creation, you will automatically claim 1 slot for this role.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {roles.map((r, idx) => {
            const isSelected = leaderRoleIndex === idx;
            const roleTitleDisplay = r.title.trim() || `Position #${idx + 1}`;
            const remainingOpenSpotsAfterCreation = Math.max(0, r.spots - 1);

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setLeaderRoleIndex(idx)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-primary-action text-white border-primary-action shadow-sm"
                    : "bg-surface hover:bg-surface-dim border-border-main text-text-main"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold block truncate">
                    {roleTitleDisplay}
                  </span>
                  <span
                    className={`text-[10px] block mt-0.5 ${
                      isSelected ? "text-white/80" : "text-text-muted"
                    }`}
                  >
                    {isSelected
                      ? `1 slot claimed by you (${remainingOpenSpotsAfterCreation} open for recruitment)`
                      : `${r.spots} configured slot${r.spots > 1 ? "s" : ""}`}
                  </span>
                </div>

                {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

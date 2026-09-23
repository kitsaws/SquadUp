import React, { useState, useMemo, useEffect } from "react";
import { useUser } from "@clerk/react";
import { X, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { TeamCardData } from "./TeamCard";

interface ApplyTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamCardData;
  onSubmit: (teamId: string, roleTitle: string, message: string, roleId?: string) => void;
}

interface ParsedRoleOption {
  id?: string;
  title: string;
  skills: string[];
  spots: number;
  isFilled: boolean;
  isRecommended: boolean;
}

export function ApplyTeamModal({ isOpen, onClose, team, onSubmit }: ApplyTeamModalProps) {
  const { user } = useUser();

  // Build list of all available roles specifically from the squad's configured roles
  const availableRoles: ParsedRoleOption[] = useMemo(() => {
    const bestTitle = team.bestMatchingRole?.roleTitle?.toLowerCase().trim();
    const bestId = team.bestMatchingRole?.roleId;

    if (team.roles && team.roles.length > 0) {
      return team.roles.map((r) => {
        const titleTrimmed = r.title?.trim() || "Squad Member";
        const spots = typeof r.spots === "number" ? r.spots : (r.assignedToId ? 0 : 1);
        const isFilled = spots <= 0;
        const isRecommended = Boolean(
          (bestId && r.id === bestId) ||
          (bestTitle && titleTrimmed.toLowerCase() === bestTitle)
        );

        return {
          id: r.id,
          title: titleTrimmed,
          skills: r.skills || [],
          spots: Math.max(0, spots),
          isFilled,
          isRecommended,
        };
      });
    }

    // Fallback if team has requirements but no formal roles array
    if (team.requirements && team.requirements.length > 0) {
      return team.requirements.map((req) => ({
        id: undefined,
        title: req,
        skills: [req],
        spots: 1,
        isFilled: false,
        isRecommended: false,
      }));
    }

    return [
      {
        id: undefined,
        title: "Squad Member",
        skills: [],
        spots: 1,
        isFilled: false,
        isRecommended: false,
      },
    ];
  }, [team.roles, team.requirements, team.bestMatchingRole]);

  // Determine initial selection: recommended open role, or first open role
  const initialRole = useMemo(() => {
    const recommended = availableRoles.find((o) => o.isRecommended && !o.isFilled);
    if (recommended) return recommended;

    const firstOpen = availableRoles.find((o) => !o.isFilled);
    if (firstOpen) return firstOpen;

    return availableRoles[0] || { title: "Squad Member", skills: [], spots: 1, isFilled: false, isRecommended: false };
  }, [availableRoles]);

  const [selectedRoleTitle, setSelectedRoleTitle] = useState<string>(initialRole.title);
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(initialRole.id);
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync selection when initialRole changes
  useEffect(() => {
    if (initialRole) {
      setSelectedRoleTitle(initialRole.title);
      setSelectedRoleId(initialRole.id);
    }
  }, [initialRole]);

  if (!isOpen) return null;

  const handleSelectRole = (opt: ParsedRoleOption) => {
    if (opt.isFilled) return;
    setSelectedRoleTitle(opt.title);
    setSelectedRoleId(opt.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalRole = selectedRoleTitle || "Squad Member";
    const finalRoleId = selectedRoleId;

    setTimeout(() => {
      setIsSubmitting(false);
      onSubmit(team.id, finalRole, message, finalRoleId);
      onClose();
    }, 300);
  };

  const candidateName = user?.fullName || "Student Applicant";
  const candidateInitials = candidateName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const openRolesCount = availableRoles.filter((r) => !r.isFilled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-surface rounded-3xl shadow-2xl border border-border-main overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border-main flex items-start justify-between bg-surface-dim/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-action uppercase tracking-wider block">
                Join Request
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border-main">
                {team.eventTitle || "Hackathon Squad"}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-text-main font-heading tracking-tight mt-1">
              Apply to {team.name}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Hackathon Squad • Open Recruitment
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Applicant Snapshot */}
          <div className="p-3.5 rounded-2xl bg-surface border border-border-main flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-surface-dim text-text-main border border-border-main font-bold flex items-center justify-center text-sm font-heading shrink-0 overflow-hidden">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={candidateName} className="w-full h-full object-cover" />
              ) : (
                candidateInitials || "U"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-text-main font-heading truncate">{candidateName}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                  Verified User
                </span>
              </div>
              <p className="text-xs text-text-muted truncate">
                Verified portfolio & competencies will be shared with the squad leader.
              </p>
            </div>
          </div>

          {/* Preferred Role in Squad - Shows all squad available roles */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                Preferred Role in Squad:
              </label>
              {openRolesCount > 0 && (
                <span className="text-[11px] font-semibold text-text-muted">
                  {openRolesCount} {openRolesCount === 1 ? "Role" : "Roles"} Available
                </span>
              )}
            </div>

            <div className={`grid ${availableRoles.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-2.5`}>
              {availableRoles.map((role) => {
                const isSelected = Boolean(
                  selectedRoleId && role.id
                    ? selectedRoleId === role.id
                    : selectedRoleTitle.toLowerCase().trim() === role.title.toLowerCase().trim()
                );
                const isFilled = role.isFilled;

                return (
                  <button
                    key={role.id || role.title}
                    type="button"
                    disabled={isFilled}
                    onClick={() => handleSelectRole(role)}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                      isFilled
                        ? "bg-surface-dim/50 border-border-main opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "bg-primary-action/10 border-primary-action ring-1.5 ring-primary-action/40 shadow-xs"
                        : "bg-surface border-border-main text-text-main hover:bg-surface-dim hover:border-border-main"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-start gap-2">
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-primary-action shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-border-main shrink-0" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`text-xs font-bold font-heading block truncate ${
                              isSelected ? "text-primary-action" : "text-text-main"
                            }`}
                          >
                            {role.title}
                          </span>
                          <span className="text-[10px] font-medium text-text-muted block mt-0.5">
                            {isFilled ? "Position Filled" : `${role.spots} spot${role.spots > 1 ? "s" : ""} open`}
                          </span>
                        </div>
                      </div>

                      {role.isRecommended && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary-action/15 text-primary-action border border-primary-action/30 shrink-0 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Recommended</span>
                        </span>
                      )}
                    </div>

                    {role.skills && role.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-border-main/50">
                        {role.skills.map((s) => (
                          <span
                            key={s}
                            className="text-[9px] px-1.5 py-0.5 rounded-md font-medium bg-surface-dim text-text-muted border border-border-main"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Introduction Note (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Introduction Note (Optional):
              </label>
              <span className="text-[11px] text-text-muted font-mono">
                {message.length} / 500
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself, explain what you want to build, and highlight relevant projects..."
              className="w-full text-xs text-text-main bg-surface border border-border-main rounded-xl p-3 outline-hidden focus:border-primary-action focus:ring-2 focus:ring-primary-action/10 font-sans leading-relaxed"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-border-main flex items-center justify-between bg-surface">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-surface-dim hover:text-text-main transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedRoleTitle}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white bg-primary-action hover:bg-primary-hover transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <span>Submit Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


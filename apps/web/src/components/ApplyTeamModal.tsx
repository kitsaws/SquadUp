import React, { useState } from "react";
import { useUser } from "@clerk/react";
import { X, ArrowRight, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { TeamCardData } from "./TeamCard";

interface ApplyTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamCardData;
  onSubmit: (teamId: string, role: string, message: string) => void;
}

export function ApplyTeamModal({ isOpen, onClose, team, onSubmit }: ApplyTeamModalProps) {
  const { user } = useUser();
  const defaultRole = team.neededRequirement
    ? `${team.neededRequirement} Specialist`
    : team.requirements?.[0]
    ? `${team.requirements[0]} Contributor`
    : "Core Contributor";

  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [message, setMessage] = useState(
    `Hi! I'd love to join ${team.name} for ${team.eventTitle || "the hackathon"}. My background aligns with your stack requirements, and I'm eager to contribute.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSubmit(team.id, selectedRole, message);
      onClose();
    }, 400);
  };

  const roles = [
    defaultRole,
    "Full Stack Engineer",
    "Backend Specialist",
    "Frontend Specialist",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const candidateName = user?.fullName || "Student Applicant";
  const candidateInitials = candidateName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border-main overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border-main flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-primary-action uppercase tracking-wider block">
              Join Request
            </span>
            <h3 className="text-xl font-bold text-text-main font-heading">
              Apply to {team.name}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {team.eventTitle || "Hackathon Squad"} • Open Recruitment
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Applicant Snapshot */}
          <div className="p-3.5 rounded-xl bg-surface border border-border-main flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-surface-dim text-text-main border border-border-main font-bold flex items-center justify-center text-sm font-heading shrink-0 overflow-hidden">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={candidateName} className="w-full h-full object-cover" />
              ) : (
                candidateInitials || "U"
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-main font-heading">{candidateName}</span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20">
                  Verified Dossier
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Verified portfolio & competencies will be shared with the squad leader.
              </p>
            </div>
          </div>

          {/* Role Selector Chips */}
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
              Preferred Role in Squad:
            </label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    selectedRole === role
                      ? "bg-primary-action text-white border-primary-action shadow-xs"
                      : "bg-surface text-text-main border-border-main hover:bg-surface-dim"
                  }`}
                >
                  {selectedRole === role ? `✓ ${role}` : role}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea with counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Introduction Note (Optional):
              </label>
              <span className="text-[11px] text-text-muted font-mono">
                {message.length} / 500
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself, explain what you want to build, and highlight relevant projects..."
              className="w-full text-xs text-text-main bg-surface border border-border-main rounded-lg p-3 outline-hidden focus:border-primary-action focus:ring-2 focus:ring-primary-action/10 font-sans leading-relaxed"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-border-main flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-text-muted hover:bg-surface-dim hover:text-text-main transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-primary-action hover:bg-primary-hover transition-colors shadow-xs cursor-pointer disabled:opacity-50"
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

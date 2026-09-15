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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
              Join Request
            </span>
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              Apply to {team.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {team.eventTitle || "Hackathon Squad"} • Open Recruitment
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Applicant Snapshot */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm font-heading shrink-0 overflow-hidden">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={candidateName} className="w-full h-full object-cover" />
              ) : (
                candidateInitials || "U"
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 font-heading">{candidateName}</span>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                  Verified Dossier
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Verified portfolio & competencies will be shared with the squad leader.
              </p>
            </div>
          </div>

          {/* Role Selector Chips */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
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
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Introduction Note (Optional):
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {message.length} / 500
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself, explain what you want to build, and highlight relevant projects..."
              className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 font-sans leading-relaxed"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
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

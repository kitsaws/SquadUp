import React from "react";
import { CheckCircle2, Sparkles, Calendar, Users, ArrowRight, Building2, Globe, X } from "lucide-react";

interface OnboardingCompletedModalProps {
  isOpen: boolean;
  method: "resume" | "manual";
  universityName?: string | null;
  onBrowseEvents: () => void;
  onBrowseTeams: () => void;
  onClose?: () => void;
}

export function OnboardingCompletedModal({
  isOpen,
  method,
  universityName,
  onBrowseEvents,
  onBrowseTeams,
  onClose,
}: OnboardingCompletedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 text-center space-y-5 animate-in zoom-in-95 duration-200 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {/* Animated Celebration Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary-action text-white flex items-center justify-center ring-2 ring-white shadow-2xs animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1.5">
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            Onboarding Completed!
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
            {method === "resume"
              ? "Your resume has been submitted and queued for background AI parsing. Your skills & recommendations will update automatically."
              : "Your developer profile has been created and verified across the SquadUp deterministic taxonomy graph."}
          </p>
        </div>

        {/* Institution Context Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">
          {universityName ? (
            <>
              <Building2 className="w-3.5 h-3.5 text-primary-action" />
              <span className="font-semibold text-slate-900 truncate max-w-[220px]">
                {universityName}
              </span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-purple-600" />
              <span className="font-semibold text-slate-900">Independent Participant</span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            onClick={onBrowseEvents}
            className="w-full py-3 px-5 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-sm font-bold shadow-md shadow-primary-action/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            <Calendar className="w-4 h-4" />
            <span>Browse Events</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>

          <button
            type="button"
            onClick={onBrowseTeams}
            className="w-full py-2.5 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Explore Squads & Teams</span>
          </button>
        </div>
      </div>
    </div>
  );
}

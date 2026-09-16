import React from "react";
import { Sparkles, CheckCircle2, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ResumeProcessingNoticeProps {
  jobId: string;
  fileName?: string;
  onContinue: () => void;
}

export function ResumeProcessingNotice({ jobId, fileName, onContinue }: ResumeProcessingNoticeProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 max-w-xl mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Animated Success & AI Badge */}
      <div className="relative inline-flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-light border border-primary-border flex items-center justify-center text-primary-action shadow-xs">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white shadow-2xs">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
          Resume Uploaded Successfully!
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          Our background AI worker is extracting your skills, projects, and work experience into the deterministic 143-node taxonomy graph.
        </p>
      </div>

      {/* Optimistic non-blocking indicator callout */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Clock className="w-3.5 h-3.5 text-primary-action animate-spin" />
          <span>Non-Blocking Background Processing</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          You don't need to wait on this screen. You can jump directly into squad scouting and hackathons—your recommendations will automatically refresh as soon as parsing completes.
        </p>
        {fileName && (
          <div className="pt-1.5 border-t border-slate-200/70 text-[11px] text-slate-400 font-mono truncate">
            Document: {fileName}
          </div>
        )}
      </div>

      {/* Primary CTAs */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/events")}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-sm font-bold shadow-md shadow-primary-action/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
        >
          <span>Browse Events</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/teams")}
          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Explore Squads & Teams</span>
        </button>
      </div>
    </div>
  );
}

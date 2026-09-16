import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Check, X, FileText, Building, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { SkillTag } from "./Badges";

export interface CandidateApplicationData {
  id: string;
  candidateId: string;
  name: string;
  avatarUrl?: string;
  university: string;
  year?: string;
  appliedRole: string;
  matchScore: number; // 0.0 to 1.0
  isCampusMatch: boolean;
  appliedTimeAgo: string;
  coverNote: string;
  skills: { name: string; provenance: string; score: number }[];
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}

interface CandidateApplicationTileProps {
  application: CandidateApplicationData;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  defaultExpanded?: boolean;
}

export function CandidateApplicationTile({
  application,
  onAccept,
  onDecline,
  defaultExpanded = false,
}: CandidateApplicationTileProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const percentScore = Math.round(application.matchScore * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all overflow-hidden">
      {/* Default Collapsed Row / Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
      >
        {/* Left: Avatar & Candidate Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0 overflow-hidden shadow-2xs">
            {application.avatarUrl ? (
              <img
                src={application.avatarUrl}
                alt={application.name}
                className="w-full h-full object-cover"
              />
            ) : (
              application.name[0]
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 font-heading truncate">
                {application.name}
              </span>
              {application.year && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • {application.year}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-primary-action bg-primary-light px-2 py-0.2 rounded-md">
                {application.appliedRole}
              </span>
              <span>• Applied {application.appliedTimeAgo}</span>
            </div>
          </div>
        </div>

        {/* Right: Badges & Expand Affordance */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Match Score Badge */}
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              percentScore >= 80
                ? "bg-best-fit-light text-best-fit-dark border-best-fit"
                : "bg-surface-dim text-text-muted border-surface-border"
            }`}
          >
            {percentScore}% Match
          </span>

          {/* Campus Match Badge */}
          {application.isCampusMatch && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Building className="w-3.5 h-3.5 text-emerald-600" /> Campus Match
            </span>
          )}

          {/* Expand/Collapse Chevron Button */}
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title={isExpanded ? "Collapse application" : "Expand application"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Body Panel (Shown only when tile is clicked) */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 animate-in fade-in duration-150">
          {/* Personal Quick-Bar & Profile Link Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Building className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800">{application.university}</span>
              {application.year && <span>• {application.year}</span>}
            </div>

            <div className="flex items-center gap-2">
              {/* Profile Link Button as requested */}
              <Link
                to={`/profile/${application.candidateId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-primary-action bg-primary-light border border-primary-border hover:bg-primary-light/80 transition-colors cursor-pointer"
              >
                <span>View Full Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              <a
                href={`/api/resume/view/${application.candidateId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
              >
                <FileText className="w-3 h-3 text-slate-500" />
                <span>Resume PDF</span>
              </a>
            </div>
          </div>

          {/* Candidate Cover Note */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Candidate Note:
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
              "{application.coverNote}"
            </div>
          </div>

          {/* Verified Skills & Provenance */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Verified Matching Skills:
            </div>
            <div className="flex flex-wrap gap-2">
              {application.skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-800"
                >
                  <span className="font-semibold text-slate-900">{skill.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                    {skill.provenance}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">
                    {Math.round(skill.score * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leader Decision Actions */}
          {application.status === "PENDING" && (
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Accepting <strong className="text-slate-800">{application.name}</strong> adds them as a squad member.
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDecline?.(application.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200 cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => onAccept?.(application.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept to Squad
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

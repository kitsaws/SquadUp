import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Check, X, FileText, Building, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { RecommendationBadge, RecommendationTier, SkillTag } from "./Badges";

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
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | string;
  category?: RecommendationTier;
}

interface CandidateApplicationTileProps {
  application: CandidateApplicationData;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  defaultExpanded?: boolean;
}

/**
 * Strips raw taxonomy/graph debugging metadata (Depth, Graph Distance, LCA, etc.)
 * and outputs clean, human-friendly explanation copy.
 */
export function cleanProvenanceText(
  provenance: string | undefined,
  skillName: string,
  score: number
): string {
  const isExact = score >= 0.95;
  const isPartial = score >= 0.40 && score < 0.95;

  if (
    provenance &&
    !provenance.includes("Depth:") &&
    !provenance.includes("Graph Distance") &&
    !provenance.includes("subdomain") &&
    !provenance.includes("Sibling technology") &&
    !provenance.includes("Score:") &&
    !provenance.includes("Direct 1:1")
  ) {
    return provenance;
  }

  // Extract target requirement name if present in raw string
  const reqMatch = provenance?.match(/Requirement\s+'([^']+)'/i);
  const targetReq = reqMatch ? reqMatch[1] : undefined;

  if (isExact) {
    return `Exact match with '${skillName}' from candidate profile.`;
  }
  if (isPartial) {
    return targetReq && targetReq.toLowerCase() !== skillName.toLowerCase()
      ? `Relevant experience matched with '${skillName}' for '${targetReq}'.`
      : `Relevant experience matched with '${skillName}'.`;
  }
  return `Candidate verified skill match.`;
}

export function CandidateApplicationTile({
  application,
  onAccept,
  onDecline,
  defaultExpanded = false,
}: CandidateApplicationTileProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const percentScore = Math.round(application.matchScore * 100);

  // Category theme mapping
  let accentBorder = "border-border-main hover:border-border-main";
  let leftAccentColor = "";

  if (application.category === "BEST") {
    leftAccentColor = "bg-best-fit";
    accentBorder = "border-best-fit/50 hover:border-best-fit shadow-xs";
  } else if (application.category === "GOOD_DIFFERENT_UNIVERSITY") {
    leftAccentColor = "bg-cross-campus";
    accentBorder = "border-cross-campus/50 hover:border-cross-campus shadow-xs";
  } else if (application.category === "SAME_UNIVERSITY_LOWER_SCORE") {
    leftAccentColor = "bg-campus-explorer";
    accentBorder = "border-campus-explorer/50 hover:border-campus-explorer shadow-xs";
  }

  return (
    <div className={`relative bg-surface rounded-xl border ${accentBorder} transition-all overflow-hidden`}>
      {/* Left Highlight Strip for Recommendation Tier */}
      {leftAccentColor && (
        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${leftAccentColor}`} />
      )}

      {/* Default Collapsed Row / Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-surface-dim/50 transition-colors pl-4.5"
      >
        {/* Left: Avatar & Candidate Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-surface-dim border border-border-main flex items-center justify-center text-text-main font-bold text-sm shrink-0 overflow-hidden shadow-2xs">
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
              <span className="text-sm font-bold text-text-main font-heading truncate">
                {application.name}
              </span>
              {application.year && (
                <span className="text-xs text-text-muted hidden sm:inline">
                  • {application.year}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted mt-0.5">
              <span className="font-semibold text-primary-action bg-primary-light px-2 py-0.2 rounded-md">
                {application.appliedRole}
              </span>
              <span>• Applied {application.appliedTimeAgo}</span>
            </div>
          </div>
        </div>

        {/* Right: Badges & Expand Affordance */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Match / Recommendation Badge */}
          {application.category ? (
            <RecommendationBadge category={application.category} score={application.matchScore} />
          ) : (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-surface-dim text-text-muted border-border-main">
              {percentScore}% Match
            </span>
          )}

          {/* Campus Match Badge */}
          {application.isCampusMatch && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <Building className="w-3.5 h-3.5 text-emerald-500" /> Campus Match
            </span>
          )}

          {/* Expand/Collapse Chevron Button */}
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-surface-dim text-text-muted hover:text-text-main transition-colors"
            title={isExpanded ? "Collapse application" : "Expand application"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Body Panel (Shown only when tile is clicked) */}
      {isExpanded && (
        <div className="border-t border-border-main bg-surface-dim/30 p-5 space-y-4 animate-in fade-in duration-150">
          {/* Personal Quick-Bar & Profile Link Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-border-main">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Building className="w-4 h-4 text-text-muted" />
              <span className="font-semibold text-text-main">{application.university}</span>
              {application.year && <span>• {application.year}</span>}
            </div>

            <div className="flex items-center gap-2">
              {/* Profile Link Button */}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-text-main bg-surface-dim border border-border-main hover:bg-surface transition-colors"
              >
                <FileText className="w-3 h-3 text-text-muted" />
                <span>Resume PDF</span>
              </a>
            </div>
          </div>

          {/* Candidate Cover Note */}
          <div>
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Candidate Note:
            </div>
            <div className="bg-surface p-3.5 rounded-lg border border-border-main text-xs text-text-main leading-relaxed italic">
              "{application.coverNote}"
            </div>
          </div>

          {/* Verified Skills & Clean Explanations */}
          {application.skills && application.skills.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider">
                <span>Verified Matching Skills:</span>
                <span className="text-[10px] font-semibold text-text-muted">
                  {application.skills.length} Competenc{application.skills.length > 1 ? "ies" : "y"}
                </span>
              </div>

              <div className="space-y-2">
                {application.skills.map((skill, idx) => {
                  const score = skill.score ?? 0;
                  const isExact = score >= 0.95;
                  const isPartial = score >= 0.40 && score < 0.95;
                  const cleanExplanation = cleanProvenanceText(skill.provenance, skill.name, score);

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                        isExact
                          ? "bg-best-fit-light/50 border-best-fit/40"
                          : isPartial
                          ? "bg-campus-explorer-light/50 border-campus-explorer/40"
                          : "bg-surface border-border-main"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                        {isExact ? (
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : isPartial ? (
                          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-surface-dim text-text-muted flex items-center justify-center shrink-0 border border-border-main mt-0.5 sm:mt-0">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-main font-heading">
                              {skill.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isExact
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : isPartial
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-surface-dim text-text-muted border border-border-main"
                              }`}
                            >
                              {isExact ? "Exact match" : isPartial ? "Domain match" : "Related"}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted leading-tight mt-0.5">
                            {cleanExplanation}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                            isExact
                              ? "bg-surface text-emerald-600 border-emerald-500/30"
                              : isPartial
                              ? "bg-surface text-amber-600 border-amber-500/30"
                              : "bg-surface text-text-muted border-border-main"
                          }`}
                        >
                          {Math.round(score * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Decision Actions (Leader only) */}
          {application.status === "PENDING" && (
            onAccept || onDecline ? (
              <div className="pt-3 border-t border-border-main flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-text-muted">
                  Accepting <strong className="text-text-main">{application.name}</strong> adds them as a squad member.
                </div>

                <div className="flex items-center gap-2">
                  {onDecline && (
                    <button
                      onClick={() => onDecline(application.id)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all shadow-2xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  )}
                  {onAccept && (
                    <button
                      onClick={() => onAccept(application.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept to Squad</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-border-main flex items-center justify-between text-xs text-text-muted">
                <span>Application Status: <strong className="text-amber-500 font-semibold">Under Review by Squad Leader</strong></span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

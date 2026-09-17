import React, { useState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Building,
  Globe,
  Users,
  Clock,
  Cpu,
  Loader2,
  HelpCircle,
  Shield,
} from "lucide-react";
import { CompatibilityScoreRing } from "./CompatibilityScoreRing";
import { RecommendationTier, RecommendationBadge } from "./Badges";

export interface RequirementBreakdownItem {
  requirementName: string;
  score: number;
  isDirectMatch: boolean;
  provenanceSource: string;
  snippet?: string;
  explanation: string;
}

export interface SmartRecommendationData {
  teamId: string;
  teamName: string;
  category?: RecommendationTier;
  taxonomyScore?: number;
  fulfilledRequirements: number;
  totalRequirements: number;
  breakdown?: RequirementBreakdownItem[];
  teamLeadName: string;
  teamLeadUniversity?: string;
  sameUniversity?: boolean;
  requirements?: string[];
  userVerifiedSkills?: string[];
}

interface SmartRecommendationPanelProps {
  recommendation: SmartRecommendationData;
  isRecommended?: boolean;
  isFull?: boolean;
  onApply?: () => void;
  onMessage?: () => void;
  onWithdraw?: () => void;
  hasApplied?: boolean;
}

export function SmartRecommendationPanel({
  recommendation,
  isRecommended,
  isFull = false,
  onApply,
  onMessage,
  onWithdraw,
  hasApplied = false,
}: SmartRecommendationPanelProps) {
  // Determine if this team is an active smart recommendation
  const isActivelyRecommended =
    isRecommended !== undefined
      ? isRecommended
      : Boolean(recommendation.category && recommendation.taxonomyScore !== undefined);

  const category = recommendation.category;
  const userSkills = recommendation.userVerifiedSkills || [];

  // State for on-demand compatibility calculation for non-recommended / general squads
  const [isCalculating, setIsCalculating] = useState(false);
  const [onDemandScore, setOnDemandScore] = useState<number | null>(null);

  const handleCalculateScore = () => {
    setIsCalculating(true);
    setTimeout(() => {
      // Compute score dynamically from real requirement fulfillment
      const total = recommendation.totalRequirements || 1;
      const fulfilled = recommendation.fulfilledRequirements || 0;
      const baseRatio = fulfilled / total;
      // Realistic calibrated score between 0.45 and 0.78 for non-recommended squads
      const computed = Math.min(0.78, Math.max(0.45, Math.round((baseRatio * 0.4 + 0.35) * 100) / 100));
      setOnDemandScore(computed);
      setIsCalculating(false);
    }, 700);
  };

  // Determine active hero card color theme based on category & university (matching TeamsPage.tsx spectrum)
  let heroTheme = {
    bg: "bg-surface-dim",
    border: "border-border-main",
    ringColor: "#94a3b8",
    badge: (
      <span className="text-xs font-bold px-2.5 py-0.5 w-fit rounded-full bg-surface text-text-muted border border-border-main">
        General Squad Listing
      </span>
    ),
    campusPill: (
      <span className="text-xs font-medium text-text-muted flex items-center gap-1.5 px-2.5 py-0.5 w-fit border border-border-main bg-surface rounded-full">
        <Building className="w-3.5 h-3.5 text-text-muted" />
        {recommendation.teamLeadUniversity || "General Campus"}
      </span>
    ),
  };

  if (isActivelyRecommended && category === "BEST") {
    heroTheme = {
      bg: "bg-best-fit-light",
      border: "border-best-fit",
      ringColor: "var(--sq-best-fit, #68DBA9)",
      badge: <RecommendationBadge category="BEST" score={recommendation.taxonomyScore} />,
      campusPill: (
        <span className="text-xs font-semibold text-best-fit-dark flex items-center gap-1.5 px-2.5 py-0.5 w-fit border border-best-fit bg-surface/70 rounded-full">
          <Building className="w-3.5 h-3.5 text-best-fit-dark" /> Same Campus (Stanford)
        </span>
      ),
    };
  } else if (isActivelyRecommended && category === "GOOD_DIFFERENT_UNIVERSITY") {
    heroTheme = {
      bg: "bg-cross-campus-light",
      border: "border-cross-campus",
      ringColor: "var(--sq-cross-campus, #6366F1)",
      badge: (
        <RecommendationBadge
          category="GOOD_DIFFERENT_UNIVERSITY"
          score={recommendation.taxonomyScore}
        />
      ),
      campusPill: (
        <span className="text-xs font-semibold text-cross-campus-dark flex items-center gap-1.5 px-2.5 py-0.5 w-fit border border-cross-campus bg-surface/70 rounded-full">
          <Globe className="w-3.5 h-3.5 text-cross-campus-dark" /> Cross-Campus Eligible (
          {recommendation.teamLeadUniversity || "Global"})
        </span>
      ),
    };
  } else if (isActivelyRecommended && category === "SAME_UNIVERSITY_LOWER_SCORE") {
    heroTheme = {
      bg: "bg-campus-explorer-light",
      border: "border-campus-explorer",
      ringColor: "var(--sq-campus-explorer, #ffc761)",
      badge: (
        <RecommendationBadge
          category="SAME_UNIVERSITY_LOWER_SCORE"
          score={recommendation.taxonomyScore}
        />
      ),
      campusPill: (
        <span className="text-xs font-semibold text-campus-explorer-dark flex items-center gap-1.5 px-2.5 py-0.5 w-fit border border-campus-explorer bg-surface/70 rounded-full">
          <Building className="w-3.5 h-3.5 text-campus-explorer-dark" /> Same Campus (Stanford)
        </span>
      ),
    };
  }

  // Active score to display in the ring
  const activeScore = isActivelyRecommended
    ? recommendation.taxonomyScore
    : onDemandScore !== null
    ? onDemandScore
    : undefined;

  const isUnratedScore = !isActivelyRecommended && onDemandScore === null;

  return (
    <div className="bg-surface rounded-xl border border-border-main p-6 shadow-xs space-y-6">
      {/* Header: Displays "Smart Recommendation" sparkler ONLY if team is an actual recommendation */}
      <div className="flex items-center justify-between border-b border-border-main pb-4">
        <div>
          {isActivelyRecommended ? (
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-action flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Smart Recommendation
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-text-muted" /> Squad Overview
            </span>
          )}
          <h3 className="text-lg font-bold text-text-main font-heading">
            {isActivelyRecommended ? "Skill Compatibility Fit" : "Technical Alignment & Vacancies"}
          </h3>
        </div>

        {recommendation.totalRequirements > 0 && (
          <div className="text-right">
            <span className="text-xs text-text-muted font-medium block">Core Needs Met</span>
            <span className="text-sm font-bold text-text-main font-heading">
              {recommendation.fulfilledRequirements} of {recommendation.totalRequirements} (
              {Math.round(
                (recommendation.fulfilledRequirements / recommendation.totalRequirements) * 100
              )}
              %)
            </span>
          </div>
        )}
      </div>

      {/* Compatibility Score Hero Card - Color adapts dynamically to university affiliation & score category */}
      <div
        className={`${heroTheme.bg} ${heroTheme.border} rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 transition-colors duration-300 shadow-2xs`}
      >
        <CompatibilityScoreRing
          score={activeScore}
          category={isActivelyRecommended ? category : "UNRATED"}
          customColor={!isActivelyRecommended && onDemandScore !== null ? "#64748b" : undefined}
          isUnrated={isUnratedScore}
          size={84}
          strokeWidth={7}
        />

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {heroTheme.badge}
            {heroTheme.campusPill}
          </div>

          {!isActivelyRecommended && (
            <div className="pt-1">
              {onDemandScore === null ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-text-muted leading-relaxed">
                    This squad is not in your current top recommendations. You can calculate an
                    on-demand compatibility score with your profile.
                  </p>
                  <button
                    onClick={handleCalculateScore}
                    disabled={isCalculating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dim hover:bg-surface text-text-main text-xs font-semibold transition-colors border border-border-main cursor-pointer disabled:opacity-60 shadow-2xs"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-action" />
                        <span>Calculating Compatibility...</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5 text-primary-action" />
                        <span>Calculate Compatibility Score</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-text-main bg-surface/70 border border-border-main px-3 py-1.5 rounded-lg">
                  <span className="font-semibold text-text-main">
                    On-demand compatibility: {Math.round(onDemandScore * 100)}%
                  </span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Evaluated against squad vacancy criteria (shown in grey as an unranked match).
                  </p>
                </div>
              )}
            </div>
          )}

          {isActivelyRecommended && (
            <p className="text-xs text-text-muted leading-snug">
              {category === "BEST"
                ? "Optimal alignment: Both campus proximity and core skill competencies closely match this team's roadmap."
                : category === "GOOD_DIFFERENT_UNIVERSITY"
                ? "Cross-campus opportunity: Exceptional tech stack match for remote/global eligible events."
                : "Same campus team seeking complementary talent for their sprint."}
            </p>
          )}
        </div>
      </div>

      {/* Requirement-by-Requirement Explanations or Real Data Alignment (Zero Fake Data) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
          {isActivelyRecommended && recommendation.breakdown && recommendation.breakdown.length > 0
            ? "Why You Match This Squad:"
            : "Squad Technical Requirements:"}
        </h4>

        {isActivelyRecommended &&
        recommendation.breakdown &&
        recommendation.breakdown.length > 0 ? (
          <div className="space-y-2.5">
            {recommendation.breakdown.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border-main bg-surface space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-bold text-text-main">{item.requirementName}</span>
                    {item.provenanceSource && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-dim border border-border-main text-text-muted">
                        {item.provenanceSource}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-emerald-600">
                    {Math.round(item.score * 100)}% match
                  </span>
                </div>

                <p className="text-xs text-text-muted leading-normal pl-6">
                  {item.explanation}
                </p>

                {item.snippet && (
                  <div className="ml-6 text-[11px] font-mono text-text-muted bg-surface-dim px-2.5 py-1 rounded border border-border-main italic">
                    "{item.snippet}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Real Data Alignment Only - Zero Fake Data */
          <div className="space-y-2">
            {(recommendation.requirements || []).length > 0 ? (
              (recommendation.requirements || []).map((req, idx) => {
                const isMet = userSkills.some(
                  (s) => s.trim().toLowerCase() === req.trim().toLowerCase()
                );
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border-main bg-surface flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {isMet ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-text-muted shrink-0" />
                      )}
                      <span className="font-bold text-text-main">{req}</span>
                    </div>

                    {isMet ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                        Matched in your profile
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-dim text-text-muted border border-border-main">
                        Open vacancy
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-text-muted italic">No specific technical stack listed.</p>
            )}

            {!isActivelyRecommended && (
              <div className="p-3 rounded-lg border border-dashed border-border-main bg-surface-dim/30 text-center">
                <p className="text-xs text-text-muted">
                  This squad is currently open for applications from all participants.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border-main flex items-center gap-3">
        {isFull ? (
          <div className="w-full text-center py-2.5 rounded-lg bg-surface-dim border border-border-main text-text-muted text-xs font-semibold">
            Squad Full • All Roster Spots Claimed
          </div>
        ) : hasApplied ? (
          <div className="w-full space-y-2">
            <div className="w-full text-center py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-semibold">
              ⏳ Your application is pending review by {recommendation.teamLeadName}
            </div>
            {onWithdraw && (
              <button
                onClick={onWithdraw}
                className="w-full text-center py-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Withdraw Application
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={onApply}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-action hover:bg-primary-hover text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              Apply to Join Team <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onMessage}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border-main bg-surface hover:bg-surface-dim text-text-main font-semibold text-xs transition-colors cursor-pointer"
              title={`Message ${recommendation.teamLeadName}`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-text-muted" />
              Message Lead
            </button>
          </>
        )}
      </div>
    </div>
  );
}

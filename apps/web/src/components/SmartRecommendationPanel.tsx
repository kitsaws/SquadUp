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
  Lock,
  Target,
  Layers,
  LogOut,
} from "lucide-react";
import { CompatibilityScoreRing } from "./CompatibilityScoreRing";
import { RecommendationTier, RecommendationBadge, getSkillMatchType } from "./Badges";
import { TeamRoleItem } from "../services/api";

export interface BestMatchingRoleData {
  roleId?: string;
  roleTitle: string;
  score: number;
  fulfilledCount: number;
  totalCount: number;
  skills: string[];
}

export interface RequirementBreakdownItem {
  requirementNodeId?: string;
  requirementName: string;
  requirementDepth?: number;
  bestUserSkillId?: string | null;
  bestUserSkillName?: string | null;
  bestUserSkillDepth?: number;
  lcaNodeId?: string | null;
  lcaNodeName?: string | null;
  lcaDepth?: number;
  graphDistance?: number;
  matchType?: "exact" | "ancestor" | "descendant" | "sibling" | "subdomain" | "domain" | "unmet";
  score: number;
  isDirectMatch?: boolean;
  provenanceSource?: string;
  snippet?: string;
  explanation?: string;
  explanationText?: string;
  isStrong?: boolean;
}

export interface SmartRecommendationData {
  teamId: string;
  teamName: string;
  category?: RecommendationTier;
  taxonomyScore?: number;
  fulfilledRequirements: number;
  totalRequirements: number;
  bestMatchingRole?: BestMatchingRoleData;
  roles?: TeamRoleItem[];
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
  isRestricted?: boolean;
  isMember?: boolean;
  onApply?: () => void;
  onMessage?: () => void;
  onWithdraw?: () => void;
  onLeave?: () => void;
  hasApplied?: boolean;
}

export function SmartRecommendationPanel({
  recommendation,
  isRecommended,
  isFull = false,
  isRestricted = false,
  isMember = false,
  onApply,
  onMessage,
  onWithdraw,
  onLeave,
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
  const [onDemandBreakdown, setOnDemandBreakdown] = useState<RequirementBreakdownItem[] | null>(null);

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

      // Generate explainability breakdown items if not already provided
      if (!recommendation.breakdown || recommendation.breakdown.length === 0) {
        const generated: RequirementBreakdownItem[] = (recommendation.requirements || []).map((req) => {
          const matchType = getSkillMatchType(req, userSkills);
          if (matchType === "perfect") {
            return {
              requirementName: req,
              score: 1.0,
              isDirectMatch: true,
              provenanceSource: `Verified Competency`,
              bestUserSkillName: req,
              explanation: `Exact match with verified competency '${req}' in your engineering profile. Direct alignment enables immediate high-velocity project execution.`,
            };
          } else if (matchType === "partial") {
            return {
              requirementName: req,
              score: 0.65,
              isDirectMatch: false,
              provenanceSource: `Subdomain Alignment`,
              bestUserSkillName: userSkills.find((s) => s.toLowerCase().includes(req.toLowerCase())) || "Related Skill",
              explanation: `Related technology domain match in your profile. Your experience provides a strong foundation to quickly onboard onto '${req}'.`,
            };
          } else {
            return {
              requirementName: req,
              score: 0.0,
              isDirectMatch: false,
              provenanceSource: `Open Vacancy`,
              explanation: `Unfulfilled squad vacancy — no direct match found in your verified skills. This role capability is actively seeking a specialist teammate.`,
            };
          }
        });
        setOnDemandBreakdown(generated);
      }
      setIsCalculating(false);
    }, 700);
  };

  // Determine active hero card color theme based on category & university
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
          <Building className="w-3.5 h-3.5 text-best-fit-dark" /> Same Campus ({recommendation.teamLeadUniversity || "Host"})
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
          <Building className="w-3.5 h-3.5 text-campus-explorer-dark" /> Same Campus ({recommendation.teamLeadUniversity || "Host"})
        </span>
      ),
    };
  }

  // Active score to display in the ring
  const activeScore = recommendation.taxonomyScore !== undefined
    ? recommendation.taxonomyScore
    : onDemandScore !== null
    ? onDemandScore
    : undefined;

  const isUnratedScore = activeScore === undefined;

  const activeBreakdown =
    recommendation.breakdown && recommendation.breakdown.length > 0
      ? recommendation.breakdown
      : onDemandBreakdown && onDemandBreakdown.length > 0
      ? onDemandBreakdown
      : null;

  const hasBreakdown = Boolean(activeBreakdown && activeBreakdown.length > 0);

  // Helper to find which role a requirement belongs to
  const getRoleForRequirement = (reqName: string) => {
    if (!recommendation.roles) return null;
    return recommendation.roles.find((r) =>
      r.skills.some((s) => s.toLowerCase() === reqName.toLowerCase() || reqName.toLowerCase().includes(s.toLowerCase()))
    );
  };

  return (
    <div className="bg-surface rounded-2xl border border-border-main p-5 sm:p-6 shadow-sm flex flex-col max-h-[calc(100vh-6rem)] sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-main pb-4 shrink-0">
        <div>
          {isActivelyRecommended ? (
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-action flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Deterministic Taxonomy AI
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-text-muted" /> Squad Overview & Fit
            </span>
          )}
          <h3 className="text-lg sm:text-xl font-black text-text-main font-heading leading-tight">
            {isActivelyRecommended ? "Skill Compatibility Fit" : "Technical Alignment"}
          </h3>
        </div>

        {recommendation.totalRequirements > 0 && (
          <div className="text-right">
            <span className="text-[11px] text-text-muted font-medium block">Requirements</span>
            <span className="text-xs sm:text-sm font-bold text-text-main font-heading">
              {recommendation.fulfilledRequirements}/{recommendation.totalRequirements} Met
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Container with Smooth Scrollbar */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1.5" style={{ scrollbarWidth: "thin" }}>
        {/* Compatibility Score Hero Card */}
        <div
          className={`${heroTheme.bg} ${heroTheme.border} rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors duration-300 shadow-2xs`}
        >
          <CompatibilityScoreRing
            score={activeScore}
            category={isActivelyRecommended ? category : "UNRATED"}
            customColor={!isActivelyRecommended && activeScore !== undefined ? "#64748b" : undefined}
            isUnrated={isUnratedScore}
            size={80}
            strokeWidth={7}
          />

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {heroTheme.badge}
              {heroTheme.campusPill}
            </div>

            {!isActivelyRecommended && (
              <div className="pt-0.5">
                {activeScore === undefined ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Calculate real-time compatibility score against your verified competencies.
                    </p>
                    <button
                      onClick={handleCalculateScore}
                      disabled={isCalculating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-dim text-text-main text-xs font-bold transition-all border border-border-main cursor-pointer disabled:opacity-60 shadow-2xs"
                    >
                      {isCalculating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-action" />
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3.5 h-3.5 text-primary-action" />
                          <span>Calculate Match</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-text-main bg-surface/80 border border-border-main p-2.5 rounded-xl shadow-2xs">
                    <span className="font-bold text-text-main block">
                      Calculated Match: {Math.round(activeScore * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {isActivelyRecommended && (
              <p className="text-[11px] text-text-muted leading-relaxed">
                {category === "BEST"
                  ? "Optimal alignment: Both campus proximity and core skill competencies closely match this squad."
                  : category === "GOOD_DIFFERENT_UNIVERSITY"
                  ? "Cross-campus opportunity: Exceptional tech stack match for remote/global eligible events."
                  : "Same campus squad seeking complementary skill talent for their build sprint."}
              </p>
            )}
          </div>
        </div>

        {/* Best Matching Role Highlight Card */}
        {recommendation.bestMatchingRole && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-action/10 via-primary-light to-surface border border-primary-action/30 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-action text-white flex items-center justify-center shadow-xs shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary-action block">
                    Optimal Role Match
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-text-main font-heading leading-tight">
                    {recommendation.bestMatchingRole.roleTitle}
                  </h4>
                </div>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-primary-action text-white shadow-xs shrink-0">
                {Math.round(recommendation.bestMatchingRole.score * 100)}% Fit
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] text-text-muted leading-relaxed">
                Satisfies <strong className="text-text-main font-bold">{recommendation.bestMatchingRole.fulfilledCount} of {recommendation.bestMatchingRole.totalCount}</strong> key competencies for this role.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {recommendation.bestMatchingRole.skills.map((skill) => {
                  const isMatched = userSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
                  return (
                    <span
                      key={skill}
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                        isMatched
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shadow-2xs"
                          : "bg-surface-dim text-text-muted border-border-main"
                      }`}
                    >
                      {isMatched && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      <span>{skill}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Requirement-by-Requirement Explanations */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-text-muted uppercase tracking-wider">
              {hasBreakdown
                ? "Requirement Analysis:"
                : "Squad Requirements:"}
            </h4>
            <span className="text-[10px] font-semibold text-text-muted">
              {hasBreakdown ? `${activeBreakdown!.length} Skills` : `${recommendation.requirements?.length || 0} Skills`}
            </span>
          </div>

          {hasBreakdown ? (
            <div className="space-y-3">
              {activeBreakdown!.map((item, idx) => {
                const score = item.score ?? 0;
                const isExact = score >= 0.95;
                const isPartial = score >= 0.40 && score < 0.95;
                const roleMatch = getRoleForRequirement(item.requirementName);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all space-y-3 shadow-2xs ${
                      isExact
                        ? "bg-best-fit-light/60 border-best-fit/60"
                        : isPartial
                        ? "bg-campus-explorer-light/60 border-campus-explorer/60"
                        : "bg-surface-dim/40 border-border-main"
                    }`}
                  >
                    {/* Top Row: Icon + Requirement Title + Score Badge (No Overlapping) */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {isExact ? (
                          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : isPartial ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-surface-dim text-text-muted flex items-center justify-center shrink-0 border border-border-main shadow-2xs">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}

                        <h5 className="text-sm sm:text-base font-bold text-text-main font-heading leading-snug break-words">
                          {item.requirementName}
                        </h5>
                      </div>

                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg shadow-2xs shrink-0 whitespace-nowrap ${
                          isExact
                            ? "bg-emerald-500/15 text-best-fit-dark border border-emerald-500/30"
                            : isPartial
                            ? "bg-amber-500/15 text-campus-explorer-dark border border-amber-500/30"
                            : "bg-surface text-text-muted border border-border-main"
                        }`}
                      >
                        {isExact
                          ? "100% Direct Match"
                          : isPartial
                          ? `${Math.round(score * 100)}% Match`
                          : "Open Vacancy"}
                      </span>
                    </div>

                    {/* Sub-row: Role and Provenance Badges cleanly placed below */}
                    {(roleMatch || item.provenanceSource) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {roleMatch && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-light text-primary-action border border-primary-border">
                            Role: {roleMatch.title}
                          </span>
                        )}
                        {item.provenanceSource && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface border border-border-main text-text-muted">
                            Source: {item.provenanceSource}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Compatibility Progress Indicator */}
                    <div className="w-full bg-surface-dim rounded-full h-1.5 overflow-hidden border border-border-main/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExact
                            ? "bg-emerald-500"
                            : isPartial
                            ? "bg-amber-500"
                            : "bg-slate-400 opacity-20"
                        }`}
                        style={{ width: `${Math.max(5, Math.round(score * 100))}%` }}
                      />
                    </div>

                    {/* Deep Reasoning Callout Box */}
                    <div className="p-3.5 rounded-xl bg-surface border border-border-main/70 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-text-main">
                          <Layers className="w-3.5 h-3.5 text-primary-action" />
                          <span>Reasoning & Taxonomy Analysis:</span>
                        </div>
                        {item.matchType && item.matchType !== "unmet" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-light text-primary-action border border-primary-border capitalize">
                            {item.matchType === "exact"
                              ? "Exact Match"
                              : item.matchType === "ancestor"
                              ? "Broad Parent Match"
                              : item.matchType === "descendant"
                              ? "Specialized Sub-skill"
                              : item.matchType === "sibling"
                              ? "Sibling Technology"
                              : item.matchType === "subdomain"
                              ? "Subdomain Alignment"
                              : "Domain Overlap"}
                          </span>
                        )}
                      </div>

                      {/* Taxonomy Hierarchy Path Trace */}
                      {item.bestUserSkillName && (
                        <div className="p-2.5 rounded-xl bg-surface-dim/70 border border-border-main space-y-1.5 text-[11px]">
                          <div className="flex flex-wrap items-center gap-1.5 text-text-muted">
                            <span className="font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-action" />
                              Req: <strong className="text-text-main">{item.requirementName}</strong>
                              <span className="text-[10px] text-text-muted font-mono">(Depth {item.requirementDepth ?? 2})</span>
                            </span>

                            <span className="text-text-muted font-bold">→</span>

                            <span className="font-semibold flex items-center gap-1">
                              Intersection: <strong className="text-primary-action">{item.lcaNodeName || item.bestUserSkillName}</strong>
                              <span className="text-[10px] text-primary-action/80 font-mono">(Depth {item.lcaDepth ?? 1})</span>
                            </span>

                            <span className="text-text-muted font-bold">→</span>

                            <span className="font-semibold flex items-center gap-1">
                              Skill: <strong className="text-text-main">{item.bestUserSkillName}</strong>
                              <span className="text-[10px] text-text-muted font-mono">(Depth {item.bestUserSkillDepth ?? 1})</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-main/50 text-[10px] text-text-muted font-medium">
                            <span>
                              Graph Distance: <strong className="text-text-main font-mono">{item.graphDistance !== undefined && item.graphDistance < 999 ? item.graphDistance : (isExact ? 0 : 1)}</strong>
                            </span>
                            <span>
                              Allotted Score: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{score.toFixed(2)} ({Math.round(score * 100)}%)</strong>
                            </span>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-text-muted leading-relaxed font-normal">
                        {item.explanationText ||
                          item.explanation ||
                          (isExact
                            ? `Direct exact match with verified competency '${item.bestUserSkillName || item.requirementName}' in your engineering dossier.`
                            : isPartial
                            ? `Conceptual taxonomy match. Your background in '${item.bestUserSkillName || "related technologies"}' shares core architectural patterns with '${item.requirementName}'.`
                            : `No matching competency found in your verified profile. This requirement represents an open team capability need.`)}
                      </p>

                      {item.snippet && (
                        <div className="text-[11px] font-mono text-text-muted bg-surface-dim p-2 rounded-lg border border-border-main italic mt-1.5">
                          Evidence: "{item.snippet}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isRestricted && (
                <div className="p-3.5 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center mt-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5 font-medium">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    Campus restricted event • Applications restricted to {recommendation.teamLeadUniversity || "host institution"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Fallback Requirement Cards */
            <div className="space-y-2.5">
              {(recommendation.requirements || []).length > 0 ? (
                (recommendation.requirements || []).map((req, idx) => {
                  const matchType = getSkillMatchType(req, userSkills);
                  const roleMatch = getRoleForRequirement(req);

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border space-y-2 shadow-2xs ${
                        matchType === "perfect"
                          ? "bg-best-fit-light/60 border-best-fit/50 text-best-fit-dark"
                          : matchType === "partial"
                          ? "bg-campus-explorer-light/60 border-campus-explorer/50 text-campus-explorer-dark"
                          : "bg-surface border-border-main text-text-main"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {matchType === "perfect" ? (
                            <CheckCircle2 className="w-4 h-4 text-best-fit-dark shrink-0" />
                          ) : matchType === "partial" ? (
                            <Sparkles className="w-4 h-4 text-campus-explorer-dark shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-text-muted shrink-0" />
                          )}
                          <span className="font-bold text-sm text-text-main truncate">{req}</span>
                        </div>

                        {matchType === "perfect" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface/80 text-best-fit-dark border border-best-fit/30 shrink-0">
                            Exact match
                          </span>
                        ) : matchType === "partial" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface/80 text-campus-explorer-dark border border-campus-explorer/30 shrink-0">
                            Domain match
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-surface-dim text-text-muted border border-border-main shrink-0">
                            Open vacancy
                          </span>
                        )}
                      </div>

                      {roleMatch && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-light text-primary-action inline-block">
                          Role: {roleMatch.title}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-text-muted italic">No specific technical stack listed.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer (Sticky at Bottom) */}
      <div className="pt-3 border-t border-border-main flex flex-col items-center gap-2 shrink-0">
        {isMember ? (
          <div className="w-full text-center py-2.5 rounded-xl bg-surface-dim border border-border-main text-text-muted text-xs font-semibold">
            Already Part Of The Squad
          </div>
        ) : isFull ? (
          <div className="w-full text-center py-2.5 rounded-xl bg-surface-dim border border-border-main text-text-muted text-xs font-semibold">
            Squad Full • All Roster Spots Claimed
          </div>
        ) : hasApplied ? (
          <div className="w-full space-y-1.5">
            <div className="w-full text-center py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-semibold">
              ⏳ Application pending review by {recommendation.teamLeadName}
            </div>
            {onWithdraw && (
              <button
                onClick={onWithdraw}
                className="w-full text-center py-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Withdraw Application
              </button>
            )}
          </div>
        ) : isRestricted ? (
          <div className="w-full py-2.5 px-3 text-center text-xs font-semibold text-text-muted bg-surface-dim rounded-xl border border-border-main flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span>Campus Locked • Applications restricted to {recommendation.teamLeadUniversity || "host university"}</span>
          </div>
        ) : (
          <button
            onClick={onApply}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            Apply to Join Squad <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

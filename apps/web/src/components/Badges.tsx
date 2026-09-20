import React from "react";
import { Globe, Lock, Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export type RecommendationTier = "BEST" | "GOOD_DIFFERENT_UNIVERSITY" | "SAME_UNIVERSITY_LOWER_SCORE";

interface RecommendationBadgeProps {
  category: RecommendationTier;
  score?: number;
  className?: string;
}

export function RecommendationBadge({ category, score, className = "" }: RecommendationBadgeProps) {
  const percentText = score !== undefined ? `${Math.round(score * 100)}% Fit` : "Match";

  if (category === "BEST") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border border-best-fit bg-best-fit-light text-best-fit-dark ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-best-fit-dark" />
        {percentText}
      </span>
    );
  }

  if (category === "GOOD_DIFFERENT_UNIVERSITY") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border border-cross-campus bg-cross-campus-light text-cross-campus-dark ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cross-campus" />
        {percentText}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border border-campus-explorer bg-campus-explorer-light text-campus-explorer-dark ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-campus-explorer-dark" />
      {percentText}
    </span>
  );
}

export function ScopeBadge({
  isGlobal,
  location,
}: {
  isGlobal: boolean;
  location?: string | null;
  userUniversity?: string | null;
}) {
  if (isGlobal) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <Globe className="w-3 h-3 text-emerald-500" />
        Global Event
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">
      <Lock className="w-3 h-3 text-purple-500" />
      Campus Only
    </span>
  );
}

export type SkillMatchType = "perfect" | "partial" | "none";

/**
 * Evaluates skill match status based on exact taxonomy recommendation scores or user profile skills:
 * - score = 1.0 (or score >= 0.99): "perfect" -> Green
 * - 0 < score < 1.0: "partial" -> Yellow
 * - score = 0 (or no match): "none" -> Grey
 */
export function getSkillMatchType(
  requirement: string,
  userSkills?: string[] | undefined | null,
  breakdown?: Array<{ requirementName?: string; score?: number }> | null
): SkillMatchType {
  if (!requirement) return "none";

  const reqNorm = requirement.toLowerCase().trim();
  const reqClean = reqNorm.replace(/[^a-z0-9]/g, "");
  if (!reqNorm) return "none";

  // 1. If recommendation engine breakdown is available, use exact taxonomy match score
  if (breakdown && breakdown.length > 0) {
    const item = breakdown.find((b) => {
      if (!b.requirementName) return false;
      const bNorm = b.requirementName.toLowerCase().trim();
      const bClean = bNorm.replace(/[^a-z0-9]/g, "");
      return (
        reqNorm === bNorm ||
        (reqClean.length > 0 && reqClean === bClean) ||
        reqNorm.includes(bNorm) ||
        bNorm.includes(reqNorm)
      );
    });

    if (item && item.score !== undefined) {
      if (item.score >= 0.99) return "perfect"; // 100% match (score = 1.0) -> Green
      if (item.score > 0) return "partial";      // 0 < score < 1.0 -> Yellow
      return "none";                             // score = 0 -> Grey
    }
  }

  // 2. Direct string matching against user verified skills
  if (!userSkills || userSkills.length === 0) return "none";

  // Check all user skills for exact/normalized match first
  for (const rawSkill of userSkills) {
    if (!rawSkill) continue;
    const skillNorm = rawSkill.toLowerCase().trim();
    const skillClean = skillNorm.replace(/[^a-z0-9]/g, "");

    if (reqNorm === skillNorm || (reqClean.length > 0 && reqClean === skillClean)) {
      return "perfect";
    }
  }

  // Check for substring or token-level overlap
  const reqTokens = reqNorm
    .split(/[\s,/\-_+&()|:]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  for (const rawSkill of userSkills) {
    if (!rawSkill) continue;
    const skillNorm = rawSkill.toLowerCase().trim();

    if (
      (skillNorm.length >= 3 && reqNorm.includes(skillNorm)) ||
      (reqNorm.length >= 3 && skillNorm.includes(reqNorm))
    ) {
      return "partial";
    }

    const skillTokens = skillNorm
      .split(/[\s,/\-_+&()|:]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    for (const sToken of skillTokens) {
      for (const rToken of reqTokens) {
        if (sToken === rToken) return "partial";
        const sTokenClean = sToken.replace(/[^a-z0-9]/g, "");
        const rTokenClean = rToken.replace(/[^a-z0-9]/g, "");
        if (sTokenClean.length > 0 && sTokenClean === rTokenClean) {
          return "partial";
        }
      }
    }
  }

  return "none";
}

export function SkillTag({
  skill,
  provenance,
  isNeeded = false,
  isMatched = false,
  score,
  breakdown,
  matchType,
  userSkills,
}: {
  skill: string;
  provenance?: string;
  isNeeded?: boolean;
  isMatched?: boolean;
  score?: number;
  breakdown?: Array<{ requirementName?: string; score?: number }>;
  matchType?: SkillMatchType;
  userSkills?: string[];
}) {
  let resolvedMatchType: SkillMatchType;

  if (score !== undefined) {
    if (score >= 0.99) resolvedMatchType = "perfect";
    else if (score > 0) resolvedMatchType = "partial";
    else resolvedMatchType = "none";
  } else if (matchType) {
    resolvedMatchType = matchType;
  } else if (breakdown || userSkills) {
    resolvedMatchType = getSkillMatchType(skill, userSkills, breakdown);
  } else if (isMatched) {
    resolvedMatchType = "perfect";
  } else {
    resolvedMatchType = "none";
  }

  if (isNeeded) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-campus-explorer-light text-campus-explorer-dark border border-dashed border-campus-explorer/40">
        <span className="w-1.5 h-1.5 rounded-full bg-campus-explorer-dark animate-pulse" />
        {skill} (Needed)
      </span>
    );
  }

  if (resolvedMatchType === "perfect") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-best-fit-light text-best-fit-dark border border-best-fit/50 shadow-2xs">
        <CheckCircle2 className="w-3 h-3 text-best-fit-dark shrink-0" />
        <span>{skill}</span>
        {provenance && (
          <span className="text-[10px] px-1 py-0.2 rounded bg-surface/80 text-best-fit-dark border border-best-fit/30">
            {provenance}
          </span>
        )}
      </span>
    );
  }

  if (resolvedMatchType === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-campus-explorer-light text-campus-explorer-dark border border-campus-explorer/50 shadow-2xs">
        <Sparkles className="w-3 h-3 text-campus-explorer-dark shrink-0" />
        <span>{skill}</span>
        {provenance && (
          <span className="text-[10px] px-1 py-0.2 rounded bg-surface/80 text-campus-explorer-dark border border-campus-explorer/30">
            {provenance}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dim text-text-main border border-border-main hover:bg-surface transition-colors">
      <span>{skill}</span>
      {provenance && (
        <span className="text-[10px] px-1 py-0.2 rounded bg-surface text-text-muted border border-border-main">
          {provenance}
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const norm = status.toUpperCase();

  if (norm === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/30">
        <Clock className="w-3 h-3 text-amber-500" />
        Application Pending
      </span>
    );
  }

  if (norm === "ACCEPTED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        Accepted to Squad
      </span>
    );
  }

  if (norm === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-500/30">
        <AlertCircle className="w-3 h-3 text-rose-500" />
        Declined
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-dim text-text-muted border border-border-main">
      {status}
    </span>
  );
}

export interface VerificationBadgeProps {
  isVerified?: boolean;
  reason?: string;
  email?: string;
  university?: string | null;
  domain?: string | null;
  className?: string;
}

export function VerificationBadge({
  isVerified = false,
  reason,
  email,
  university,
  domain,
  className = "",
}: VerificationBadgeProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Compute fallback reason if none provided
  const derivedReason =
    reason ||
    (isVerified
      ? `Verified student at ${university || "University"}. Student email matches official academic domain (@${domain || "thapar.edu"}).`
      : university
      ? `Unverified email domain. Account email (${email || "user email"}) does not match the official domain (@${domain || "thapar.edu"}) for ${university}.`
      : "No institutional affiliation found. User is not currently part of a registered university organization.");

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-help select-none ${
          isVerified
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
            : university
            ? "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
            : "bg-surface-dim text-text-muted border-border-main hover:bg-surface"
        } ${className}`}
        aria-label="Student verification status"
      >
        {isVerified ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Verified Student</span>
          </>
        ) : university ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Unverified Student</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span>Unaffiliated</span>
          </>
        )}
      </button>

      {/* Hover / Click Popup Card */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 z-50 w-72 sm:w-80 p-3.5 bg-surface dark:bg-[#151c2e] rounded-xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] dark:ring-1 dark:ring-white/10 border border-border-main dark:border-slate-700/80 text-left text-xs animate-in fade-in zoom-in-95 duration-150 text-text-main backdrop-blur-xl"
          role="tooltip"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-main">
            <div className="flex items-center gap-1.5 font-bold text-text-main">
              <span
                className={`w-2 h-2 rounded-full ${
                  isVerified ? "bg-emerald-500" : university ? "bg-amber-500" : "bg-text-muted"
                }`}
              />
              <span>Institutional Verification</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isVerified
                  ? "bg-emerald-500/10 text-emerald-600"
                  : university
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-surface-dim text-text-muted"
              }`}
            >
              {isVerified ? "Verified" : university ? "Unverified" : "Independent"}
            </span>
          </div>

          {/* Explanation Message */}
          <p className="text-text-muted leading-relaxed mb-3">
            {derivedReason}
          </p>

          {/* Domain & Email Details Box */}
          <div className="bg-surface-dim rounded-lg p-2.5 space-y-1.5 border border-border-main font-mono text-[11px]">
            {email && (
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-text-muted font-sans">Account Email:</span>
                <span className="font-semibold text-text-main truncate max-w-[150px]">{email}</span>
              </div>
            )}
            {university && (
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-text-muted font-sans">Institution:</span>
                <span className="font-semibold text-text-main truncate max-w-[150px]">{university}</span>
              </div>
            )}
            {domain && (
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-text-muted font-sans">Required Domain:</span>
                <span className="font-semibold text-primary-action">@{domain}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-border-main font-sans">
              <span className="text-text-muted">Match Status:</span>
              <span
                className={`font-bold inline-flex items-center gap-1 ${
                  isVerified ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {isVerified ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Domain Verified
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Domain Mismatch
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Footer Guide Note */}
          <div className="mt-2.5 pt-2 border-t border-border-main text-[10px] text-text-muted font-sans leading-tight">
            {isVerified
              ? "✨ Verified members receive campus-only event eligibility and priority matchmaking."
              : "💡 To get verified, connect or sign in with your official university email (@thapar.edu, @stanford.edu)."}
          </div>
        </div>
      )}
    </div>
  );
}

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

export function ScopeBadge({ isGlobal, location }: { isGlobal: boolean; location?: string }) {
  if (isGlobal) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Globe className="w-3 h-3 text-emerald-600" />
        Global Event
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200">
      <Lock className="w-3 h-3 text-purple-600" />
      {location ? `Campus Only (${location})` : "Campus Only"}
    </span>
  );
}

export function SkillTag({
  skill,
  provenance,
  isNeeded = false,
  isMatched = false,
}: {
  skill: string;
  provenance?: string;
  isNeeded?: boolean;
  isMatched?: boolean;
}) {
  if (isNeeded) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-dashed border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {skill} (Needed)
      </span>
    );
  }

  if (isMatched) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>{skill}</span>
        {provenance && (
          <span className="text-[10px] px-1 py-0.2 rounded bg-white text-emerald-700 border border-emerald-100">
            {provenance}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors">
      <span>{skill}</span>
      {provenance && (
        <span className="text-[10px] px-1 py-0.2 rounded bg-white text-slate-500 border border-slate-200">
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
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        Application Pending
      </span>
    );
  }

  if (norm === "ACCEPTED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Accepted to Squad
      </span>
    );
  }

  if (norm === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        Declined
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {status}
    </span>
  );
}

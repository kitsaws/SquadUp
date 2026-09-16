import React from "react";
import { RecommendationTier } from "./Badges";

interface CompatibilityScoreRingProps {
  score?: number; // 0.0 to 1.0
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  category?: RecommendationTier | "UNRATED";
  customColor?: string;
  isUnrated?: boolean;
}

export function CompatibilityScoreRing({
  score,
  size = 84,
  strokeWidth = 7,
  className = "",
  showLabel = true,
  category,
  customColor,
  isUnrated = false,
}: CompatibilityScoreRingProps) {
  const percentage = score !== undefined ? Math.round(Math.min(Math.max(score, 0), 1) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isUnrated || score === undefined ? circumference : circumference - (percentage / 100) * circumference;

  // Pick color based on category and score thresholds (same behavior as TeamsPage.tsx)
  let strokeColor = customColor;
  if (!strokeColor) {
    if (isUnrated || category === "UNRATED" || score === undefined) {
      strokeColor = "#94a3b8"; // neutral slate/grey
    } else if (category === "BEST") {
      strokeColor = "var(--sq-best-fit, #68DBA9)";
    } else if (category === "GOOD_DIFFERENT_UNIVERSITY") {
      strokeColor = "var(--sq-cross-campus, #6366F1)";
    } else if (category === "SAME_UNIVERSITY_LOWER_SCORE") {
      strokeColor = "var(--sq-campus-explorer, #ffc761)";
    } else if (percentage < 70) {
      strokeColor = "var(--sq-campus-explorer, #ffc761)";
    } else if (percentage < 85) {
      strokeColor = "var(--sq-cross-campus, #6366F1)";
    } else {
      strokeColor = "var(--sq-best-fit, #68DBA9)";
    }
  }

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--sq-border, #e2e8f0)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Percentage Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`font-black tracking-tight font-heading ${isUnrated || score === undefined ? "text-slate-400 text-sm" : "text-slate-900"}`}>
          {isUnrated || score === undefined ? "—" : `${percentage}%`}
        </span>
        {size >= 80 && (
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
            {isUnrated || score === undefined ? "Unscored" : "Match"}
          </span>
        )}
      </div>

      {showLabel && size >= 100 && (
        <span className="text-xs font-semibold text-slate-600 mt-2">
          Pure Compatibility Score
        </span>
      )}
    </div>
  );
}

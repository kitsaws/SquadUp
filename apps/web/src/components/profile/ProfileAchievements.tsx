import React from "react";
import { Trophy, ChevronDown } from "lucide-react";

interface ProfileAchievementsProps {
  achievementsList: any[];
  expandedAchievements: Record<number, boolean>;
  setExpandedAchievements: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

export function ProfileAchievements({
  achievementsList,
  expandedAchievements,
  setExpandedAchievements,
}: ProfileAchievementsProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-text-main font-heading uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Achievements & Hackathons
        </h3>
        <span className="text-xs text-text-muted font-medium">
          {achievementsList.length} Honors
        </span>
      </div>

      {achievementsList.length > 0 ? (
        <div className="space-y-3">
          {achievementsList.map((ach: any, i: number) => {
            const isExpanded = Boolean(expandedAchievements[i]);
            return (
              <div
                key={i}
                className="rounded-xl border border-border-main hover:border-primary-action/40 bg-surface-dim overflow-hidden transition-all shadow-2xs"
              >
                {/* Card Header: visible by default */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedAchievements((prev) => ({ ...prev, [i]: !prev[i] }))
                  }
                  className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-surface transition-colors"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      {ach.award_tier && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                          <Trophy className="w-2.5 h-2.5 text-amber-500" />
                          {ach.award_tier}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-text-main truncate">
                        {ach.title}
                      </h4>
                    </div>
                    <p className="text-xs text-text-muted font-medium">
                      {ach.organization} {ach.year && `• ${ach.year}`}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-border-main space-y-2.5 bg-surface-dim animate-in fade-in duration-150">
                    {ach.description && (
                      <p className="text-xs text-text-muted leading-relaxed">
                        {ach.description}
                      </p>
                    )}
                    {ach.technologies && ach.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {ach.technologies.map((tech: string, k: number) => (
                          <span
                            key={k}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text-muted border border-border-main"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-text-muted italic">No hackathons or honors listed yet.</p>
      )}
    </div>
  );
}

import React from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { SkillTag } from "../Badges";

interface ProfileSkillsProps {
  skillsList: string[];
  isSkillsExpanded: boolean;
  setIsSkillsExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
}

export function ProfileSkills({
  skillsList,
  isSkillsExpanded,
  setIsSkillsExpanded,
}: ProfileSkillsProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
      <button
        type="button"
        onClick={() => setIsSkillsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between text-left cursor-pointer group"
      >
        <h3 className="text-sm font-black text-text-main font-heading uppercase tracking-wider flex items-center gap-1.5 group-hover:text-primary-action transition-colors">
          <Sparkles className="w-4 h-4 text-primary-action" /> Skills
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-medium">
            {skillsList.length} Skills
          </span>
          <ChevronDown
            className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
              isSkillsExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isSkillsExpanded && (
        <div className="animate-in fade-in duration-150">
          {skillsList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skillsList.map((skill: string, i: number) => (
                <SkillTag key={i} skill={skill} isMatched={true} />
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface-dim border border-border-main text-center space-y-1">
              <p className="text-xs text-text-muted font-medium">No verified skills detected yet</p>
              <p className="text-[11px] text-text-muted">Upload your PDF resume or add skills manually to build your profile.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

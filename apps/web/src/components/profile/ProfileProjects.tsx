import React from "react";
import { Layers, ChevronDown } from "lucide-react";

interface ProfileProjectsProps {
  projectsList: any[];
  expandedProjects: Record<number, boolean>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

export function ProfileProjects({
  projectsList,
  expandedProjects,
  setExpandedProjects,
}: ProfileProjectsProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-text-main font-heading uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-text-muted" /> Projects
        </h3>
        <span className="text-xs text-text-muted font-medium">
          {projectsList.length} Built
        </span>
      </div>

      {projectsList.length > 0 ? (
        <div className="space-y-3">
          {projectsList.map((proj: any, i: number) => {
            const isExpanded = Boolean(expandedProjects[i]);
            return (
              <div
                key={i}
                className="rounded-xl border border-border-main hover:border-primary-action/40 bg-surface-dim overflow-hidden transition-all shadow-2xs"
              >
                {/* Card Header: visible by default */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedProjects((prev) => ({ ...prev, [i]: !prev[i] }))
                  }
                  className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-surface transition-colors"
                >
                  <div className="space-y-0.5 truncate">
                    <h4 className="text-sm font-bold text-text-main truncate">
                      {proj.name}
                    </h4>
                    {proj.description && (
                      <p className="text-xs text-text-muted truncate">
                        {proj.description}
                      </p>
                    )}
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
                    {proj.description && (
                      <p className="text-xs text-text-muted leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                    {proj.bullet_points && proj.bullet_points.length > 0 && (
                      <ul className="space-y-1 text-xs text-text-muted list-disc list-inside">
                        {proj.bullet_points.map((bp: string, j: number) => (
                          <li key={j} className="leading-relaxed">
                            {bp}
                          </li>
                        ))}
                      </ul>
                    )}
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.technologies.map((tech: string, k: number) => (
                          <span
                            key={k}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary-light text-primary-action border border-primary-border"
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
        <p className="text-xs text-text-muted italic">No public technical projects listed yet.</p>
      )}
    </div>
  );
}

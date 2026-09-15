import React from "react";
import { Sparkles, Globe } from "lucide-react";

export function CategoryLegend({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 text-[11px] font-medium ${className}`}
    >
      {/* Best Fit Pill */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50/90 border border-emerald-200/90 text-emerald-900 font-semibold shadow-2xs">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--sq-best-fit, #68DBA9)" }}
        />
        <span>Best Fit</span>
      </div>

      {/* Cross-Campus Pill */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50/90 border border-indigo-200/90 text-indigo-900 font-semibold shadow-2xs">
        <Globe
          className="w-2.5 h-2.5"
          style={{ color: "var(--sq-cross-campus, #6366F1)" }}
        />
        <span>Cross-Campus</span>
      </div>

      {/* Same Campus Pill */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50/90 border border-amber-200/90 text-amber-900 font-semibold shadow-2xs">
        <Sparkles
          className="w-2.5 h-2.5"
          style={{ color: "var(--sq-campus-explorer, #ffc761)" }}
        />
        <span>Same Campus</span>
      </div>
    </div>
  );
}

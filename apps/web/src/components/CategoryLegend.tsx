import React from "react";
import { Sparkles, Globe } from "lucide-react";

export function CategoryLegend({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 text-[11px] font-medium ${className}`}
    >
      {/* Best Fit Pill */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-best-fit-light border border-best-fit text-best-fit-dark font-semibold shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-best-fit-dark" />
        <span>Best Fit</span>
      </div>

      {/* Cross-Campus Pill */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cross-campus-light border border-cross-campus text-cross-campus-dark font-semibold shadow-2xs">
        <Globe className="w-2.5 h-2.5 text-cross-campus" />
        <span>Cross-Campus</span>
      </div>

      {/* Same Campus Pill */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-campus-explorer-light border border-campus-explorer text-campus-explorer-dark font-semibold shadow-2xs">
        <Sparkles className="w-2.5 h-2.5 text-campus-explorer-dark" />
        <span>Same Campus</span>
      </div>
    </div>
  );
}

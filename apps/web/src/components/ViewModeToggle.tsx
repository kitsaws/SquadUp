import React from "react";
import { LayoutGrid, Rows3 } from "lucide-react";

export type ViewMode = "cards" | "tiles";

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
  size?: "sm" | "md";
}

export function ViewModeToggle({
  mode,
  onChange,
  className = "",
  size = "md",
}: ViewModeToggleProps) {
  const isSm = size === "sm";

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-surface-dim border border-border-main ${className}`}
      role="group"
      aria-label="View mode toggle"
    >
      <button
        type="button"
        onClick={() => onChange("cards")}
        title="Cards View"
        className={`flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer ${
          isSm ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"
        } ${
          mode === "cards"
            ? "bg-surface text-primary-action shadow-2xs border border-border-main"
            : "text-text-muted hover:text-text-main"
        }`}
      >
        <LayoutGrid className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span className="hidden sm:inline">Cards</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("tiles")}
        title="Tiles View"
        className={`flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer ${
          isSm ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"
        } ${
          mode === "tiles"
            ? "bg-surface text-primary-action shadow-2xs border border-border-main"
            : "text-text-muted hover:text-text-main"
        }`}
      >
        <Rows3 className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span className="hidden sm:inline">Tiles</span>
      </button>
    </div>
  );
}

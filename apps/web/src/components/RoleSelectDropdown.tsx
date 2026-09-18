import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Briefcase, Check, Sparkles, Layers } from "lucide-react";

export interface RoleOption {
  id?: string;
  title: string;
  skills: string[];
  spots?: number;
  assignedToId?: string | null;
}

interface RoleSelectDropdownProps {
  roles?: RoleOption[];
  selectedRoleId: string;
  onChange: (roleId: string) => void;
  className?: string;
}

export const RoleSelectDropdown: React.FC<RoleSelectDropdownProps> = ({
  roles = [],
  selectedRoleId,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter strictly to open/unfilled roles (spots > 0)
  const openRoles = roles.filter((r) => (r.spots ?? 1) > 0);

  // Find currently selected role
  const selectedRole = openRoles.find((r) => r.id === selectedRoleId);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim/70 text-text-main text-xs font-semibold shadow-2xs transition-all cursor-pointer min-w-[170px] max-w-[220px] focus:outline-hidden focus:ring-2 focus:ring-primary-action/30 focus:border-primary-action"
        title="Select designated role for invite"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <div className="p-1 rounded-md bg-primary-light text-primary-action shrink-0">
            <Briefcase className="w-3 h-3" />
          </div>
          <span className="truncate font-medium">
            {selectedRole ? selectedRole.title : "Any Open Role"}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary-action" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-50 w-72 sm:w-80 bg-surface rounded-2xl border border-border-main shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          <div className="px-3 py-1.5 border-b border-border-main/60 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary-action" />
              Designate Squad Role
            </span>
            <span className="text-[10px] font-semibold text-text-muted">
              {openRoles.length} Open Position{openRoles.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 pt-1.5 pr-0.5">
            {/* Option 1: Any Open Role */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                !selectedRoleId
                  ? "bg-primary-light/70 text-primary-action border border-primary-border/60 font-bold"
                  : "hover:bg-surface-dim text-text-main border border-transparent font-medium"
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-campus-explorer shrink-0" />
                  <span>Any Open Role</span>
                </div>
                <span className="text-[10px] text-text-muted block mt-0.5 font-normal">
                  Let candidate pick or assign role later
                </span>
              </div>
              {!selectedRoleId && <Check className="w-3.5 h-3.5 text-primary-action shrink-0" />}
            </button>

            {/* List of Open Roles */}
            {openRoles.map((role) => {
              const isSelected = selectedRoleId === role.id;
              const roleId = role.id || "";

              return (
                <button
                  key={role.id || role.title}
                  type="button"
                  onClick={() => {
                    onChange(roleId);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? "bg-primary-light/70 text-primary-action border border-primary-border/60"
                      : "hover:bg-surface-dim text-text-main border border-transparent"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate block font-heading">
                        {role.title}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-dim text-text-muted border border-border-main shrink-0">
                        {role.spots || 1} spot{(role.spots || 1) > 1 ? "s" : ""}
                      </span>
                    </div>

                    {role.skills && role.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {role.skills.map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface text-text-muted border border-border-main"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary-action shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

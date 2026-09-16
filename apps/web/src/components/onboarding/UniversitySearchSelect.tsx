import React, { useState, useMemo, useRef } from "react";
import { Search, Building2, Globe, Check, MapPin } from "lucide-react";
import { OrganizationItem } from "../../services/api";

interface UniversitySearchSelectProps {
  universities: OrganizationItem[];
  isLoading: boolean;
  selectedUniversity: OrganizationItem | null;
  isIndependent: boolean;
  onSelectUniversity: (uni: OrganizationItem | null, isIndependent: boolean) => void;
  onProceed: () => void;
}

export function UniversitySearchSelect({
  universities,
  isLoading,
  selectedUniversity,
  isIndependent,
  onSelectUniversity,
  onProceed,
}: UniversitySearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter universities by name, domain, or location
  const filteredUniversities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return universities;
    return universities.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.domain && u.domain.toLowerCase().includes(q)) ||
        (u.location && u.location.toLowerCase().includes(q)) ||
        u.slug.toLowerCase().includes(q)
    );
  }, [universities, searchQuery]);

  // Handle keyboard navigation in search results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredUniversities.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredUniversities.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredUniversities.length - 1));
    } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < filteredUniversities.length) {
      e.preventDefault();
      const selected = filteredUniversities[focusedIndex];
      onSelectUniversity(selected, false);
    } else if (e.key === "Escape") {
      setSearchQuery("");
      setFocusedIndex(-1);
    }
  };

  const isSelected = (uni: OrganizationItem) =>
    !isIndependent && selectedUniversity?.clerkOrgId === uni.clerkOrgId;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-primary-action text-xs font-bold uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5" />
          <span>Step 1 of 2</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
          Where do you study?
        </h2>
        <p className="text-sm text-slate-600">
          SquadUp isolates campus-only squads and hackathons to your home institution. Select your university below.
        </p>
      </div>

      {/* Main Search & Selection Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden max-w-2xl mx-auto">
        {/* Search input field */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by university name, location, or domain (e.g. Thapar, BITS, stanford.edu)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-primary-action border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading partner institutions...</p>
            </div>
          ) : filteredUniversities.length > 0 ? (
            filteredUniversities.map((uni, idx) => {
              const active = isSelected(uni);
              const isFocused = focusedIndex === idx;

              return (
                <button
                  key={uni.clerkOrgId || uni.id}
                  type="button"
                  onClick={() => onSelectUniversity(uni, false)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    active
                      ? "bg-primary-light/60 border border-primary-border ring-1 ring-primary-action/30"
                      : isFocused
                      ? "bg-slate-100 border border-transparent"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* University Logo / Emblem Avatar */}
                    {uni.logoUrl ? (
                      <img
                        src={uni.logoUrl}
                        alt={uni.name}
                        className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 font-heading shadow-2xs">
                        {uni.name.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate font-heading">
                          {uni.name}
                        </h4>
                        {active && (
                          <span className="px-1.5 py-0.5 rounded-full bg-primary-action text-white text-[10px] font-bold shrink-0">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        {uni.location && (
                          <span className="flex items-center gap-1 shrink-0">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {uni.location}
                          </span>
                        )}
                        {uni.domain && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200/80">
                            @{uni.domain}
                          </span>
                        )}
                        {uni.subOrganizersCount !== undefined && uni.subOrganizersCount > 0 && (
                          <span className="text-[11px] text-slate-400 hidden sm:inline">
                            • {uni.subOrganizersCount} clubs & chapters
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selection Indicator Check */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      active
                        ? "bg-primary-action border-primary-action text-white shadow-2xs"
                        : "border-slate-200 bg-white text-transparent group-hover:border-slate-300"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center space-y-2">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                No universities found matching "{searchQuery}"
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Don't see your college? You can join as an independent participant or contact your campus lead to register.
              </p>
            </div>
          )}
        </div>

        {/* Independent / Unaffiliated Option Footer */}
        <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectUniversity(null, true)}
            className={`w-full sm:w-auto text-left px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer border ${
              isIndependent
                ? "bg-purple-50 border-purple-300 text-purple-900 font-bold"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Continue as Independent / Unaffiliated</span>
            {isIndependent && <Check className="w-3.5 h-3.5 text-purple-600 ml-auto" />}
          </button>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {selectedUniversity
              ? `Selected: ${selectedUniversity.name}`
              : isIndependent
              ? "Selected: Independent Participant"
              : "Please select an option"}
          </span>
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onProceed}
          disabled={!selectedUniversity && !isIndependent}
          className={`px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
            selectedUniversity || isIndependent
              ? "bg-primary-action hover:bg-primary-hover text-white shadow-primary-action/20 hover:scale-[1.02]"
              : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
          }`}
        >
          <span>Continue to Profile Setup</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

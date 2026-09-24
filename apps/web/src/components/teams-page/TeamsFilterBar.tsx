import React from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Building,
  RotateCw,
} from "lucide-react";
import { ViewModeToggle, ViewMode } from "../ViewModeToggle";
import { OrganizationItem } from "../../services/api";
import { SortOption } from "./useTeamsFilter";

interface TeamsFilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSortOpen: boolean;
  setIsSortOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  filterTier: string;
  filterCampus: string;
  filterOpenSpotsOnly: boolean;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  stagedTier: string;
  setStagedTier: (tier: string) => void;
  stagedCampus: string;
  setStagedCampus: (campus: string) => void;
  stagedOpenSpotsOnly: boolean;
  setStagedOpenSpotsOnly: (val: boolean | ((prev: boolean) => boolean)) => void;
  campusSearch: string;
  setCampusSearch: (search: string) => void;
  filteredUniversities: OrganizationItem[];
  myCampus?: string | null;
  activeFilterCount: number;
  handleOpenFilterPopover: () => void;
  handleApplyFilters: () => void;
  handleResetFilters: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isSignedIn: boolean;
}

export const sortLabels: Record<SortOption, string> = {
  FIT_DESC: "Fit Score (Highest)",
  FIT_ASC: "Fit Score (Lowest)",
  SPOTS_DESC: "Open Spots (Most)",
  NAME_ASC: "Squad Name (A-Z)",
};

export function TeamsFilterBar({
  searchQuery,
  setSearchQuery,
  isFilterOpen,
  setIsFilterOpen,
  isSortOpen,
  setIsSortOpen,
  sortBy,
  setSortBy,
  stagedTier,
  setStagedTier,
  stagedCampus,
  setStagedCampus,
  stagedOpenSpotsOnly,
  setStagedOpenSpotsOnly,
  campusSearch,
  setCampusSearch,
  filteredUniversities,
  myCampus,
  activeFilterCount,
  handleOpenFilterPopover,
  handleApplyFilters,
  handleResetFilters,
  viewMode,
  setViewMode,
  isSignedIn,
}: TeamsFilterBarProps) {
  return (
    <div className="relative z-30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by squad name, tech stack (e.g. React, PyTorch), or event..."
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border-main rounded-xl text-xs sm:text-sm text-text-main placeholder:text-text-muted outline-hidden focus:border-primary-action focus:ring-1 focus:ring-primary-action transition-all shadow-2xs"
        />
      </div>

      {/* Controls Group */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter Popover Button */}
        <div className="relative">
          <button
            onClick={handleOpenFilterPopover}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs ${
              activeFilterCount > 0 || isFilterOpen
                ? "bg-primary-light text-primary-action border-primary-border"
                : "bg-surface text-text-main border-border-main hover:bg-surface-dim"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary-action text-white text-[10px] font-black flex items-center justify-center ml-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filter Popover Modal */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface rounded-2xl border border-border-main shadow-xl p-5 space-y-5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-border-main">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary-action" />
                  <h4 className="text-sm font-bold text-text-main font-heading">
                    Filter Squads
                  </h4>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-text-muted hover:text-rose-500 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              {/* Recommendation Tier Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                  AI Fit Category
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      id: "ALL",
                      label: "All Tiers",
                      activeClass: "bg-primary-light text-primary-action border-primary-border shadow-2xs",
                      inactiveClass: "bg-surface-dim text-text-muted border-border-main hover:bg-surface hover:text-text-main",
                    },
                    {
                      id: "BEST",
                      label: "Best Fit",
                      activeClass: "bg-best-fit-light text-best-fit-dark border-best-fit shadow-2xs",
                      inactiveClass: "bg-surface-dim text-text-muted border-border-main hover:bg-best-fit-light/40 hover:text-best-fit-dark hover:border-best-fit/40",
                    },
                    {
                      id: "GOOD_DIFFERENT_UNIVERSITY",
                      label: "Cross-Campus",
                      activeClass: "bg-cross-campus-light text-cross-campus-dark border-cross-campus shadow-2xs",
                      inactiveClass: "bg-surface-dim text-text-muted border-border-main hover:bg-cross-campus-light/40 hover:text-cross-campus-dark hover:border-cross-campus/40",
                    },
                    {
                      id: "SAME_UNIVERSITY_LOWER_SCORE",
                      label: "Explorer",
                      activeClass: "bg-campus-explorer-light text-campus-explorer-dark border-campus-explorer shadow-2xs",
                      inactiveClass: "bg-surface-dim text-text-muted border-border-main hover:bg-campus-explorer-light/40 hover:text-campus-explorer-dark hover:border-campus-explorer/40",
                    },
                  ].map((tier) => {
                    const isSelected = stagedTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        onClick={() => setStagedTier(tier.id)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected ? tier.activeClass : tier.inactiveClass
                        }`}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campus Scope Filter with Autocomplete */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                  Campus / University
                </label>

                {myCampus && (
                  <button
                    type="button"
                    onClick={() => setStagedCampus(stagedCampus === myCampus ? "ALL" : myCampus)}
                    className={`w-full px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      stagedCampus === myCampus
                        ? "bg-primary-light text-primary-action border-primary-border"
                        : "bg-surface-dim text-text-muted border-border-main hover:text-text-main"
                    }`}
                  >
                    <span className="truncate">🏫 My Campus ({myCampus})</span>
                    {stagedCampus === myCampus && <Check className="w-3.5 h-3.5 text-primary-action shrink-0" />}
                  </button>
                )}

                <div className="space-y-1.5">
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={campusSearch}
                      onChange={(e) => setCampusSearch(e.target.value)}
                      placeholder="Search other campuses..."
                      className="w-full pl-8 pr-3 py-1.5 bg-surface-dim border border-border-main rounded-lg text-xs text-text-main placeholder:text-text-muted outline-hidden focus:border-primary-action"
                    />
                  </div>

                  {filteredUniversities.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-border-main bg-surface-dim divide-y divide-border-main/50">
                      {filteredUniversities.map((uni) => (
                        <button
                          key={uni.id || uni.name}
                          type="button"
                          onClick={() => {
                            setStagedCampus(uni.name);
                            setCampusSearch("");
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            stagedCampus === uni.name
                              ? "bg-primary-light text-primary-action font-bold"
                              : "text-text-muted hover:bg-surface hover:text-text-main"
                          }`}
                        >
                          <span className="truncate">{uni.name}</span>
                          {stagedCampus === uni.name && <Check className="w-3 h-3 text-primary-action shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {stagedCampus !== "ALL" && (
                    <div className="flex items-center justify-between text-xs px-2 py-1 bg-surface rounded-lg border border-border-main">
                      <span className="text-text-muted truncate">
                        Active: <strong className="text-text-main font-semibold">{stagedCampus}</strong>
                      </span>
                      <button
                        onClick={() => setStagedCampus("ALL")}
                        className="text-rose-500 hover:text-rose-600 font-bold ml-2 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Open Spots Only Toggle */}
              <label className="flex items-center gap-2.5 text-xs text-text-main font-semibold cursor-pointer select-none pt-2 border-t border-border-main">
                <input
                  type="checkbox"
                  checked={stagedOpenSpotsOnly}
                  onChange={(e) => setStagedOpenSpotsOnly(e.target.checked)}
                  className="rounded border-border-main text-primary-action focus:ring-primary-action"
                />
                <span>Show squads with open vacancies only</span>
              </label>

              {/* Commit & Dismiss */}
              <div className="flex items-center gap-2 pt-2 border-t border-border-main">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 py-2.5 bg-primary-action hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center shadow-xs"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sort Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => {
              setIsSortOpen((prev) => !prev);
              setIsFilterOpen(false);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs ${
              isSortOpen
                ? "bg-primary-light text-primary-action border-primary-border"
                : "bg-surface text-text-main border-border-main hover:bg-surface-dim"
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
            <span className="sm:hidden">Sort</span>
          </button>

          {/* Sort Dropdown Menu */}
          {isSortOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-surface rounded-2xl border border-border-main shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
              {(Object.keys(sortLabels) as SortOption[]).map((option) => {
                if (!isSignedIn && (option === "FIT_DESC" || option === "FIT_ASC")) return null;
                return (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option);
                      setIsSortOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-bold rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                      sortBy === option
                        ? "bg-primary-light text-primary-action"
                        : "text-text-muted hover:bg-surface-dim hover:text-text-main"
                    }`}
                  >
                    <span>{sortLabels[option]}</span>
                    {sortBy === option && <CheckCircle2 className="w-3.5 h-3.5 text-primary-action" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View Mode Toggle: Cards vs Compact Tiles */}
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SignInButton, useUser, useAuth } from "@clerk/react";
import {
  Users,
  Plus,
  CheckCircle2,
  Loader2,
  RotateCw,
} from "lucide-react";
import { useUserContext } from "../contexts/UserContext";
import { TeamCard } from "../components/TeamCard";
import { TeamTile } from "../components/TeamTile";
import { CategoryLegend } from "../components/CategoryLegend";
import { ApplyTeamModal } from "../components/ApplyTeamModal";
import { CreateTeamModal } from "../components/CreateTeamModal";
import { applicationsApi } from "../services/api";
import {
  useTeamsFilter,
  TeamsFilterBar,
  TeamsInspectorDrawer,
  TeamsPagination,
} from "../components/teams-page";

export function TeamsPage() {
  const navigate = useNavigate();
  const { isSignedIn, userVerifiedSkills } = useUserContext();
  const { orgId } = useAuth();
  const { user } = useUser();
  const userOrgIds = useMemo(() => (user?.organizationMemberships || []).map((m) => m.organization.id), [user]);

  // Create Team Modal State
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

  // Application feedback state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [appliedTeamIds, setAppliedTeamIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hook for filtering, sorting, pagination, and fetching
  const {
    teams,
    isLoading,
    page,
    setPage,
    totalPages,
    totalCount,
    searchQuery,
    setSearchQuery,
    isFilterOpen,
    setIsFilterOpen,
    isSortOpen,
    setIsSortOpen,
    filterTier,
    filterCampus,
    filterOpenSpotsOnly,
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
    viewMode,
    setViewMode,
    inspectedTeam,
    setInspectedTeam,
    handleInspectToggle,
    handleOpenFilterPopover,
    handleApplyFilters,
    handleResetFilters,
    activeFilterCount,
    loadTeams,
  } = useTeamsFilter();

  const handleApplySuccess = async (teamId: string, message?: string) => {
    try {
      await applicationsApi.applyToTeam(teamId, message);
      setAppliedTeamIds((prev) => [...prev, teamId]);
      setIsApplyModalOpen(false);
      setToastMessage("✓ Application submitted! Squad leaders have received your dossier.");
      loadTeams(true);
    } catch (err: any) {
      setToastMessage(err?.message || "Failed to submit application.");
      setIsApplyModalOpen(false);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface text-text-main border border-border-main px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight font-heading">
            Squads Directory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Browse hackathon teams recruiting talent. Ranked globally by AI taxonomy fit.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2.5 self-start md:self-auto">
          {isSignedIn ? (
            <button
              type="button"
              onClick={() => setIsCreateTeamOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-4 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Team</span>
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Team</span>
              </button>
            </SignInButton>
          )}

          <button
            onClick={() => loadTeams(true)}
            title="Refresh Squads List"
            className="inline-flex w-full justify-center items-center gap-1.5 px-3 py-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-muted hover:text-text-main text-xs font-semibold transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface rounded-2xl border border-border-main p-4 shadow-xs space-y-3">
        <TeamsFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          isSortOpen={isSortOpen}
          setIsSortOpen={setIsSortOpen}
          filterTier={filterTier}
          filterCampus={filterCampus}
          filterOpenSpotsOnly={filterOpenSpotsOnly}
          sortBy={sortBy}
          setSortBy={setSortBy}
          stagedTier={stagedTier}
          setStagedTier={setStagedTier}
          stagedCampus={stagedCampus}
          setStagedCampus={setStagedCampus}
          stagedOpenSpotsOnly={stagedOpenSpotsOnly}
          setStagedOpenSpotsOnly={setStagedOpenSpotsOnly}
          campusSearch={campusSearch}
          setCampusSearch={setCampusSearch}
          filteredUniversities={filteredUniversities}
          myCampus={myCampus}
          activeFilterCount={activeFilterCount}
          handleOpenFilterPopover={handleOpenFilterPopover}
          handleApplyFilters={handleApplyFilters}
          handleResetFilters={handleResetFilters}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isSignedIn={Boolean(isSignedIn)}
        />

        {/* Legend */}
        <div className="pt-2.5 border-t border-border-main flex flex-wrap items-center justify-between gap-2 px-1">
          {isSignedIn ? <CategoryLegend /> : <div />}
          <span className="text-xs text-text-muted font-medium hidden sm:inline">
            Showing {teams.length} of {totalCount} squads
          </span>
        </div>
      </div>

      {/* Dynamic View: Unified container with stable card width and smooth drawer slide-in */}
      <div className={`flex flex-col ${viewMode === "cards" ? "lg:flex-row" : ""} items-start gap-6 relative`}>
        {/* Cards / Tiles Column */}
        <div
          className={`w-full ${inspectedTeam && viewMode === "cards" ? "lg:w-[390px] xl:w-[420px] shrink-0" : ""}`}
        >
          {inspectedTeam && viewMode === "cards" && (
            <div className="flex items-center justify-between px-1 mb-3 text-xs text-text-muted font-medium animate-in fade-in duration-200">
              <span>Select a squad to inspect:</span>
              <button
                onClick={() => setInspectedTeam(null)}
                className="text-primary-action font-bold hover:underline cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary-action animate-spin" />
              <p className="text-xs font-semibold text-text-muted">Loading squads & teams...</p>
            </div>
          ) : viewMode === "cards" ? (
            <div
              className={`grid gap-6 ${
                inspectedTeam ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {teams.map((team) => {
                const isRestricted = Boolean(
                  team.isGlobal === false &&
                  (!team.orgId || (orgId !== team.orgId && !userOrgIds.includes(team.orgId)))
                );
                return (
                  <div key={team.id} id={`team-card-${team.id}`} className="h-full scroll-mt-24">
                    <TeamCard
                      team={team}
                      isSelected={inspectedTeam?.id === team.id}
                      hasApplied={appliedTeamIds.includes(team.id)}
                      onInspect={() => handleInspectToggle(team)}
                      onApply={() => {
                        handleInspectToggle(team);
                        if (!team.isUserLeader && !isRestricted) {
                          setIsApplyModalOpen(true);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col space-y-3 w-full">
              {teams.map((team) => {
                const isSelected = inspectedTeam?.id === team.id;
                const isRestricted = Boolean(
                  team.isGlobal === false &&
                  (!team.orgId || (orgId !== team.orgId && !userOrgIds.includes(team.orgId)))
                );
                return (
                  <div key={team.id} id={`team-tile-${team.id}`} className="w-full scroll-mt-24">
                    <TeamTile
                      team={team}
                      isSelected={isSelected}
                      hasApplied={appliedTeamIds.includes(team.id)}
                      onInspect={() => handleInspectToggle(team)}
                      onApply={() => {
                        handleInspectToggle(team);
                        if (!team.isUserLeader && !isRestricted) {
                          setIsApplyModalOpen(true);
                        }
                      }}
                    />
                    {isSelected && (
                      <TeamsInspectorDrawer
                        team={team}
                        isInline={true}
                        onClose={() => setInspectedTeam(null)}
                        onApply={() => {
                          if (!team.isUserLeader && !isRestricted) {
                            setIsApplyModalOpen(true);
                          }
                        }}
                        appliedTeamIds={appliedTeamIds}
                        userVerifiedSkills={userVerifiedSkills}
                        isSignedIn={Boolean(isSignedIn)}
                        orgId={orgId}
                        userOrgIds={userOrgIds}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && (
            <TeamsPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          )}
        </div>

        {/* Right Column: Sticky Inspection Panel (ONLY in Cards View) */}
        {inspectedTeam && viewMode === "cards" && (
          <TeamsInspectorDrawer
            team={inspectedTeam}
            isInline={false}
            onClose={() => setInspectedTeam(null)}
            onApply={() => {
              const isRestricted = Boolean(
                inspectedTeam.isGlobal === false &&
                (!inspectedTeam.orgId || (orgId !== inspectedTeam.orgId && !userOrgIds.includes(inspectedTeam.orgId)))
              );
              if (!inspectedTeam.isUserLeader && !isRestricted) {
                setIsApplyModalOpen(true);
              }
            }}
            appliedTeamIds={appliedTeamIds}
            userVerifiedSkills={userVerifiedSkills}
            isSignedIn={Boolean(isSignedIn)}
            orgId={orgId}
            userOrgIds={userOrgIds}
          />
        )}
      </div>

      {!isLoading && teams.length === 0 && (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border-main p-8 space-y-3">
          <Users className="w-12 h-12 text-text-muted mx-auto opacity-50" />
          <h3 className="text-base font-bold text-text-main">No matching squads found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Try clearing your active filters or changing your search query.
          </p>
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-primary-action hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Apply Team Modal */}
      {inspectedTeam && (
        <ApplyTeamModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          team={inspectedTeam}
          onSubmit={handleApplySuccess}
        />
      )}

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onSuccess={(newTeamId) => {
          navigate(`/team/${newTeamId}`);
        }}
      />
    </div>
  );
}
export default TeamsPage;

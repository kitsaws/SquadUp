import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Users,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useUser, useAuth } from "@clerk/react";
import { useUserContext } from "../../contexts/UserContext";
import { eventsApi, teamsApi, EventItem, TeamRoleItem } from "../../services/api";
import {
  CreateTeamModalProps,
  RoleDraft,
  InviteDraft,
  PRESET_TEMPLATES,
} from "./create-team.types";
import { StepSelectEvent } from "./StepSelectEvent";
import { StepTeamDetails } from "./StepTeamDetails";
import { StepRoleBuilder } from "./StepRoleBuilder";
import { StepInviteMembers } from "./StepInviteMembers";

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEventId,
  initialEvent,
}) => {
  const { refreshProfile } = useUserContext();
  const { user } = useUser();
  const { orgId } = useAuth();

  // Selected Event State
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || initialEvent?.id || ""
  );
  const [lockedEvent, setLockedEvent] = useState<typeof initialEvent | null>(
    initialEvent || null
  );

  // Available events (when opened from TeamsPage)
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [teamName, setTeamName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("fullstack");
  const [roles, setRoles] = useState<RoleDraft[]>([
    {
      id: "role-1",
      title: "Frontend Architect",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
      spots: 1,
    },
    {
      id: "role-2",
      title: "Backend Engineer",
      skills: ["Node.js", "PostgreSQL", "FastAPI", "Docker"],
      spots: 1,
    },
    {
      id: "role-3",
      title: "UI/UX Designer",
      skills: ["Figma", "UI Design", "Prototyping"],
      spots: 1,
    },
  ]);

  // Skill Input State for each role (tracked by role ID)
  const [skillInputs, setSkillInputs] = useState<Record<string, string>>({});

  // Leader designated role index
  const [leaderRoleIndex, setLeaderRoleIndex] = useState<number>(0);

  // Initial Invites
  const [invites, setInvites] = useState<InviteDraft[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteRoleIndex, setNewInviteRoleIndex] = useState<number>(-1);
  const [isInviteRoleDropdownOpen, setIsInviteRoleDropdownOpen] = useState(false);
  const inviteRoleDropdownRef = useRef<HTMLDivElement>(null);

  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial event if provided
  useEffect(() => {
    if (initialEventId || initialEvent) {
      setSelectedEventId(initialEventId || initialEvent?.id || "");
      if (initialEvent) {
        setLockedEvent(initialEvent);
      }
    }
  }, [initialEventId, initialEvent]);

  // Fetch events if not locked
  useEffect(() => {
    if (isOpen && !initialEventId && !initialEvent) {
      setLoadingEvents(true);
      eventsApi
        .getEvents({ limit: 50, scope: "all" })
        .then((res) => {
          if (res?.data) {
            setEventsList(res.data);
            if (res.data.length > 0 && !selectedEventId) {
              setSelectedEventId(res.data[0].id);
            }
          }
        })
        .catch((err) => {
          console.warn("[CreateTeamModal] Error fetching events:", err);
        })
        .finally(() => {
          setLoadingEvents(false);
        });
    }
  }, [isOpen, initialEventId, initialEvent]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        eventDropdownRef.current &&
        !eventDropdownRef.current.contains(event.target as Node)
      ) {
        setIsEventDropdownOpen(false);
      }
      if (
        inviteRoleDropdownRef.current &&
        !inviteRoleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsInviteRoleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered events for searchable dropdown
  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    if (!query) return eventsList;
    return eventsList.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query) ||
        e.organization?.name?.toLowerCase().includes(query)
    );
  }, [eventsList, eventSearch]);

  const activeEvent = useMemo(() => {
    if (lockedEvent) return lockedEvent;
    return eventsList.find((e) => e.id === selectedEventId) || null;
  }, [lockedEvent, eventsList, selectedEventId]);

  // Check event eligibility based on Clerk orgId
  const isEligibleForSelectedEvent = useMemo(() => {
    if (!activeEvent) return true;
    if (activeEvent.isGlobal) return true;
    if (!activeEvent.orgId) return false;

    const activeOrgId = orgId;
    const userOrgIds = (user?.organizationMemberships || []).map((m) => m.organization.id);

    return Boolean(
      (activeOrgId && activeOrgId === activeEvent.orgId) ||
      userOrgIds.includes(activeEvent.orgId)
    );
  }, [activeEvent, orgId, user]);

  // Handle Preset Selection
  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const template = PRESET_TEMPLATES.find((p) => p.id === presetId);
    if (template) {
      setRoles(
        template.roles.map((r, i) => ({
          id: `role-${Date.now()}-${i}`,
          title: r.title,
          skills: [...r.skills],
          spots: r.spots,
        }))
      );
      setLeaderRoleIndex(0);
      setSkillInputs({});
    }
  };

  // Add new role
  const handleAddRole = () => {
    const newId = `role-${Date.now()}-${roles.length}`;
    setRoles((prev) => [
      ...prev,
      {
        id: newId,
        title: "",
        skills: [],
        spots: 1,
      },
    ]);
  };

  // Remove role
  const handleRemoveRole = (index: number) => {
    if (roles.length <= 1) return;
    setRoles((prev) => prev.filter((_, i) => i !== index));
    if (leaderRoleIndex >= index && leaderRoleIndex > 0) {
      setLeaderRoleIndex((prev) => prev - 1);
    }
  };

  // Update role title
  const handleUpdateRoleTitle = (index: number, title: string) => {
    setRoles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title };
      return updated;
    });
  };

  // Update role spots
  const handleUpdateRoleSpots = (index: number, delta: number) => {
    setRoles((prev) => {
      const updated = [...prev];
      const nextSpots = Math.max(1, Math.min(8, updated[index].spots + delta));
      updated[index] = { ...updated[index], spots: nextSpots };
      return updated;
    });
  };

  // Add skill to role
  const handleAddSkillToRole = (roleIndex: number, skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    setRoles((prev) => {
      const updated = [...prev];
      const currentSkills = updated[roleIndex].skills;
      if (!currentSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
        updated[roleIndex] = {
          ...updated[roleIndex],
          skills: [...currentSkills, trimmed],
        };
      }
      return updated;
    });
    setSkillInputs((prev) => ({
      ...prev,
      [roles[roleIndex].id]: "",
    }));
  };

  // Remove skill from role
  const handleRemoveSkillFromRole = (roleIndex: number, skillToRemove: string) => {
    setRoles((prev) => {
      const updated = [...prev];
      updated[roleIndex] = {
        ...updated[roleIndex],
        skills: updated[roleIndex].skills.filter((s) => s !== skillToRemove),
      };
      return updated;
    });
  };

  // Add Teammate Invite
  const handleAddInvite = () => {
    const email = newInviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address for invitation.");
      return;
    }

    if (invites.some((i) => i.email === email)) {
      setErrorMessage("This email is already in the invitation list.");
      return;
    }

    setInvites((prev) => [
      ...prev,
      {
        id: `inv-${Date.now()}`,
        email,
        roleIndex: newInviteRoleIndex,
      },
    ]);
    setNewInviteEmail("");
    setNewInviteRoleIndex(-1);
    setErrorMessage(null);
  };

  // Remove Teammate Invite
  const handleRemoveInvite = (inviteId: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  // Submit Team Creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = teamName.trim();
    if (!name) {
      setErrorMessage("Please enter a squad / team name.");
      return;
    }

    if (!selectedEventId) {
      setErrorMessage("Please select an event for this squad.");
      return;
    }

    if (!isEligibleForSelectedEvent) {
      setErrorMessage(
        "This event is restricted to members of its host organization. You cannot create a squad for it."
      );
      return;
    }

    // Validate roles
    const validRoles = roles.filter((r) => r.title.trim().length > 0);
    if (validRoles.length === 0) {
      setErrorMessage("Please define at least one valid squad role with a title.");
      return;
    }

    if (leaderRoleIndex < 0 || leaderRoleIndex >= roles.length) {
      setErrorMessage("Please select your designated role as Squad Leader.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build roles DTO
      const rolesPayload: TeamRoleItem[] = roles.map((r) => ({
        title: r.title.trim(),
        skills: r.skills,
        spots: r.spots,
      }));

      // Collect all flat skills as requirements
      const allRequirements = [
        ...new Set(roles.flatMap((r) => r.skills).filter(Boolean)),
      ];

      // Build role invites payload
      const roleInvitesPayload = invites.map((inv) => {
        const assignedRole =
          inv.roleIndex >= 0 && inv.roleIndex < roles.length
            ? roles[inv.roleIndex]
            : null;
        return {
          email: inv.email,
          roleTitle: assignedRole ? assignedRole.title : undefined,
          roleSkills: assignedRole ? assignedRole.skills : undefined,
        };
      });

      const res = await teamsApi.createTeam({
        eventId: selectedEventId,
        name,
        roles: rolesPayload,
        leaderRoleIndex,
        requirements: allRequirements,
        roleInvites: roleInvitesPayload.length > 0 ? roleInvitesPayload : undefined,
        invites: roleInvitesPayload.length === 0 && invites.length > 0
          ? invites.map((i) => i.email)
          : undefined,
      });

      if (refreshProfile) {
        try {
          await refreshProfile(true);
        } catch {
          // ignore
        }
      }

      const createdTeamId = res?.teamId || (res as any)?.team?.id || (res as any)?.id;
      if (onSuccess && createdTeamId) {
        onSuccess(createdTeamId);
      }
      onClose();
    } catch (err: any) {
      console.error("[CreateTeamModal] Creation error:", err);
      setErrorMessage(err?.message || "Failed to create squad. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface border border-border-main rounded-3xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-main/60 bg-surface-dim/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-action text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-main font-heading tracking-tight">
                Create New Squad
              </h2>
              <p className="text-xs text-text-muted">
                Form a hackathon team, define designated roles, and recruit talent.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-1 duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Event Context / Selection */}
          <StepSelectEvent
            lockedEvent={lockedEvent}
            initialEventId={initialEventId}
            selectedEventId={selectedEventId}
            setSelectedEventId={setSelectedEventId}
            eventsList={eventsList}
            loadingEvents={loadingEvents}
            eventSearch={eventSearch}
            setEventSearch={setEventSearch}
            isEventDropdownOpen={isEventDropdownOpen}
            setIsEventDropdownOpen={setIsEventDropdownOpen}
            eventDropdownRef={eventDropdownRef}
            filteredEvents={filteredEvents}
            activeEvent={activeEvent}
            isEligibleForSelectedEvent={isEligibleForSelectedEvent}
          />

          {/* Section 2 & 3: Squad Name & Presets */}
          <StepTeamDetails
            teamName={teamName}
            setTeamName={setTeamName}
            selectedPreset={selectedPreset}
            handleApplyPreset={handleApplyPreset}
          />

          {/* Section 4 & 5: Role Builder & Leader Selection */}
          <StepRoleBuilder
            roles={roles}
            leaderRoleIndex={leaderRoleIndex}
            setLeaderRoleIndex={setLeaderRoleIndex}
            skillInputs={skillInputs}
            setSkillInputs={setSkillInputs}
            handleAddRole={handleAddRole}
            handleRemoveRole={handleRemoveRole}
            handleUpdateRoleTitle={handleUpdateRoleTitle}
            handleUpdateRoleSpots={handleUpdateRoleSpots}
            handleAddSkillToRole={handleAddSkillToRole}
            handleRemoveSkillFromRole={handleRemoveSkillFromRole}
          />

          {/* Section 6: Initial Teammate Invites */}
          <StepInviteMembers
            roles={roles}
            invites={invites}
            newInviteEmail={newInviteEmail}
            setNewInviteEmail={setNewInviteEmail}
            newInviteRoleIndex={newInviteRoleIndex}
            setNewInviteRoleIndex={setNewInviteRoleIndex}
            isInviteRoleDropdownOpen={isInviteRoleDropdownOpen}
            setIsInviteRoleDropdownOpen={setIsInviteRoleDropdownOpen}
            inviteRoleDropdownRef={inviteRoleDropdownRef}
            handleAddInvite={handleAddInvite}
            handleRemoveInvite={handleRemoveInvite}
          />

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-main">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !teamName.trim() ||
                !selectedEventId ||
                !isEligibleForSelectedEvent ||
                roles.length === 0
              }
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-xs font-black shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Squad...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Squad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Users,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  MapPin,
  Check,
  ChevronDown,
  Loader2,
  AlertCircle,
  Crown,
  Layers,
  Search,
  CheckCircle2,
  Code2,
  Brain,
  Smartphone,
  Wrench,
  Briefcase,
} from "lucide-react";
import { useUserContext } from "../contexts/UserContext";
import { eventsApi, teamsApi, EventItem, TeamRoleItem } from "../services/api";
import { ScopeBadge } from "./Badges";

export interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (teamId: string) => void;
  initialEventId?: string;
  initialEvent?: {
    id: string;
    title: string;
    dateStr?: string;
    location?: string;
    isGlobal?: boolean;
    orgId?: string | null;
  };
}

interface RoleDraft {
  id: string; // temporary client ID
  title: string;
  skills: string[];
  spots: number;
}

interface InviteDraft {
  id: string;
  email: string;
  roleIndex: number; // index in roles array, or -1 for unassigned
}

const PRESET_TEMPLATES = [
  {
    id: "fullstack",
    name: "Full-Stack Web App",
    icon: Code2,
    description: "Frontend + Backend + UI/UX architecture",
    roles: [
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
    ],
  },
  {
    id: "aiml",
    name: "AI / ML Product",
    icon: Brain,
    description: "Machine Learning + Full Stack integration",
    roles: [
      {
        id: "role-1",
        title: "AI / ML Specialist",
        skills: ["Python", "PyTorch", "LLMs", "FastAPI"],
        spots: 1,
      },
      {
        id: "role-2",
        title: "Full-Stack Integrator",
        skills: ["React", "TypeScript", "Docker", "Node.js"],
        spots: 1,
      },
      {
        id: "role-3",
        title: "Product & Data Lead",
        skills: ["Data Analysis", "Product Management", "Python"],
        spots: 1,
      },
    ],
  },
  {
    id: "mobile",
    name: "Mobile App Squad",
    icon: Smartphone,
    description: "Cross-platform mobile & cloud backend",
    roles: [
      {
        id: "role-1",
        title: "Mobile Developer",
        skills: ["React Native", "TypeScript", "Tailwind CSS"],
        spots: 1,
      },
      {
        id: "role-2",
        title: "Cloud & API Lead",
        skills: ["Node.js", "PostgreSQL", "AWS", "FastAPI"],
        spots: 1,
      },
      {
        id: "role-3",
        title: "UI Designer",
        skills: ["Figma", "Mobile UI", "Prototyping"],
        spots: 1,
      },
    ],
  },
  {
    id: "custom",
    name: "Custom Squad",
    icon: Wrench,
    description: "Define positions from scratch",
    roles: [
      {
        id: "role-1",
        title: "Lead Developer",
        skills: ["React", "TypeScript"],
        spots: 1,
      },
    ],
  },
];

const POPULAR_SKILL_SUGGESTIONS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "Next.js",
  "FastAPI",
  "PostgreSQL",
  "Docker",
  "Tailwind CSS",
  "PyTorch",
  "Figma",
  "MongoDB",
  "GraphQL",
  "AWS",
  "Flutter",
  "React Native",
];

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEventId,
  initialEvent,
}) => {
  const { profile, userUniversity, refreshProfile } = useUserContext();

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

  // Check event eligibility
  const isEligibleForSelectedEvent = useMemo(() => {
    if (!activeEvent) return true;
    if (activeEvent.isGlobal) return true;
    const userUni = (profile?.university || userUniversity || "").toLowerCase().trim();
    const eventLoc = (activeEvent.location || "").toLowerCase().trim();
    return Boolean(userUni && eventLoc && userUni === eventLoc);
  }, [activeEvent, profile, userUniversity]);

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
        "This event is restricted to students of its host campus. You cannot create a squad for it."
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

      if (onSuccess) {
        onSuccess(res.teamId);
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
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary-action" />
              <span>Target Event / Hackathon</span>
            </label>

            {lockedEvent || initialEventId ? (
              // Mode A: Locked Event Banner
              <div className="p-3.5 rounded-2xl bg-surface-dim border border-border-main flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-text-main truncate font-heading">
                      {lockedEvent?.title || "Host Event"}
                    </span>
                    <ScopeBadge isGlobal={lockedEvent?.isGlobal ?? false} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    {lockedEvent?.dateStr && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {lockedEvent.dateStr}
                      </span>
                    )}
                    {lockedEvent?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {lockedEvent.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-surface border border-border-main text-text-muted shrink-0">
                  Locked Context
                </div>
              </div>
            ) : (
              // Mode B: Searchable Event Select
              <div className="relative" ref={eventDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsEventDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-dim border border-border-main text-left text-xs sm:text-sm hover:border-primary-action/50 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary-action"
                >
                  {activeEvent ? (
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2 pr-2">
                      <div className="truncate">
                        <span className="font-bold text-text-main block truncate font-heading">
                          {activeEvent.title}
                        </span>
                        <span className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                          <span>{activeEvent.location || "Virtual / Global"}</span>
                          <span>•</span>
                          <span>
                            {"dateStr" in activeEvent && activeEvent.dateStr
                              ? activeEvent.dateStr
                              : "date" in activeEvent && activeEvent.date
                              ? new Date(activeEvent.date).toLocaleDateString()
                              : "Upcoming"}
                          </span>
                        </span>
                      </div>
                      <ScopeBadge isGlobal={Boolean(activeEvent.isGlobal)} />
                    </div>
                  ) : (
                    <span className="text-text-muted">Select an event or hackathon...</span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                      isEventDropdownOpen ? "rotate-180 text-primary-action" : ""
                    }`}
                  />
                </button>

                {isEventDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-surface rounded-2xl border border-border-main shadow-2xl p-2.5 space-y-2 max-h-72 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search hackathons or campus events..."
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-dim rounded-xl border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary-action"
                        autoFocus
                      />
                    </div>

                    <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                      {loadingEvents ? (
                        <div className="p-4 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-action" />
                          <span>Loading events...</span>
                        </div>
                      ) : filteredEvents.length > 0 ? (
                        filteredEvents.map((evt) => {
                          const isSelected = selectedEventId === evt.id;
                          return (
                            <button
                              key={evt.id}
                              type="button"
                              onClick={() => {
                                setSelectedEventId(evt.id);
                                setIsEventDropdownOpen(false);
                                setEventSearch("");
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? "bg-primary-light text-primary-action border border-primary-border font-bold"
                                  : "hover:bg-surface-dim text-text-main border border-transparent font-medium"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate block">
                                  {evt.title}
                                </div>
                                <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                                  <span>{evt.location || "Global"}</span>
                                  <span>•</span>
                                  <span>{new Date(evt.date).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <ScopeBadge isGlobal={evt.isGlobal} />
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-text-muted">
                          No matching events found.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isEligibleForSelectedEvent && (
              <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                This event is locked to students of {activeEvent?.location}. You are currently affiliated with {profile?.university || "a different institution"}.
              </p>
            )}
          </div>

          {/* Section 2: Squad Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-action" />
                <span>Squad / Team Name</span>
              </label>
              <span className="text-[10px] text-text-muted font-medium">
                {teamName.length}/50
              </span>
            </div>

            <input
              type="text"
              placeholder="e.g. NeuralSync AI Agents, CloudZero Hackers, FinTech Pioneer"
              maxLength={50}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-surface-dim rounded-2xl border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary-action transition-all"
              required
            />
          </div>

          {/* Section 3: Squad Presets / Architecture Templates */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary-action" />
                <span>Squad Preset Templates</span>
              </label>
              <span className="text-[10px] text-text-muted">1-Click Auto Fill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_TEMPLATES.map((preset) => {
                const IconComponent = preset.icon;
                const isSelected = selectedPreset === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "bg-primary-light border-primary-border ring-2 ring-primary-action/20 text-primary-action"
                        : "bg-surface hover:bg-surface-dim border-border-main text-text-main"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected
                            ? "bg-primary-action text-white"
                            : "bg-surface-dim text-text-muted"
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-action" />}
                    </div>

                    <div>
                      <span className="text-xs font-bold block truncate font-heading">
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-text-muted block truncate mt-0.5">
                        {preset.roles.length} Roles
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Structured Role Builder */}
          <div className="space-y-3 pt-2 border-t border-border-main/60">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary-action" />
                  <span>Configured Squad Roles & Skill Requirements</span>
                </label>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Specify titles, required skills, and open recruitment spots for each position.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddRole}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary-border bg-primary-light text-primary-action text-xs font-bold hover:bg-primary-action hover:text-white transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            </div>

            {/* Role Cards List */}
            <div className="space-y-3">
              {roles.map((role, rIndex) => {
                const isLeaderChosenRole = leaderRoleIndex === rIndex;
                const roleInputVal = skillInputs[role.id] || "";

                return (
                  <div
                    key={role.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      isLeaderChosenRole
                        ? "bg-primary-light/30 border-primary-border shadow-xs"
                        : "bg-surface-dim/70 border-border-main"
                    }`}
                  >
                    {/* Role Header (Title + Slots + Delete) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          placeholder="e.g. Frontend Developer, AI Specialist, Product Designer"
                          value={role.title}
                          onChange={(e) => handleUpdateRoleTitle(rIndex, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-surface rounded-xl border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary-action"
                          required
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {/* Spot Stepper */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface border border-border-main shadow-2xs">
                          <span className="text-[11px] font-semibold text-text-muted mr-1">
                            Slots:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateRoleSpots(rIndex, -1)}
                            disabled={role.spots <= 1}
                            className="w-5 h-5 rounded-md flex items-center justify-center bg-surface-dim hover:bg-border-main text-text-main text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-text-main w-4 text-center">
                            {role.spots}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateRoleSpots(rIndex, 1)}
                            disabled={role.spots >= 8}
                            className="w-5 h-5 rounded-md flex items-center justify-center bg-surface-dim hover:bg-border-main text-text-main text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Remove Role */}
                        {roles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRole(rIndex)}
                            className="p-1.5 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove Role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Skill Tags for this Role */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {role.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface text-text-main border border-border-main text-[11px] font-medium shadow-2xs"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkillFromRole(rIndex, skill)}
                              className="text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        {/* Tag Input */}
                        <input
                          type="text"
                          placeholder={
                            role.skills.length === 0
                              ? "+ Type skill & press Enter (e.g. React, Docker)"
                              : "+ Add skill tag"
                          }
                          value={roleInputVal}
                          onChange={(e) =>
                            setSkillInputs((prev) => ({
                              ...prev,
                              [role.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              handleAddSkillToRole(rIndex, roleInputVal);
                            }
                          }}
                          onBlur={() => {
                            if (roleInputVal.trim()) {
                              handleAddSkillToRole(rIndex, roleInputVal);
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] bg-surface rounded-lg border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary-action min-w-[140px]"
                        />
                      </div>

                      {/* Quick skill chips */}
                      {role.skills.length < 3 && (
                        <div className="flex flex-wrap gap-1 items-center pt-1">
                          <span className="text-[10px] text-text-muted mr-1">Suggestions:</span>
                          {POPULAR_SKILL_SUGGESTIONS.slice(0, 6)
                            .filter((s) => !role.skills.includes(s))
                            .map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleAddSkillToRole(rIndex, s)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-surface hover:bg-primary-light hover:text-primary-action text-text-muted border border-border-main transition-colors cursor-pointer"
                              >
                                + {s}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Mandatory Leader Role Selection */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-action/10 via-surface-dim/60 to-surface-dim border border-primary-action/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5 font-heading">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Your Designated Role (Team Leader)</span>
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-action text-white">
                Mandatory
              </span>
            </div>

            <p className="text-xs text-text-muted">
              Select which position you will fill in this squad. Upon squad creation, you will automatically claim 1 slot for this role.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roles.map((r, idx) => {
                const isSelected = leaderRoleIndex === idx;
                const roleTitleDisplay = r.title.trim() || `Position #${idx + 1}`;
                const remainingOpenSpotsAfterCreation = Math.max(0, r.spots - 1);

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setLeaderRoleIndex(idx)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-primary-action text-white border-primary-action shadow-sm"
                        : "bg-surface hover:bg-surface-dim border-border-main text-text-main"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block truncate">
                        {roleTitleDisplay}
                      </span>
                      <span
                        className={`text-[10px] block mt-0.5 ${
                          isSelected ? "text-white/80" : "text-text-muted"
                        }`}
                      >
                        {isSelected
                          ? `1 slot claimed by you (${remainingOpenSpotsAfterCreation} open for recruitment)`
                          : `${r.spots} configured slot${r.spots > 1 ? "s" : ""}`}
                      </span>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: Initial Teammate Invites (Optional) */}
          <div className="space-y-3 pt-2 border-t border-border-main/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-action" />
                <span>Invite Teammates Now (Optional)</span>
              </label>
              <span className="text-[10px] text-text-muted">In-App & Email Alert</span>
            </div>

            {/* Add Invite Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="email"
                placeholder="Teammate's email address..."
                value={newInviteEmail}
                onChange={(e) => setNewInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInvite();
                  }
                }}
                className="flex-1 px-3.5 py-2 text-xs bg-surface-dim rounded-xl border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary-action"
              />

              {/* Custom Role Select Dropdown matching RoleSelectDropdown aesthetics */}
              <div className="relative" ref={inviteRoleDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsInviteRoleDropdownOpen((prev) => !prev)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim/70 text-text-main text-xs font-semibold shadow-2xs transition-all cursor-pointer min-w-[170px] max-w-[220px] focus:outline-hidden focus:ring-2 focus:ring-primary-action/30 focus:border-primary-action"
                  title="Designate squad role for this invite"
                  aria-haspopup="listbox"
                  aria-expanded={isInviteRoleDropdownOpen}
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <div className="p-1 rounded-md bg-primary-light text-primary-action shrink-0">
                      <Briefcase className="w-3 h-3" />
                    </div>
                    <span className="truncate font-medium">
                      {newInviteRoleIndex >= 0 && newInviteRoleIndex < roles.length
                        ? roles[newInviteRoleIndex].title.trim() || `Position #${newInviteRoleIndex + 1}`
                        : "Any Open Role"}
                    </span>
                  </div>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${
                      isInviteRoleDropdownOpen ? "rotate-180 text-primary-action" : ""
                    }`}
                  />
                </button>

                {/* Popover Dropdown Menu */}
                {isInviteRoleDropdownOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto bottom-full mb-1.5 z-50 w-72 sm:w-80 bg-surface rounded-2xl border border-border-main shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                    <div className="px-3 py-1.5 border-b border-border-main/60 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                        <Layers className="w-3 h-3 text-primary-action" />
                        Designate Squad Role
                      </span>
                      <span className="text-[10px] font-semibold text-text-muted">
                        {roles.length} Position{roles.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pt-1.5 pr-0.5">
                      {/* Option 1: Any Open Role */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewInviteRoleIndex(-1);
                          setIsInviteRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          newInviteRoleIndex === -1
                            ? "bg-primary-light/70 text-primary-action border border-primary-border/60 font-bold"
                            : "hover:bg-surface-dim text-text-main border border-transparent font-medium"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Any Open Role</span>
                          </div>
                          <span className="text-[10px] text-text-muted block mt-0.5 font-normal">
                            Let candidate pick or assign role later
                          </span>
                        </div>
                        {newInviteRoleIndex === -1 && (
                          <Check className="w-3.5 h-3.5 text-primary-action shrink-0" />
                        )}
                      </button>

                      {/* List of Configured Roles */}
                      {roles.map((r, idx) => {
                        const isSelected = newInviteRoleIndex === idx;
                        const displayTitle = r.title.trim() || `Position #${idx + 1}`;

                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setNewInviteRoleIndex(idx);
                              setIsInviteRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2 ${
                              isSelected
                                ? "bg-primary-light/70 text-primary-action border border-primary-border/60"
                                : "hover:bg-surface-dim text-text-main border border-transparent"
                            }`}
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold truncate block font-heading">
                                  {displayTitle}
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-dim text-text-muted border border-border-main shrink-0">
                                  {r.spots} spot{r.spots > 1 ? "s" : ""}
                                </span>
                              </div>

                              {r.skills && r.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {r.skills.map((skill) => (
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

              <button
                type="button"
                onClick={handleAddInvite}
                className="px-3.5 py-2 rounded-xl bg-surface border border-border-main hover:bg-surface-dim text-text-main text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                + Add
              </button>
            </div>

            {/* List of Pending Invites */}
            {invites.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {invites.map((inv) => {
                  const assignedRoleTitle =
                    inv.roleIndex >= 0 && inv.roleIndex < roles.length
                      ? roles[inv.roleIndex].title || `Role #${inv.roleIndex + 1}`
                      : "Any Open Role";

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border-main text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-text-main truncate">
                          {inv.email}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-light text-primary-action border border-primary-border shrink-0">
                          {assignedRoleTitle}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveInvite(inv.id)}
                        className="text-text-muted hover:text-rose-500 transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

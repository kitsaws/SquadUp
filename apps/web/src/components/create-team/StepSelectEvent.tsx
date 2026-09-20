import React from "react";
import {
  Calendar,
  MapPin,
  ChevronDown,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react";
import { ScopeBadge } from "../Badges";
import { EventItem } from "../../services/api";

interface StepSelectEventProps {
  lockedEvent?: {
    id: string;
    title: string;
    dateStr?: string;
    location?: string | null;
    isGlobal?: boolean;
    orgId?: string | null;
  } | null;
  initialEventId?: string;
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  eventsList: EventItem[];
  loadingEvents: boolean;
  eventSearch: string;
  setEventSearch: (search: string) => void;
  isEventDropdownOpen: boolean;
  setIsEventDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  eventDropdownRef: React.RefObject<HTMLDivElement | null>;
  filteredEvents: EventItem[];
  activeEvent: any;
  isEligibleForSelectedEvent: boolean;
}

export function StepSelectEvent({
  lockedEvent,
  initialEventId,
  selectedEventId,
  setSelectedEventId,
  loadingEvents,
  eventSearch,
  setEventSearch,
  isEventDropdownOpen,
  setIsEventDropdownOpen,
  eventDropdownRef,
  filteredEvents,
  activeEvent,
  isEligibleForSelectedEvent,
}: StepSelectEventProps) {
  return (
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
          This event is restricted to members of organization ({activeEvent?.location || "Host Organization"}). You are not currently a member of this organization in Clerk.
        </p>
      )}
    </div>
  );
}

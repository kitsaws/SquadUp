import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, ArrowRight, Shield, Globe, Lock } from "lucide-react";
import { EventCardData } from "./EventCard";

interface EventTileProps {
  event: EventCardData;
  onSelect?: (event: EventCardData) => void;
  isSelected?: boolean;
}

export function EventTile({ event, onSelect, isSelected = false }: EventTileProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onSelect) {
      onSelect(event);
    } else {
      navigate(`/event/${event.id}`);
    }
  };

  const renderScopeBadge = () => {
    if (event.isGlobal) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-2xs shrink-0">
          <Globe className="w-2.5 h-2.5 text-emerald-500" />
          Global Event
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 shadow-2xs shrink-0">
        <Lock className="w-2.5 h-2.5 text-purple-500 shrink-0" />
        Campus Only
      </span>
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`group bg-surface rounded-xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
        isSelected
          ? "border-primary-action ring-2 ring-primary-action/20 shadow-md"
          : "border-border-main hover:border-primary-border hover:shadow-md"
      }`}
    >
      {/* Left / Main Details */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        {/* Host Avatar / Logo */}
        <div className="w-10 h-10 rounded-xl bg-primary-light text-primary-action flex items-center justify-center font-bold text-sm font-heading shrink-0 shadow-2xs">
          {event.organizerLogo ? (
            <img
              src={event.organizerLogo}
              alt=""
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <Shield className="w-5 h-5" />
          )}
        </div>

        {/* Title, Host Org & Date */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="text-base font-bold text-text-main group-hover:text-primary-action transition-colors font-heading truncate max-w-[340px]"
              title={event.title}
            >
              {event.title}
            </h3>
            <span
              className="text-xs font-semibold text-text-muted truncate max-w-[180px]"
              title={event.organizerName}
            >
              • {event.organizerName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-text-muted">
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              {event.dateStr}
            </span>
            <span
              className="flex items-center gap-1 min-w-0 max-w-[200px]"
              title={event.location}
            >
              <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>

            {event.tracks && event.tracks.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 ml-1">
                {event.tracks.slice(0, 3).map((track, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-dim text-text-main border border-border-main"
                  >
                    {track}
                  </span>
                ))}
                {event.tracks.length > 3 && (
                  <span className="text-[10px] text-text-muted font-semibold">
                    +{event.tracks.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right / Telemetry & Action */}
      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-main/60">
        {/* Scope and Days Badges */}
        <div className="flex items-center gap-2">
          {renderScopeBadge()}
          <span className="text-[10px] font-semibold text-text-muted bg-surface-dim px-2 py-0.5 rounded-full border border-border-main shrink-0">
            In {event.daysRemaining}d
          </span>
        </div>

        {/* Squad counts */}
        <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <strong className="text-text-main">{event.teamsCount}</strong> squads
          </span>
          <span className="text-text-muted/60">•</span>
          <span>{event.participantsCount} hackers</span>
        </div>

        {/* Action button */}
        <button
          type="button"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-light text-primary-action hover:bg-primary-action hover:text-white transition-all cursor-pointer shadow-2xs"
        >
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

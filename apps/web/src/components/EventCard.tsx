import React from "react";
import { Calendar, MapPin, Users, ArrowRight, Shield, Globe, Lock } from "lucide-react";

export interface EventCardData {
  id: string;
  title: string;
  organizerName: string;
  organization?: string;
  organizerLogo?: string;
  dateStr: string;
  location: string;
  isGlobal: boolean;
  daysRemaining: number;
  description: string;
  tracks?: string[];
  teamsCount: number;
  participantsCount: number;
}

interface EventCardProps {
  event: EventCardData;
  onSelect?: (event: EventCardData) => void;
  isSelected?: boolean;
}

export function EventCard({ event, onSelect, isSelected = false }: EventCardProps) {
  const renderScopeBadge = () => {
    if (event.isGlobal) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-2xs">
          <Globe className="w-2.5 h-2.5 text-emerald-500" />
          Global Event
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 shadow-2xs">
        <Lock className="w-2.5 h-2.5 text-purple-500 shrink-0" />
        Campus Only
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelect?.(event)}
      className={`bg-surface rounded-xl border p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isSelected
          ? "border-primary-action ring-2 ring-primary-action/20 shadow-md"
          : "border-border-main hover:border-primary-border hover:shadow-md"
      }`}
    >
      <div>
        {/* Top Meta Bar */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-primary-light text-primary-action flex items-center justify-center font-bold text-xs font-heading shrink-0">
              {event.organizerLogo ? (
                <img src={event.organizerLogo} alt="" className="w-full h-full rounded-md object-cover" />
              ) : (
                <Shield className="w-3.5 h-3.5" />
              )}
            </div>
            <span
              className="text-xs font-semibold text-text-muted truncate max-w-[160px]"
              title={event.organizerName}
            >
              {event.organizerName}
            </span>
          </div>

          {/* Vertically stacked isGlobal & timeRemaining */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {renderScopeBadge()}
            <span className="text-[10px] font-semibold text-text-muted bg-surface-dim px-2 py-0.5 rounded-full border border-border-main">
              In {event.daysRemaining}d
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-text-main group-hover:text-primary-action transition-colors mb-1.5 font-heading">
          {event.title}
        </h3>

        {/* Date & Host University / Organization */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-text-muted mb-3">
          <span className="flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            {event.dateStr}
          </span>
          <span
            className="flex items-center gap-1 min-w-0 max-w-[200px]"
            title={event.organizerName}
          >
            <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate">{event.organizerName}</span>
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-4">
          {event.description}
        </p>

        {/* Track Pills */}
        {event.tracks && event.tracks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {event.tracks.map((track, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-dim text-text-main border border-border-main"
              >
                {track}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Telemetry */}
      <div className="pt-4 border-t border-border-main flex items-center justify-between text-xs mt-auto">
        <div className="flex items-center gap-3 text-text-muted font-medium">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <strong className="text-text-main">{event.teamsCount}</strong> squads looking
          </span>
          <span className="text-text-muted/60">•</span>
          <span>{event.participantsCount} hackers</span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-action hover:text-primary-hover transition-colors">
          View Event <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

import React from "react";
import { Calendar, MapPin, Users, ArrowRight, Shield, Globe, Lock } from "lucide-react";

export interface EventCardData {
  id: string;
  title: string;
  organizerName: string;
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
  // Determine campus affiliation scope
  const isStanford =
    event.location.toLowerCase().includes("stanford") ||
    event.organizerName.toLowerCase().includes("stanford");

  const renderScopeBadge = () => {
    if (event.isGlobal) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <Globe className="w-2.5 h-2.5 text-emerald-600" />
          Global Event
        </span>
      );
    }

    if (isStanford) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
          <Lock className="w-2.5 h-2.5 text-purple-600" />
          Stanford Only
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
        <Lock className="w-2.5 h-2.5 text-slate-500" />
        External Campus
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelect?.(event)}
      className={`bg-white rounded-xl border p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isSelected
          ? "border-blue-600 ring-2 ring-blue-600/20 shadow-md"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div>
        {/* Top Meta Bar */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs font-heading">
              {event.organizerLogo ? (
                <img src={event.organizerLogo} alt="" className="w-full h-full rounded-md object-cover" />
              ) : (
                <Shield className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="text-xs font-semibold text-slate-600 truncate max-w-[140px]">
              {event.organizerName}
            </span>
          </div>

          {/* Vertically stacked isGlobal & timeRemaining */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {renderScopeBadge()}
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
              In {event.daysRemaining}d
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5 font-heading">
          {event.title}
        </h3>

        {/* Date & Location */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {event.dateStr}
          </span>
          <span className="flex items-center gap-1 truncate max-w-[180px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {event.location}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {event.description}
        </p>

        {/* Track Pills */}
        {event.tracks && event.tracks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {event.tracks.map((track, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
              >
                {track}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Telemetry */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-auto">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <strong className="text-slate-800">{event.teamsCount}</strong> squads looking
          </span>
          <span className="text-slate-300">•</span>
          <span>{event.participantsCount} hackers</span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          View Event <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

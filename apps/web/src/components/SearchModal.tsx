import React, { useState, useEffect, useRef } from "react";
import { Search, X, Calendar, Users, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { eventsApi, teamsApi } from "../services/api";

interface SearchResult {
  id: string;
  type: "event" | "team" | "skill";
  title: string;
  subtitle: string;
  badge?: string;
  link: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Live debounced search across events and teams
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [eventsRes, teamsRes] = await Promise.all([
          eventsApi.getEvents({ limit: 4, search: trimmed || undefined }),
          teamsApi.getTeams({ limit: 4, search: trimmed || undefined }),
        ]);

        const combined: SearchResult[] = [
          ...eventsRes.data.map((evt) => ({
            id: `evt-${evt.id}`,
            type: "event" as const,
            title: evt.title,
            subtitle: `${new Date(evt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${evt.location} • ${evt.isGlobal ? "Global" : "Campus"}`,
            badge: `${evt.teamsCount || 0} Teams`,
            link: "/events",
          })),
          ...teamsRes.data.map((t) => ({
            id: `team-${t.id}`,
            type: "team" as const,
            title: t.name,
            subtitle: `${t.event?.title || "Event"} • Needs ${(t.requirements || []).slice(0, 2).join(", ")} • ${t.members.length}/4 spots`,
            badge: t.university || "Squad",
            link: `/team/${t.id}`,
          })),
        ];

        setResults(combined);
      } catch (err) {
        console.warn("[SearchModal] Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search squads, hackathons, skills (e.g. React, TreeHacks)..."
            className="w-full text-slate-900 placeholder:text-slate-400 text-sm outline-hidden font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-action" />
              <span>Searching squads & hackathons...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {query.trim()
                ? `No matching squads or events found for "${query}".`
                : "Type keywords to search across active squads and hackathons."}
            </div>
          ) : (
            results.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                onClick={onClose}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-primary-light group-hover:text-primary-action transition-colors shrink-0">
                    {item.type === "event" && <Calendar className="w-4 h-4" />}
                    {item.type === "team" && <Users className="w-4 h-4" />}
                    {item.type === "skill" && <Sparkles className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-primary-action transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500">{item.subtitle}</div>
                  </div>
                </div>

                {item.badge && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-primary-light group-hover:text-primary-action transition-colors shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200">↓</kbd></span>
            <span>Select: <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200">Enter</kbd></span>
          </div>
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200">Esc</kbd> to exit</span>
        </div>
      </div>
    </div>
  );
}

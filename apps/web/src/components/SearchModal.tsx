import React, { useState, useEffect, useRef } from "react";
import { Search, X, Calendar, Users, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "event" | "team" | "skill";
  title: string;
  subtitle: string;
  badge?: string;
  link: string;
}

const DEMO_SEARCH_DATA: SearchResult[] = [
  {
    id: "e1",
    type: "event",
    title: "TreeHacks 2026",
    subtitle: "Oct 15–17, 2026 • Stanford, CA • Global Event",
    badge: "12 Teams",
    link: "/events",
  },
  {
    id: "e2",
    type: "event",
    title: "CalHacks 12.0",
    subtitle: "Nov 02–04, 2026 • San Francisco, CA • Global Event",
    badge: "8 Teams",
    link: "/events",
  },
  {
    id: "e3",
    type: "event",
    title: "Stanford AI & MedTech Showcase",
    subtitle: "Dec 05, 2026 • Stanford Campus Only",
    badge: "5 Teams",
    link: "/events",
  },
  {
    id: "t1",
    type: "team",
    title: "AI Agents Guild",
    subtitle: "TreeHacks 2026 • Needs React, FastAPI • 3/4 Spots",
    badge: "92% Match",
    link: "/teams",
  },
  {
    id: "t2",
    type: "team",
    title: "CloudScale Engine",
    subtitle: "TreeHacks 2026 • Needs Docker, Kubernetes • 2/4 Spots",
    badge: "85% Match",
    link: "/teams",
  },
  {
    id: "t3",
    type: "team",
    title: "NeuroVision Health",
    subtitle: "CalHacks 12.0 • Needs PyTorch, React Native • 3/4 Spots",
    badge: "88% Match",
    link: "/teams",
  },
  {
    id: "s1",
    type: "skill",
    title: "React & TypeScript",
    subtitle: "14 teams actively recruiting frontend developers",
    badge: "Skill Match",
    link: "/teams",
  },
  {
    id: "s2",
    type: "skill",
    title: "FastAPI & Python",
    subtitle: "9 teams seeking asynchronous API developers",
    badge: "Skill Match",
    link: "/teams",
  },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Can be toggled externally
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = query.trim()
    ? DEMO_SEARCH_DATA.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : DEMO_SEARCH_DATA.slice(0, 5);

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
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No matching squads, events, or skills found for "{query}".
            </div>
          ) : (
            filtered.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                onClick={onClose}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                    {item.type === "event" && <Calendar className="w-4 h-4" />}
                    {item.type === "team" && <Users className="w-4 h-4" />}
                    {item.type === "skill" && <Sparkles className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500">{item.subtitle}</div>
                  </div>
                </div>

                {item.badge && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors shrink-0">
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

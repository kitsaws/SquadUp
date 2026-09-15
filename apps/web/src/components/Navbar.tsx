import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  CheckCircle2,
  Sparkles,
  Users,
  Calendar,
  Check,
  X,
} from "lucide-react";
import { useUser } from "@clerk/react";
import { SearchModal } from "./SearchModal";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  unread: boolean;
  link?: string;
  type: "application" | "event" | "team";
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "New candidate application",
    description: "Alex Rivera applied for PostgreSQL Lead in NeuroVision Health.",
    timeAgo: "2h ago",
    unread: true,
    link: "/teams?id=t-neurovision",
    type: "application",
  },
  {
    id: "n2",
    title: "TreeHacks 2026 Team Roster Notice",
    description: "Squad formation window closes in 5 days.",
    timeAgo: "1d ago",
    unread: true,
    link: "/events",
    type: "event",
  },
  {
    id: "n3",
    title: "Squad invitation accepted",
    description: "Sofia Rodriguez joined NeuroVision Health as ML Engineer.",
    timeAgo: "2d ago",
    unread: false,
    link: "/teams?id=t-neurovision",
    type: "team",
  },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const notificationsRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Events", path: "/events" },
    { label: "Teams", path: "/teams" },
    { label: "Playground", path: "/playground", isSpecial: true },
  ];

  const navContainerRef = useRef<HTMLElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = navLinks.findIndex((l) => {
        if (l.path === "/") return location.pathname === "/";
        return location.pathname.startsWith(l.path);
      });

      if (activeIndex !== -1 && linksRef.current[activeIndex] && navContainerRef.current) {
        const linkEl = linksRef.current[activeIndex]!;
        const navEl = navContainerRef.current;
        const linkRect = linkEl.getBoundingClientRect();
        const navRect = navEl.getBoundingClientRect();

        setIndicatorStyle({
          left: linkRect.left - navRect.left + 6,
          width: Math.max(0, linkRect.width - 12),
          opacity: 1,
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [location.pathname]);

  return (
    <>
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-blue-700 transition-colors font-heading">
                S
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 font-heading">
                Squad<span className="text-blue-600">Up</span>
              </span>
            </Link>

            {/* Nav Links with sliding indicator bar */}
            <nav ref={navContainerRef} className="hidden md:flex items-center gap-1 relative h-16">
              {navLinks.map((link, idx) => {
                const isActive =
                  link.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(link.path);

                return (
                  <Link
                    key={link.path}
                    ref={(el) => {
                      linksRef.current[idx] = el;
                    }}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                      isActive
                        ? "text-blue-600 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {link.isSpecial && (
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    )}
                    {link.label}
                  </Link>
                );
              })}

              {/* Sliding Bottom Active Indicator Bar */}
              <span
                className="absolute bottom-0 h-[3px] bg-blue-600 rounded-t-full transition-all duration-300 ease-out pointer-events-none"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity,
                }}
              />
            </nav>
          </div>

          {/* Right: Search trigger, Notification Menu, Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Search Button (Triggers Command Palette Modal) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-medium cursor-pointer shadow-2xs"
              title="Search squads, hackathons, and skills (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] border border-slate-200 font-mono text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Notification Bell + Dropdown Menu */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 relative transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </button>

              {/* Notification Popover */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Notifications
                      </h4>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.link) {
                            navigate(item.link);
                            setIsNotificationsOpen(false);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          item.unread
                            ? "bg-blue-50/40 border-blue-100 hover:bg-blue-50/70"
                            : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-100"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-2xs">
                          {item.type === "application" ? (
                            <Users className="w-3.5 h-3.5" />
                          ) : (
                            <Calendar className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {item.title}
                            </h5>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {item.timeAgo}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <Link
                      to="/teams?id=t-neurovision"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Manage Squad Applications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar (Navigates directly to /profile) */}
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-blue-500/30 transition-all cursor-pointer group"
              title="View your SquadUp Profile"
            >
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || "Avatar"}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-heading shadow-2xs group-hover:bg-blue-600 transition-colors">
                  {user?.firstName ? user.firstName[0] : "S"}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Spotlight Command Palette Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

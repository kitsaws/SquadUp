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
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { SignInButton, SignUpButton } from "@clerk/react";
import { useUserContext } from "../contexts/UserContext";
import { usePalette } from "../contexts/PaletteContext";
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
  const { user, profile, isSignedIn } = useUserContext();
  const { themeMode, toggleThemeMode, isDark } = usePalette();
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

  // Global Ctrl+K / Cmd+K shortcut listener to toggle Search Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      <header className="bg-surface border-b border-border-main sticky top-0 z-40 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary-action text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-primary-hover transition-colors font-heading">
                S
              </div>
              <span className="text-xl font-bold tracking-tight text-text-main font-heading">
                Squad<span className="text-primary-action">Up</span>
              </span>
            </Link>

            {/* Conditional: Standard Nav Links OR Onboarding Step Progression */}
            {location.pathname.startsWith("/onboarding") ? (
              <div className="flex items-center gap-2 sm:gap-6 py-2">
                {/* Step 1 Indicator */}
                {(() => {
                  const currentStep = parseInt(
                    new URLSearchParams(location.search).get("step") || "1",
                    10
                  );

                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            currentStep > 1
                              ? "bg-best-fit text-best-fit-dark shadow-2xs"
                              : currentStep === 1
                              ? "bg-primary-action text-white ring-4 ring-primary-light shadow-2xs"
                              : "bg-surface-dim text-text-muted border border-border-main"
                          }`}
                        >
                          {currentStep > 1 ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <span>1</span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold hidden sm:inline ${
                            currentStep === 1
                              ? "text-text-main font-bold"
                              : currentStep > 1
                              ? "text-text-main"
                              : "text-text-muted"
                          }`}
                        >
                          Select Campus
                        </span>
                      </div>

                      {/* Connecting Progress Track */}
                      <div className="w-8 sm:w-12 h-0.5 bg-border-main rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-primary-action transition-all duration-300 ${
                            currentStep > 1 ? "w-full" : "w-0"
                          }`}
                        />
                      </div>

                      {/* Step 2 Indicator */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            currentStep >= 3
                              ? "bg-best-fit text-best-fit-dark shadow-2xs"
                              : currentStep === 2
                              ? "bg-primary-action text-white ring-4 ring-primary-light shadow-2xs"
                              : "bg-surface-dim text-text-muted border border-border-main"
                          }`}
                        >
                          {currentStep >= 3 ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <span>2</span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold hidden sm:inline ${
                            currentStep === 2
                              ? "text-text-main font-bold"
                              : currentStep >= 3
                              ? "text-text-main"
                              : "text-text-muted"
                          }`}
                        >
                          Build Profile
                        </span>
                      </div>

                      {/* Progress percentage pill */}
                      <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full bg-surface-dim text-text-muted text-[11px] font-semibold border border-border-main ml-2">
                        {currentStep === 1
                          ? "50% Complete"
                          : currentStep === 2
                          ? "Step 2 of 2"
                          : "Ready"}
                      </span>
                    </>
                  );
                })()}
              </div>
            ) : (
              /* Nav Links with sliding indicator bar */
              <nav
                ref={navContainerRef}
                className="hidden md:flex items-center gap-1 relative h-16"
              >
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
                          ? "text-primary-action font-bold"
                          : "text-text-muted hover:text-text-main hover:bg-surface-dim"
                      }`}
                    >
                      {link.isSpecial && (
                        <Sparkles className="w-3.5 h-3.5 text-campus-explorer animate-pulse" />
                      )}
                      {link.label}
                    </Link>
                  );
                })}

                {/* Sliding Bottom Active Indicator Bar */}
                <span
                  className="absolute bottom-0 h-[3px] bg-primary-action rounded-t-full transition-all duration-300 ease-out pointer-events-none"
                  style={{
                    left: `${indicatorStyle.left}px`,
                    width: `${indicatorStyle.width}px`,
                    opacity: indicatorStyle.opacity,
                  }}
                />
              </nav>
            )}
          </div>

          {/* Right: Search trigger, Theme switcher, Notification Menu, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search Button (Triggers Command Palette Modal) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-main bg-surface-dim/60 text-text-muted hover:bg-surface-dim hover:text-text-main hover:border-border-main transition-all text-xs font-medium cursor-pointer shadow-2xs"
              title="Search squads, hackathons, and skills (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-text-muted" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border-main font-mono text-text-muted text-[10px]">
                ⌘K
              </kbd>
            </button>

            {/* Quick Theme Switcher Button */}
            <button
              onClick={toggleThemeMode}
              className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              title={`Theme: ${isDark ? "Dark" : "Light"} (Click to switch)`}
            >
              {isDark ? (
                <Moon className="w-4 h-4 text-primary-action" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {isSignedIn ? (
              <>
                {/* Notification Bell + Dropdown Menu */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-dim relative transition-colors cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                       <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-action ring-2 ring-surface" />
                    )}
                  </button>

                  {/* Notification Popover */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-2xl border border-border-main shadow-xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-border-main">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-text-main uppercase tracking-wider">
                            Notifications
                          </h4>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-primary-light text-primary-action text-[10px] font-bold">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[11px] font-semibold text-primary-action hover:underline cursor-pointer"
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
                                ? "bg-primary-light border-primary-border"
                                : "bg-surface-dim/40 border-border-main hover:bg-surface-dim"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-surface border border-border-main flex items-center justify-center text-primary-action shrink-0 mt-0.5 shadow-2xs">
                              {item.type === "application" ? (
                                <Users className="w-3.5 h-3.5" />
                              ) : (
                                <Calendar className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="text-xs font-bold text-text-main truncate">
                                  {item.title}
                                </h5>
                                <span className="text-[10px] text-text-muted shrink-0">
                                  {item.timeAgo}
                                </span>
                              </div>
                              <p className="text-xs text-text-muted line-clamp-2 mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-border-main text-center">
                        <Link
                          to="/teams?id=t-neurovision"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-xs font-bold text-primary-action hover:underline"
                        >
                          Manage Squad Applications →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile Avatar (Navigates directly to /profile/:id) */}
                <button
                  onClick={() => {
                    const targetId = profile?.userId || profile?.id || user?.id;
                    navigate(targetId ? `/profile/${targetId}` : "/profile");
                  }}
                  className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary-action/30 transition-all cursor-pointer group"
                  title="View your SquadUp Profile"
                >
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || "Avatar"}
                      className="w-8 h-8 rounded-full object-cover border border-border-main shadow-2xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-dim text-text-main border border-border-main flex items-center justify-center text-xs font-bold font-heading shadow-2xs group-hover:bg-primary-action group-hover:text-white transition-colors">
                      {user?.firstName ? user.firstName[0] : "S"}
                    </div>
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer">
                    Log In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-action hover:bg-primary-hover transition-colors shadow-xs cursor-pointer">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spotlight Command Palette Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useJobContext } from "../contexts/JobContext";
import { useUser, useClerk, SignInButton } from "@clerk/react";
import { Link, useParams } from "react-router-dom";
import {
  Shield,
  FileText,
  Building,
  GraduationCap,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Settings,
  ArrowUpRight,
  Upload,
  CheckCircle2,
  Users,
  ArrowRight,
  ArrowLeft,
  Crown,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  LogOut,
  Pencil,
  ChevronDown,
  Palette,
  Mail,
  Copy,
  Check,
  Sliders,
  Trophy,
} from "lucide-react";
import { toast } from "react-toastify";
import { SkillTag, VerificationBadge } from "../components/Badges";
import { EditProfileModal, BannerConfig } from "../components/EditProfileModal";
import { UserPreferencesModal } from "../components/UserPreferencesModal";
import { usePalette } from "../contexts/PaletteContext";
import { useUserContext } from "../contexts/UserContext";
import {
  profileApi,
  preferencesApi,
  applicationsApi,
  UserProfileResponse,
  CandidateApplicationItem,
} from "../services/api";

function GithubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function LinkedinIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.65 1.65 0 0 0-1.66 1.65 1.66 1.66 0 0 0 1.66 1.65 1.66 1.66 0 0 0 1.66-1.65c0-.92-.74-1.65-1.66-1.65z" />
    </svg>
  );
}

const formatGithubUrl = (url?: string | null) => {
  if (!url) return "#";
  let trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("github.com/")) return `https://${trimmed}`;
  const handle = trimmed.replace(/^@/, "");
  return `https://github.com/${handle}`;
};

const formatLinkedinUrl = (url?: string | null) => {
  if (!url) return "#";
  let trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("linkedin.com/")) return `https://${trimmed}`;
  const handle = trimmed.replace(/^@/, "");
  if (handle.startsWith("in/")) return `https://linkedin.com/${handle}`;
  return `https://linkedin.com/in/${handle}`;
};

export function Profile() {
  const params = useParams<{ id?: string; candidateId?: string }>();
  const urlId = params.id || params.candidateId;
  const { jobId, isUploading, status, profileData } = useJobContext();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { updateToken } = usePalette();
  const {
    profile: ctxProfile,
    isLoadingProfile: isCtxLoading,
    refreshProfile: refreshCtxProfile,
    updateCachedProfile,
  } = useUserContext();

  const isOwner = Boolean(
    !urlId ||
    (user && (urlId === user.id || (ctxProfile && (urlId === ctxProfile.userId || urlId === ctxProfile.clerkId || urlId === ctxProfile.id))))
  );
  const isCandidateView = !isOwner;

  const [profile, setProfile] = useState<UserProfileResponse | null>(
    isOwner && ctxProfile ? ctxProfile : null
  );
  const [myApplications, setMyApplications] = useState<CandidateApplicationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(!isOwner || !ctxProfile);
  const [error, setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const handleSignOut = () => {
    try {
      localStorage.removeItem("squadup_theme_mode");
      localStorage.removeItem("squadup_active_palette");
    } catch {
      // ignore
    }
    signOut({ redirectUrl: "/" });
  };

  // Sync context profile if user view
  useEffect(() => {
    if (isOwner && ctxProfile) {
      setProfile(ctxProfile);
      setLoading(false);
    }
  }, [isOwner, ctxProfile]);

  // Edit Profile, Preferences & Collapsible States
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [editModalInitialView, setEditModalInitialView] = useState<"choose" | "manual" | "banner">("choose");
  const [isSkillsExpanded, setIsSkillsExpanded] = useState<boolean>(false);
  const [expandedExp, setExpandedExp] = useState<Record<number, boolean>>({});
  const [expandedAchievements, setExpandedAchievements] = useState<Record<number, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const [bannerConfig, setBannerConfig] = useState<BannerConfig | null>(null);

  // Load custom banner preference from profile object, database preferences, or local storage
  useEffect(() => {
    if (profile?.bannerConfig) {
      setBannerConfig(profile.bannerConfig);
      if (profile.bannerConfig.syncTheme) {
        const activeColor =
          profile.bannerConfig.type === "gradient" && profile.bannerConfig.gradient
            ? profile.bannerConfig.gradient.color2 || profile.bannerConfig.gradient.color1
            : "#ec4899";
        updateToken("primaryAction", activeColor);
      }
    } else if (profile?.userId) {
      // 1. Instant optimistic load from localStorage
      try {
        const saved = localStorage.getItem(`squadup_banner_${profile.userId}`);
        if (saved) {
          const parsed: BannerConfig = JSON.parse(saved);
          setBannerConfig(parsed);
          if (parsed.syncTheme) {
            const activeColor =
              parsed.type === "gradient" && parsed.gradient
                ? parsed.gradient.color2 || parsed.gradient.color1
                : "#ec4899";
            updateToken("primaryAction", activeColor);
          }
        }
      } catch (err) {
        console.warn("[Profile] Failed to load banner config from localStorage:", err);
      }

      // 2. Fetch latest preferences from PostgreSQL
      preferencesApi
        .getPreferences()
        .then((prefs) => {
          if (prefs?.bannerConfig) {
            setBannerConfig(prefs.bannerConfig);
            if (prefs.bannerConfig.syncTheme) {
              const activeColor =
                prefs.bannerConfig.type === "gradient" && prefs.bannerConfig.gradient
                  ? prefs.bannerConfig.gradient.color2 || prefs.bannerConfig.gradient.color1
                  : prefs.primaryColor || "#ec4899";
              updateToken("primaryAction", activeColor);
            }
          }
        })
        .catch((err) => {
          console.warn("[Profile] Failed to load preferences from API:", err);
        });
    }
  }, [profile?.userId, profile?.bannerConfig]);

  // Auto-refresh profile when background resume parsing completes
  const prevUploadingRef = useRef(isUploading);
  useEffect(() => {
    if ((prevUploadingRef.current && !isUploading && !jobId) || profileData) {
      if (isOwner) {
        refreshCtxProfile(true);
      }
    }
    prevUploadingRef.current = isUploading;
  }, [isUploading, jobId, profileData, isOwner, refreshCtxProfile]);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfileData() {
      setLoading(true);
      setError(null);

      if (urlId) {
        try {
          const fetchedProf = await profileApi.getPublicProfile(urlId);
          if (isMounted) {
            setProfile(fetchedProf);
          }
        } catch (err: any) {
          console.error("[Profile] Error fetching profile:", err);
          if (isMounted) setError(err.message || "Failed to load profile.");
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        if (ctxProfile) {
          setProfile(ctxProfile);
          setLoading(false);
        } else {
          try {
            const myProf = await profileApi.getProfile();
            if (isMounted) setProfile(myProf);
          } catch (err: any) {
            if (isMounted) setError(err.message || "Failed to load profile.");
          } finally {
            if (isMounted) setLoading(false);
          }
        }
      }

      // If viewing own profile, also load submitted applications
      if (isOwner) {
        try {
          const apps = await applicationsApi.getMyApplications();
          if (isMounted) setMyApplications(apps.applications || []);
        } catch {
          // unauthenticated or none
        }
      } else {
        if (isMounted) setMyApplications([]);
      }
    }

    fetchProfileData();
    return () => {
      isMounted = false;
    };
  }, [urlId, isOwner, ctxProfile]);

  if (loading && !profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-primary-action animate-spin" />
        <p className="text-sm font-semibold text-text-muted">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto my-20 bg-surface rounded-2xl border border-border-main p-8 text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-primary-action mx-auto" />
        <h2 className="text-xl font-bold text-text-main font-heading">
          {urlId ? "Profile Not Found" : "Authentication Required"}
        </h2>
        <p className="text-xs text-text-muted">
          {error || (urlId ? "Could not find a student profile with this ID." : "Sign in to view and manage your verified profile.")}
        </p>
        <div className="pt-2">
          <Link
            to="/teams"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-action hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Teams Directory
          </Link>
        </div>
      </div>
    );
  }

  const resumeUrl = isCandidateView && urlId
    ? `/api/resume/view/${urlId}`
    : `/api/resume/view`;

  const hasResume = Boolean(profile.lastResumeUploadedAt || profile.resumePdfUrl || (profile as any).hasResume);

  const displayName = profile.name || (isOwner ? user?.fullName : null) || "Student Builder";
  const displayTitle = profile.title || "Full Stack Engineer & Hackathon Builder";
  const displayUniversity = profile.university || "Collegiate Participant";
  const displaySummary =
    profile.summary ||
    (isOwner
      ? "Upload a resume to automatically extract your skills, project experiences, and background."
      : "Participant in collegiate hackathons and project sprints.");
  const displayEmail =
    profile.email ||
    (isOwner ? user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress : null) ||
    "";
  const displayAvatar =
    profile.profilePicture ||
    profile.avatarUrl ||
    profile.imageUrl ||
    (isOwner ? user?.imageUrl : null) ||
    null;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!displayEmail) return;

    const onCopySuccess = () => {
      setCopiedEmail(true);
      toast.success("Email copied to clipboard!", {
        autoClose: 2000,
        position: "bottom-right",
      });
      setTimeout(() => setCopiedEmail(false), 2000);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(displayEmail).then(onCopySuccess).catch(() => {
        fallbackCopy(displayEmail, onCopySuccess);
      });
    } else {
      fallbackCopy(displayEmail, onCopySuccess);
    }
  };

  const fallbackCopy = (text: string, onSuccess: () => void) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      onSuccess();
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const skillsList = profile.skills && profile.skills.length > 0 ? profile.skills : [];
  const educationList = profile.education || [];
  const experienceList = profile.experience || [];
  const achievementsList = profile.achievements || [];
  const projectsList = profile.projects || [];
  const userTeams = profile.teams || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Uploading Status Banner / Spinner */}
      {isUploading && (
        <div className="bg-gradient-to-r from-primary-light via-surface-dim to-primary-light border-2 border-primary-border p-5 rounded-2xl flex items-center gap-4 shadow-sm animate-pulse">
          <div className="relative shrink-0">
            <div className="w-10 h-10 border-3 border-primary-border border-t-primary-action rounded-full animate-spin" />
            <Sparkles className="w-4 h-4 text-primary-action absolute inset-0 m-auto" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-action text-white">
                AI Ingestion Active
              </span>
              <h3 className="text-sm font-bold text-text-main font-heading">
                Building Your Profile...
              </h3>
            </div>
            <p className="text-xs text-text-main/80">
              {status || "Extracting skills, projects, and work experience from your resume..."}
            </p>
            <p className="text-[11px] text-text-muted">
              Your profile will update automatically once parsing is complete.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT SIDE (5 COLS): IDENTITY & BIO ================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identity Card */}
          <div className="bg-surface rounded-2xl border border-border-main overflow-hidden shadow-xs">
            {/* Banner (Dynamic: custom gradient or image) */}
            <div
              style={
                bannerConfig?.type === "image" && bannerConfig.imageUrl
                  ? {
                      backgroundImage: `url(${bannerConfig.imageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : bannerConfig?.type === "gradient" && bannerConfig.gradient
                  ? {
                      background: `linear-gradient(${bannerConfig.gradient.angle}deg, ${bannerConfig.gradient.color1}, ${bannerConfig.gradient.color2})`,
                    }
                  : {
                      background: "linear-gradient(to right, #0f172a, #172554, #1e1b4b)",
                    }
              }
              className="h-32 w-full relative transition-all duration-300 overflow-hidden group"
            >
              {!isCandidateView && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalInitialView("banner");
                      setShowEditModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-xs"
                    title="Customize background banner"
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Banner</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-xs"
                    title="Sign out of SquadUp"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Avatar & Personal Info */}
            <div className="p-6 pt-0 space-y-4">
              {/* Avatar Hanging Over Banner - square with heavily rounded corners */}
              <div className="flex items-end justify-between -mt-12 mb-2 relative z-10">
                <div className="w-24 h-24 rounded-3xl border-4 border-surface shadow-md bg-surface overflow-hidden shrink-0">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayName}
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-primary-action to-cross-campus text-white flex items-center justify-center text-3xl font-black font-heading rounded-xl">
                      {displayName[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>

                <VerificationBadge
                  isVerified={profile.isVerifiedStudent}
                  reason={profile.verificationReason}
                  email={displayEmail}
                  university={profile.organizationName || displayUniversity}
                  domain={profile.organizationDomain}
                  className="mb-1"
                />
              </div>

              {/* Name & Headline */}
              <div>
                <h1 className="text-2xl font-black text-text-main font-heading">
                  {displayName}
                </h1>
                <p className="text-xs sm:text-sm text-text-muted font-medium mt-1 leading-snug">
                  {displayTitle}
                </p>
              </div>

              {/* Affiliation & Resume links */}
              <div className="space-y-1.5 text-xs text-text-muted pt-1 border-t border-border-main">
                <div className="flex items-center gap-1.5 text-text-main font-semibold">
                  <Building className="w-3.5 h-3.5 text-primary-action" />
                  <span>{displayUniversity}</span>
                </div>
                {educationList[0] && (
                  <div className="flex items-center gap-1.5 font-medium">
                    <GraduationCap className="w-3.5 h-3.5 text-primary-action" />
                    <span>{educationList[0].degree || educationList[0].college}</span>
                  </div>
                )}
                {displayEmail && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-main transition-colors group cursor-pointer text-left py-0.5 rounded"
                      title="Click to copy email address"
                    >
                      <Mail className="w-3.5 h-3.5 text-text-muted group-hover:text-primary-action transition-colors shrink-0" />
                      <span className="group-hover:underline">{displayEmail}</span>
                      {copiedEmail ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 animate-in fade-in duration-150">
                          <Check className="w-2.5 h-2.5 text-emerald-500" /> Copied!
                        </span>
                      ) : (
                        <Copy className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </button>
                  </div>
                )}

                {/* Social & Professional Links (GitHub & LinkedIn) */}
                {(profile.githubUrl || profile.linkedinUrl) && (
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    {profile.githubUrl && (
                      <a
                        href={formatGithubUrl(profile.githubUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-text-main cursor-pointer hover:text-primary-action transition-colors"
                        title="View GitHub Profile"
                      >
                        <GithubIcon className="w-3.5 h-3.5 text-text-main" />
                        <span>GitHub</span>
                      </a>
                    )}
                    {profile.linkedinUrl && (
                      <a
                        href={formatLinkedinUrl(profile.linkedinUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-[#0a66c2] cursor-pointer hover:underline"
                        title="View LinkedIn Profile"
                      >
                        <LinkedinIcon className="w-3.5 h-3.5 text-[#0a66c2]" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="pt-1">
                  {hasResume ? (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-action font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Resume PDF <ArrowUpRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-text-muted italic">No resume PDF uploaded yet</span>
                  )}
                </div>
              </div>

              {/* Action Buttons (Current User Only) */}
              {!isCandidateView && (
                <div className="space-y-2 pt-2 border-t border-border-main">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openUserProfile()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-text-main bg-surface-dim hover:bg-surface border border-border-main transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-text-muted" />
                      <span>Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditModalInitialView("choose");
                        setShowEditModal(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-primary-action hover:bg-primary-hover shadow-xs transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreferencesModal(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-text-main bg-surface hover:bg-surface-dim border border-border-main transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-primary-action" />
                      <span>Preferences & Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* About Section */}
              <div className="pt-4 border-t border-border-main space-y-1">
                <h3 className="text-xs font-black text-text-main uppercase tracking-wider">
                  About
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {displaySummary}
                </p>
              </div>
            </div>
          </div>

          {/* Education Card */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-text-main font-heading uppercase tracking-wider">
              Academic Background
            </h3>
            {educationList.length > 0 ? (
              <div className="space-y-3">
                {educationList.map((edu: any, i: number) => (
                  <div key={i} className="space-y-0.5">
                    <h4 className="text-sm font-bold text-text-main">{edu.college || displayUniversity}</h4>
                    <p className="text-xs text-text-muted font-medium">{edu.degree}</p>
                    {edu.year && <p className="text-[11px] text-text-muted font-medium">{edu.year}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-text-main">{displayUniversity}</h4>
                <p className="text-xs text-text-muted italic">Student Participant</p>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDE (7 COLS): SQUADS, SKILLS, EXP ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: "Teams / Squads" */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-text-main font-heading flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-action" /> {isCandidateView ? "Active Squads" : "My Squads"}
                </h2>
                <p className="text-xs text-text-muted">
                  {isCandidateView
                    ? "Teams this candidate is currently participating in or leading."
                    : "Teams you are participating in or have applied to join."}
                </p>
              </div>

              <Link
                to="/teams"
                className="text-xs font-bold text-primary-action hover:underline inline-flex items-center gap-1"
              >
                Explore More Squads <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Squads Container */}
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
              {/* 1. Confirmed Memberships */}
              {userTeams.map((squad) => (
                <div
                  key={squad.teamId}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    squad.role === "Leader"
                      ? "bg-primary-light/30 border-primary-border hover:border-primary-action/40"
                      : "bg-surface-dim border-border-main hover:border-primary-action/40 shadow-2xs"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {squad.role === "Leader" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary-action flex items-center gap-1">
                            <Crown className="w-3 h-3 text-primary-action" /> Squad Leader
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border-main">
                            Member
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-text-main font-heading">
                        {squad.teamName}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Joined {new Date(squad.joinedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-text-main block">
                        Role: {squad.role}
                      </span>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-main text-xs">
                    <span className="text-text-muted font-medium">
                      Status: <strong className="text-text-main">Active Member</strong>
                    </span>

                    <Link
                      to={`/team/${squad.teamId}`}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-colors shadow-2xs cursor-pointer ${
                        squad.role === "Leader"
                          ? "text-white bg-primary-action hover:bg-primary-hover"
                          : "text-text-main bg-surface hover:bg-surface-dim border border-border-main"
                      }`}
                    >
                      <span>{squad.role === "Leader" ? "Manage Team" : "View Team"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}

              {/* 2. Submitted Applications (Pending candidate applications) */}
              {!isCandidateView &&
                myApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex flex-col justify-between gap-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" /> Application Pending
                          </span>
                          <span className="text-[11px] font-medium text-text-muted">• {app.eventTitle}</span>
                        </div>
                        <h3 className="text-base font-bold text-text-main font-heading">
                          {app.teamName}
                        </h3>
                        {app.message && (
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-1 italic">
                            "{app.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs">
                      <span className="text-amber-600 font-medium">Under review by squad leader</span>
                      <Link
                        to={`/team/${app.teamId}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-amber-600 bg-surface hover:bg-surface-dim border border-amber-500/20 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>View Squad</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}

              {userTeams.length === 0 && myApplications.length === 0 && (
                <div className="p-6 rounded-xl border border-dashed border-border-main text-center space-y-2">
                  <Users className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-text-muted">No active squads or pending applications</p>
                  <p className="text-[11px] text-text-muted">Join an existing squad for an upcoming hackathon or recruit teammates.</p>
                  <Link
                    to="/teams"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-action hover:underline pt-1"
                  >
                    Find Squads to Join →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Verified Skills (Collapsible) */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
            <button
              type="button"
              onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <h3 className="text-sm font-black text-text-main font-heading uppercase tracking-wider flex items-center gap-1.5 group-hover:text-primary-action transition-colors">
                <Sparkles className="w-4 h-4 text-primary-action" /> Skills
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-medium">
                  {skillsList.length} Skills
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                    isSkillsExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isSkillsExpanded && (
              <div className="animate-in fade-in duration-150">
                {skillsList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill: string, i: number) => (
                      <SkillTag key={i} skill={skill} isMatched={true} />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-dim border border-border-main text-center space-y-1">
                    <p className="text-xs text-text-muted font-medium">No verified skills detected yet</p>
                    <p className="text-[11px] text-text-muted">Upload your PDF resume or add skills manually to build your profile.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Experience (Collapsible Cards) */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-text-main font-heading uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-text-muted" /> Experience
              </h3>
              <span className="text-xs text-text-muted font-medium">
                {experienceList.length} Roles
              </span>
            </div>

            {experienceList.length > 0 ? (
              <div className="space-y-3">
                {experienceList.map((exp: any, i: number) => {
                  const isExpanded = Boolean(expandedExp[i]);
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-border-main hover:border-primary-action/40 bg-surface-dim overflow-hidden transition-all shadow-2xs"
                    >
                      {/* Card Header: visible by default (Title + Duration + Chevron) */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedExp((prev) => ({ ...prev, [i]: !prev[i] }))
                        }
                        className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-surface transition-colors"
                      >
                        <div className="space-y-0.5 truncate">
                          <h4 className="text-sm font-bold text-text-main truncate">
                            {exp.role} <span className="text-primary-action font-semibold">@ {exp.company}</span>
                          </h4>
                          <span className="text-xs text-text-muted font-medium block">
                            {exp.duration}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-border-main space-y-2.5 bg-surface-dim animate-in fade-in duration-150">
                          {exp.bullet_points && exp.bullet_points.length > 0 && (
                            <ul className="space-y-1 text-xs text-text-muted list-disc list-inside">
                              {exp.bullet_points.map((bp: string, j: number) => (
                                <li key={j} className="leading-relaxed">
                                  {bp}
                                </li>
                              ))}
                            </ul>
                          )}
                          {exp.technologies && exp.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {exp.technologies.map((tech: string, k: number) => (
                                <span
                                  key={k}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text-muted border border-border-main"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">No formal engineering experience listed yet.</p>
            )}
          </div>

          {/* Section: Achievements & Hackathons (Collapsible Cards) */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-text-main font-heading uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Achievements & Hackathons
              </h3>
              <span className="text-xs text-text-muted font-medium">
                {achievementsList.length} Honors
              </span>
            </div>

            {achievementsList.length > 0 ? (
              <div className="space-y-3">
                {achievementsList.map((ach: any, i: number) => {
                  const isExpanded = Boolean(expandedAchievements[i]);
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-border-main hover:border-primary-action/40 bg-surface-dim overflow-hidden transition-all shadow-2xs"
                    >
                      {/* Card Header: visible by default */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAchievements((prev) => ({ ...prev, [i]: !prev[i] }))
                        }
                        className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-surface transition-colors"
                      >
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-2">
                            {ach.award_tier && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                                <Trophy className="w-2.5 h-2.5 text-amber-500" />
                                {ach.award_tier}
                              </span>
                            )}
                            <h4 className="text-sm font-bold text-text-main truncate">
                              {ach.title}
                            </h4>
                          </div>
                          <p className="text-xs text-text-muted font-medium">
                            {ach.organization} {ach.year && `• ${ach.year}`}
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-border-main space-y-2.5 bg-surface-dim animate-in fade-in duration-150">
                          {ach.description && (
                            <p className="text-xs text-text-muted leading-relaxed">
                              {ach.description}
                            </p>
                          )}
                          {ach.technologies && ach.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {ach.technologies.map((tech: string, k: number) => (
                                <span
                                  key={k}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text-muted border border-border-main"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">No hackathons or honors listed yet.</p>
            )}
          </div>

          {/* Section 4: Projects (Collapsible Cards) */}
          <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-text-main font-heading uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-text-muted" /> Projects
              </h3>
              <span className="text-xs text-text-muted font-medium">
                {projectsList.length} Built
              </span>
            </div>

            {projectsList.length > 0 ? (
              <div className="space-y-3">
                {projectsList.map((proj: any, i: number) => {
                  const isExpanded = Boolean(expandedProjects[i]);
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-border-main hover:border-primary-action/40 bg-surface-dim overflow-hidden transition-all shadow-2xs"
                    >
                      {/* Card Header: visible by default (Title + Subheading + Chevron) */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedProjects((prev) => ({ ...prev, [i]: !prev[i] }))
                        }
                        className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-surface transition-colors"
                      >
                        <div className="space-y-0.5 truncate">
                          <h4 className="text-sm font-bold text-text-main truncate">
                            {proj.name}
                          </h4>
                          {proj.description && (
                            <p className="text-xs text-text-muted truncate">
                              {proj.description}
                            </p>
                          )}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-border-main space-y-2.5 bg-surface-dim animate-in fade-in duration-150">
                          {proj.description && (
                            <p className="text-xs text-text-muted leading-relaxed">
                              {proj.description}
                            </p>
                          )}
                          {proj.bullet_points && proj.bullet_points.length > 0 && (
                            <ul className="space-y-1 text-xs text-text-muted list-disc list-inside">
                              {proj.bullet_points.map((bp: string, j: number) => (
                                <li key={j} className="leading-relaxed">
                                  {bp}
                                </li>
                              ))}
                            </ul>
                          )}
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {proj.technologies.map((tech: string, k: number) => (
                                <span
                                  key={k}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary-light text-primary-action border border-primary-border"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">No public technical projects listed yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {!isCandidateView && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          initialView={editModalInitialView}
          profile={profile}
          onProfileUpdated={(updatedProfile) => {
            updateCachedProfile(updatedProfile);
            setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : updatedProfile));
          }}
          currentBanner={bannerConfig || undefined}
          onBannerUpdated={(newBanner) => {
            setBannerConfig(newBanner);
          }}
        />
      )}

      {/* User Preferences Modal */}
      {!isCandidateView && (
        <UserPreferencesModal
          isOpen={showPreferencesModal}
          onClose={() => setShowPreferencesModal(false)}
          onPreferencesUpdated={(updatedPrefs) => {
            if (updatedPrefs.bannerConfig) {
              setBannerConfig(updatedPrefs.bannerConfig);
            }
          }}
        />
      )}

      {/* Sign Out Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl border border-border-main shadow-2xl p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-text-main font-heading">
                  Confirm Sign Out
                </h3>
                <p className="text-xs text-text-muted">
                  Are you sure you want to log out?
                </p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              You will need to sign back in with your university or Clerk account to manage your squads and applications.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-main">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:bg-surface-dim hover:text-text-main transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

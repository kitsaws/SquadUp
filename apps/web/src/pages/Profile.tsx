import React, { useState, useEffect, useRef } from "react";
import { useJobContext } from "../contexts/JobContext";
import { useUser, useClerk } from "@clerk/react";
import { Link, useParams } from "react-router-dom";
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { EditProfileModal, BannerConfig } from "../components/EditProfileModal";
import { UserPreferencesModal } from "../components/UserPreferencesModal";
import { usePalette } from "../contexts/PaletteContext";
import { useUserContext } from "../contexts/UserContext";
import {
  profileApi,
  applicationsApi,
  UserProfileResponse,
  CandidateApplicationItem,
} from "../services/api";
import {
  ProfileHeader,
  ProfileSquads,
  ProfileSkills,
  ProfileExperience,
  ProfileAchievements,
  ProfileProjects,
  SignOutConfirmModal,
} from "../components/profile";

export function Profile() {
  const params = useParams<{ id?: string; candidateId?: string }>();
  const urlId = params.id || params.candidateId;
  const { jobId, isUploading, status } = useJobContext();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { updateToken } = usePalette();
  const {
    profile: ctxProfile,
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

  // Load custom banner preference from profile object or local storage
  const profileBanner = profile?.bannerConfig;
  const bannerJson = JSON.stringify(profileBanner);
  const profileUserId = profile?.userId || profile?.id;

  useEffect(() => {
    if (!profile) {
      setBannerConfig(null);
      return;
    }

    if (isOwner) {
      const userStorageKey = profileUserId || user?.id;
      if (profileBanner) {
        setBannerConfig(profileBanner);
        if (userStorageKey) {
          try {
            localStorage.setItem(`squadup_banner_${userStorageKey}`, bannerJson);
          } catch {
            // ignore
          }
        }
        if (profileBanner.syncTheme) {
          const activeColor =
            profileBanner.type === "gradient" && profileBanner.gradient
              ? profileBanner.gradient.color2 || profileBanner.gradient.color1
              : "#ec4899";
          updateToken("primaryAction", activeColor);
        }
      } else if (userStorageKey) {
        try {
          const saved = localStorage.getItem(`squadup_banner_${userStorageKey}`);
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
          } else {
            setBannerConfig(null);
          }
        } catch (err) {
          console.warn("[Profile] Failed to load banner config from localStorage:", err);
          setBannerConfig(null);
        }
      } else {
        setBannerConfig(null);
      }
    } else {
      setBannerConfig(profileBanner || null);
    }
  }, [bannerJson, profileUserId, isOwner, user?.id, updateToken]);

  // Auto-refresh profile only once when background resume parsing completes
  const prevUploadingRef = useRef(isUploading);
  useEffect(() => {
    if (prevUploadingRef.current && !isUploading && !jobId) {
      if (isOwner) {
        refreshCtxProfile(true);
      }
    }
    prevUploadingRef.current = isUploading;
  }, [isUploading, jobId, isOwner, refreshCtxProfile]);

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
        {/* LEFT SIDE (5 COLS): IDENTITY & BIO */}
        <div className="lg:col-span-5 space-y-6">
          <ProfileHeader
            profile={profile}
            bannerConfig={bannerConfig}
            isOwner={isOwner}
            isCandidateView={isCandidateView}
            displayName={displayName}
            displayTitle={displayTitle}
            displayUniversity={displayUniversity}
            displaySummary={displaySummary}
            displayEmail={displayEmail}
            displayAvatar={displayAvatar}
            resumeUrl={resumeUrl}
            hasResume={hasResume}
            educationList={educationList}
            onOpenBannerEdit={() => {
              setEditModalInitialView("banner");
              setShowEditModal(true);
            }}
            onOpenEditModal={() => {
              setEditModalInitialView("choose");
              setShowEditModal(true);
            }}
            onOpenPreferencesModal={() => setShowPreferencesModal(true)}
            onOpenLogoutConfirm={() => setShowLogoutConfirm(true)}
            onOpenAccountSettings={() => openUserProfile()}
          />
        </div>

        {/* RIGHT SIDE (7 COLS): SQUADS, SKILLS, EXP */}
        <div className="lg:col-span-7 space-y-6">
          <ProfileSquads
            userTeams={userTeams}
            myApplications={myApplications}
            isOwner={isOwner}
            isCandidateView={isCandidateView}
            ctxProfile={ctxProfile}
          />

          <ProfileSkills
            skillsList={skillsList}
            isSkillsExpanded={isSkillsExpanded}
            setIsSkillsExpanded={setIsSkillsExpanded}
          />

          <ProfileExperience
            experienceList={experienceList}
            expandedExp={expandedExp}
            setExpandedExp={setExpandedExp}
          />

          <ProfileAchievements
            achievementsList={achievementsList}
            expandedAchievements={expandedAchievements}
            setExpandedAchievements={setExpandedAchievements}
          />

          <ProfileProjects
            projectsList={projectsList}
            expandedProjects={expandedProjects}
            setExpandedProjects={setExpandedProjects}
          />
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
            updateCachedProfile({ bannerConfig: newBanner });
            setProfile((prev) => (prev ? { ...prev, bannerConfig: newBanner } : prev));
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
              updateCachedProfile({ bannerConfig: updatedPrefs.bannerConfig });
              setProfile((prev) => (prev ? { ...prev, bannerConfig: updatedPrefs.bannerConfig } : prev));
            }
          }}
        />
      )}

      {/* Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleSignOut}
      />
    </div>
  );
}
export default Profile;

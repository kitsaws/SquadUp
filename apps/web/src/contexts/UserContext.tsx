import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/react";
import { profileApi, UserProfileResponse, setAuthTokenGetter } from "../services/api";
import { CacheService } from "../services/cache.service";

export interface UserContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  isUserReady: boolean;
  user: ReturnType<typeof useUser>["user"] | null;
  profile: UserProfileResponse | null;
  email: string | null;
  isLoadingProfile: boolean;
  hasInitialProfileLoaded: boolean;
  profileError: string | null;
  refreshProfile: (bypassCache?: boolean) => Promise<void>;
  updateCachedProfile: (partial: Partial<UserProfileResponse>) => void;
  userVerifiedSkills: string[];
  userUniversity: string | null;
  hasResume: boolean;
  isOnboardingComplete: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  
  // Try synchronous cache read on initial render
  const userId = user?.id;
  const initialCache = userId ? CacheService.get<UserProfileResponse>(`sq:profile:${userId}`, "local") : null;

  const [profile, setProfile] = useState<UserProfileResponse | null>(initialCache ? initialCache.data : null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(!initialCache);
  const [hasInitialProfileLoaded, setHasInitialProfileLoaded] = useState<boolean>(Boolean(initialCache));
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync token getter with api service
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  const updateCachedProfile = useCallback((partial: Partial<UserProfileResponse>) => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      if (userId) {
        CacheService.set(`sq:profile:${userId}`, updated, 1000 * 60 * 30, "local");
      }
      return updated;
    });
  }, [userId]);

  const refreshProfile = useCallback(async (bypassCache = false) => {
    if (!isSignedIn || !user?.id) {
      setProfile(null);
      setProfileError(null);
      setIsLoadingProfile(false);
      setHasInitialProfileLoaded(true);
      return;
    }

    setProfileError(null);
    setIsLoadingProfile(true);

    try {
      const data = await profileApi.getProfile({
        userId: user.id,
        bypassCache,
        onBackgroundUpdate: (fresh) => {
          setProfile(fresh);
        },
      });
      setProfile(data);
    } catch (err: any) {
      console.warn("[UserContext] Could not load profile:", err);
      setProfileError(err?.message || "Failed to load profile");
    } finally {
      setIsLoadingProfile(false);
      setHasInitialProfileLoaded(true);
    }
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      // If we don't have profile in memory yet, check cache synchronously for this user ID
      const cached = CacheService.get<UserProfileResponse>(`sq:profile:${user.id}`, "local");
      if (cached) {
        setProfile(cached.data);
        setHasInitialProfileLoaded(true);
        setIsLoadingProfile(false);
      }
      refreshProfile();
    } else if (isLoaded && !isSignedIn) {
      setProfile(null);
      setIsLoadingProfile(false);
      setHasInitialProfileLoaded(true);
      CacheService.clearAll();
      try {
        localStorage.removeItem("squadup_theme_mode");
        localStorage.removeItem("squadup_active_palette");
      } catch {
        // ignore
      }
    }
  }, [isSignedIn, isLoaded, user?.id]);

  const userVerifiedSkills = profile?.skills || [];
  const userUniversity = profile?.university || null;
  const hasResume = Boolean(profile?.lastResumeUploadedAt || profile?.resumePdfUrl || (profile as any)?.hasResume);

  const hasLocalFlag = user?.id ? localStorage.getItem(`squadup_onboarding_done_${user.id}`) === "true" : false;
  const hasUniversity = Boolean(profile?.university || profile?.organizationName);
  const hasSkills = Boolean(profile?.skills && profile.skills.length > 0);
  const hasTitle = Boolean(profile?.title);
  const hasEducation = Boolean(profile?.education && (profile.education as any).length > 0);
  const hasExperience = Boolean(profile?.experience && (profile.experience as any).length > 0);
  const hasProjects = Boolean(profile?.projects && (profile.projects as any).length > 0);
  const hasAchievements = Boolean(profile?.achievements && (profile.achievements as any).length > 0);

  const isOnboardingComplete =
    hasLocalFlag ||
    hasUniversity ||
    hasSkills ||
    hasTitle ||
    hasResume ||
    hasEducation ||
    hasExperience ||
    hasProjects ||
    hasAchievements;

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    profile?.email ||
    null;

  // User state is ready when auth is loaded AND either user is not signed in OR initial profile is loaded / present
  const isUserReady = isLoaded && (!isSignedIn || hasInitialProfileLoaded || Boolean(profile));

  return (
    <UserContext.Provider
      value={{
        isSignedIn: Boolean(isSignedIn),
        isLoaded,
        isUserReady,
        user: user || null,
        profile,
        email,
        isLoadingProfile,
        hasInitialProfileLoaded,
        profileError,
        refreshProfile,
        updateCachedProfile,
        userVerifiedSkills,
        userUniversity,
        hasResume,
        isOnboardingComplete,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
